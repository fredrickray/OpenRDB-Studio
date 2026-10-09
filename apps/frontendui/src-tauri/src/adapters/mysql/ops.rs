use sqlx::Row;

use crate::adapters::models::{
    ColumnInfo, ConnectionConfig, ConnectionTestResult, DatabaseInfo, ForeignKeyInfo, TableDataResult,
    TableInfo,
};
use crate::adapters::mysql::connection::{create_pool, MySqlPool, MAINTENANCE_DATABASE};

pub async fn test_connection(config: &ConnectionConfig) -> Result<ConnectionTestResult, String> {
    let expected_db = config.database.clone();

    match create_pool(config).await {
        Ok(pool) => match sqlx::query("SELECT DATABASE(), VERSION()")
            .fetch_one(&pool)
            .await
        {
            Ok(row) => {
                let current_db: Option<String> = row.try_get(0).ok().flatten();
                let version: Option<String> = row.try_get(1).ok();

                if expected_db.is_empty() {
                    return Ok(ConnectionTestResult {
                        success: true,
                        message: "Connection successful".to_string(),
                        server_version: version,
                    });
                }

                let current = current_db.unwrap_or_default();
                if current.to_lowercase() != expected_db.to_lowercase() {
                    return Ok(ConnectionTestResult {
                        success: false,
                        message: format!("Connected to '{}' but expected '{}'", current, expected_db),
                        server_version: version,
                    });
                }

                Ok(ConnectionTestResult {
                    success: true,
                    message: format!("Connection to '{}' successful", current),
                    server_version: version,
                })
            }
            Err(e) => Ok(ConnectionTestResult {
                success: false,
                message: format!("Database query failed: {}", e),
                server_version: None,
            }),
        },
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: e,
            server_version: None,
        }),
    }
}

pub async fn list_databases(config: &ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    let mut config_for_listing = config.clone();
    config_for_listing.database = MAINTENANCE_DATABASE.to_string();

    let pool = create_pool(&config_for_listing).await?;

    let rows = sqlx::query(
        r#"
        SELECT schema_name AS name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        ORDER BY schema_name
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to list databases: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| DatabaseInfo {
            name: row.try_get("name").unwrap_or_default(),
            size: None,
            owner: None,
        })
        .collect())
}

pub async fn create_database(config: &ConnectionConfig, name: &str) -> Result<bool, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Database name is required".to_string());
    }
    if trimmed.contains('`') || trimmed.contains('\0') || trimmed.contains(';') || trimmed.contains('\\')
    {
        return Err("Database name contains invalid characters".to_string());
    }

    let mut config_for_create = config.clone();
    config_for_create.database = MAINTENANCE_DATABASE.to_string();
    let pool = create_pool(&config_for_create).await?;

    let query = format!("CREATE DATABASE {}", quote_ident(trimmed));
    sqlx::query(&query)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to create database: {}", e))?;

    Ok(true)
}

pub async fn connect(config: &ConnectionConfig) -> Result<MySqlPool, String> {
    let pool = create_pool(config).await?;
    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to verify connection: {}", e))?;
    Ok(pool)
}

pub async fn list_tables(pool: &MySqlPool) -> Result<Vec<TableInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT table_schema AS table_schema, table_name AS table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema = DATABASE()
        ORDER BY table_schema, table_name
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|row| TableInfo {
            schema: row.try_get("table_schema").ok(),
            name: row.try_get("table_name").ok(),
        })
        .collect())
}

pub async fn list_columns(
    pool: &MySqlPool,
    schema: &str,
    table: &str,
) -> Result<Vec<ColumnInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT
            c.column_name AS column_name,
            c.data_type AS data_type,
            c.is_nullable AS is_nullable,
            c.column_default AS column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
            CASE WHEN fk.column_name IS NOT NULL THEN 1 ELSE 0 END AS is_foreign_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
                AND tc.table_schema = ku.table_schema
                AND tc.table_name = ku.table_name
            WHERE tc.table_schema = ?
                AND tc.table_name = ?
                AND tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name
        LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
                AND tc.table_schema = ku.table_schema
                AND tc.table_name = ku.table_name
            WHERE tc.table_schema = ?
                AND tc.table_name = ?
                AND tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.column_name = fk.column_name
        WHERE c.table_schema = ? AND c.table_name = ?
        ORDER BY c.ordinal_position
        "#,
    )
    .bind(schema)
    .bind(table)
    .bind(schema)
    .bind(table)
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to list columns: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let is_nullable: Option<String> = row.try_get("is_nullable").ok();
            ColumnInfo {
                name: row.try_get("column_name").ok(),
                data_type: row.try_get("data_type").ok(),
                is_nullable: is_nullable.as_deref() == Some("YES"),
                default_value: row.try_get("column_default").ok(),
                is_primary_key: flag(&row, "is_primary_key"),
                is_foreign_key: flag(&row, "is_foreign_key"),
            }
        })
        .collect())
}

pub async fn get_table_data(
    pool: &MySqlPool,
    schema: &str,
    table: &str,
    page: i32,
    limit: i32,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    filter: Option<String>,
) -> Result<TableDataResult, String> {
    let offset = (page - 1) * limit;
    let where_clause = filter_clause(filter)?;

    let count_query = format!(
        "SELECT COUNT(*) AS count FROM {}{}",
        quote_table(schema, table),
        where_clause
    );
    let total_rows = fetch_count(pool, &count_query).await?;

    let column_rows = sqlx::query(
        r#"
        SELECT column_name AS column_name
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
        "#,
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to get columns: {}", e))?;

    let columns: Vec<String> = column_rows
        .iter()
        .map(|row| row.try_get::<String, _>("column_name").unwrap_or_default())
        .collect();

    let column_casts: Vec<String> = columns
        .iter()
        .map(|column| format!("CAST({} AS CHAR)", quote_ident(column)))
        .collect();

    let order_by = if let Some(ref column) = sort_column {
        if columns.contains(column) {
            let direction = match sort_direction.as_deref() {
                Some("desc") | Some("DESC") => "DESC",
                _ => "ASC",
            };
            format!(" ORDER BY {} {}", quote_ident(column), direction)
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let select_list = if column_casts.is_empty() {
        "NULL".to_string()
    } else {
        column_casts.join(", ")
    };

    let data_query = format!(
        "SELECT {} FROM {}{}{} LIMIT {} OFFSET {}",
        select_list,
        quote_table(schema, table),
        where_clause,
        order_by,
        limit,
        offset
    );

    let data_rows = sqlx::query(&data_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch data: {}", e))?;

    let rows: Vec<Vec<Option<String>>> = data_rows
        .iter()
        .map(|row| {
            (0..columns.len())
                .map(|index| row.try_get::<Option<String>, _>(index).ok().flatten())
                .collect()
        })
        .collect();

    Ok(TableDataResult {
        columns,
        rows,
        total_rows,
        page,
        limit,
    })
}

pub async fn update_row(
    pool: &MySqlPool,
    schema: &str,
    table: &str,
    pk_column: &str,
    pk_value: &str,
    column: &str,
    new_value: Option<String>,
) -> Result<bool, String> {
    let set_clause = match new_value {
        Some(_) => format!("{} = ?", quote_ident(column)),
        None => format!("{} = NULL", quote_ident(column)),
    };
    let query = format!(
        "UPDATE {} SET {} WHERE CAST({} AS CHAR) = ?",
        quote_table(schema, table),
        set_clause,
        quote_ident(pk_column)
    );

    let result = match new_value {
        Some(ref value) => sqlx::query(&query).bind(value).bind(pk_value).execute(pool).await,
        None => sqlx::query(&query).bind(pk_value).execute(pool).await,
    };
    let affected = result.map_err(|e| format!("Failed to update row: {}", e))?;
    if affected.rows_affected() == 0 {
        return Err("No rows were updated. The row may have been deleted.".to_string());
    }
    Ok(true)
}

pub async fn insert_row(
    pool: &MySqlPool,
    schema: &str,
    table: &str,
    columns: &[String],
    values: &[Option<String>],
) -> Result<bool, String> {
    if columns.is_empty() || columns.len() != values.len() {
        return Err("Columns and values must be non-empty and have equal length".to_string());
    }

    let col_list: Vec<String> = columns.iter().map(|column| quote_ident(column)).collect();
    let placeholders = vec!["?"; values.len()].join(", ");
    let query = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        quote_table(schema, table),
        col_list.join(", "),
        placeholders
    );

    let mut query_builder = sqlx::query(&query);
    for value in values {
        query_builder = query_builder.bind(value);
    }
    query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert row: {}", e))?;
    Ok(true)
}

pub async fn delete_rows(
    pool: &MySqlPool,
    schema: &str,
    table: &str,
    pk_column: &str,
    pk_values: &[String],
) -> Result<i32, String> {
    if pk_values.is_empty() {
        return Err("No rows specified for deletion".to_string());
    }

    let placeholders = vec!["?"; pk_values.len()].join(", ");
    let query = format!(
        "DELETE FROM {} WHERE CAST({} AS CHAR) IN ({})",
        quote_table(schema, table),
        quote_ident(pk_column),
        placeholders
    );

    let mut query_builder = sqlx::query(&query);
    for pk in pk_values {
        query_builder = query_builder.bind(pk);
    }
    let result = query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete rows: {}", e))?;
    Ok(result.rows_affected() as i32)
}

pub async fn list_foreign_keys(pool: &MySqlPool) -> Result<Vec<ForeignKeyInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT
            kcu.constraint_name AS constraint_name,
            kcu.table_schema AS from_schema,
            kcu.table_name AS from_table,
            kcu.column_name AS from_column,
            kcu.referenced_table_schema AS to_schema,
            kcu.referenced_table_name AS to_table,
            kcu.referenced_column_name AS to_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            AND tc.table_name = kcu.table_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = DATABASE()
            AND kcu.referenced_table_name IS NOT NULL
        ORDER BY from_schema, from_table, from_column
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to list foreign keys: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| ForeignKeyInfo {
            constraint_name: row.try_get("constraint_name").unwrap_or_default(),
            from_schema: row.try_get("from_schema").unwrap_or_default(),
            from_table: row.try_get("from_table").unwrap_or_default(),
            from_column: row.try_get("from_column").unwrap_or_default(),
            to_schema: row.try_get("to_schema").unwrap_or_default(),
            to_table: row.try_get("to_table").unwrap_or_default(),
            to_column: row.try_get("to_column").unwrap_or_default(),
        })
        .collect())
}

fn quote_ident(name: &str) -> String {
    format!("`{}`", name.replace('`', "``"))
}

fn quote_table(schema: &str, table: &str) -> String {
    format!("{}.{}", quote_ident(schema), quote_ident(table))
}

fn filter_clause(filter: Option<String>) -> Result<String, String> {
    let Some(raw) = filter else {
        return Ok(String::new());
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(String::new());
    }
    if trimmed.contains(';') || trimmed.contains("--") || trimmed.contains("/*") {
        return Err("Filter cannot contain comments or multiple statements".to_string());
    }
    let body = if trimmed.to_lowercase().starts_with("where ") {
        trimmed[6..].trim()
    } else {
        trimmed
    };
    Ok(format!(" WHERE ({})", body))
}

fn flag(row: &sqlx::mysql::MySqlRow, name: &str) -> bool {
    if let Ok(value) = row.try_get::<i64, _>(name) {
        return value != 0;
    }
    if let Ok(value) = row.try_get::<i32, _>(name) {
        return value != 0;
    }
    if let Ok(value) = row.try_get::<i8, _>(name) {
        return value != 0;
    }
    if let Ok(value) = row.try_get::<u64, _>(name) {
        return value != 0;
    }
    row.try_get::<bool, _>(name).unwrap_or(false)
}

async fn fetch_count(pool: &MySqlPool, sql: &str) -> Result<i64, String> {
    let row = sqlx::query(sql)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get row count: {}", e))?;
    if let Ok(value) = row.try_get::<i64, _>(0) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i32, _>(0) {
        return Ok(i64::from(value));
    }
    if let Ok(value) = row.try_get::<u64, _>(0) {
        return Ok(value as i64);
    }
    Err("Failed to get row count".to_string())
}
