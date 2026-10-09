use sqlx::Row;

use crate::adapters::models::{
    ColumnInfo, ConnectionConfig, ConnectionTestResult, DatabaseInfo, ForeignKeyInfo, TableDataResult,
};
use crate::adapters::postgres::connection::{connection_string, create_pool, PgPool, MAINTENANCE_DATABASE};

pub async fn test_connection(config: &ConnectionConfig) -> Result<ConnectionTestResult, String> {
    let connection_string = connection_string(config);
    let expected_db = config.database.clone();

    match create_pool(&connection_string).await {
        Ok(pool) => {
            // Verify we can query and that we're connected to the expected database.
            // This ensures the database exists and we have access.
            match sqlx::query("SELECT current_database(), version()")
                .fetch_one(&pool)
                .await
            {
                Ok(row) => {
                    let current_db: String = row.try_get(0).unwrap_or_default();
                    let version: Option<String> = row.try_get(1).ok();

                    if current_db.to_lowercase() != expected_db.to_lowercase() {
                        return Ok(ConnectionTestResult {
                            success: false,
                            message: format!(
                                "Connected to '{}' but expected '{}'",
                                current_db, expected_db
                            ),
                            server_version: version,
                        });
                    }

                    Ok(ConnectionTestResult {
                        success: true,
                        message: format!("Connection to '{}' successful", current_db),
                        server_version: version,
                    })
                }
                Err(e) => Ok(ConnectionTestResult {
                    success: false,
                    message: format!("Database query failed: {}", e),
                    server_version: None,
                }),
            }
        }
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

    let pool = create_pool(&connection_string(&config_for_listing)).await?;

    let rows = sqlx::query(
        r#"
        SELECT
            datname as name,
            pg_size_pretty(pg_database_size(datname)) as size,
            pg_catalog.pg_get_userbyid(datdba) as owner
        FROM pg_database
        WHERE datistemplate = false
        ORDER BY datname
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to list databases: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| DatabaseInfo {
            name: row.try_get("name").unwrap_or_default(),
            size: row.try_get("size").ok(),
            owner: row.try_get("owner").ok(),
        })
        .collect())
}

pub async fn create_database(config: &ConnectionConfig, name: &str) -> Result<bool, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Database name is required".to_string());
    }
    // Basic identifier validation — quoted identifiers allow most chars but block injection
    if trimmed.contains('"') || trimmed.contains('\0') || trimmed.contains(';') {
        return Err("Database name contains invalid characters".to_string());
    }

    let mut config_for_create = config.clone();
    config_for_create.database = MAINTENANCE_DATABASE.to_string();

    let pool = create_pool(&connection_string(&config_for_create)).await?;

    let query = format!("CREATE DATABASE \"{}\"", trimmed.replace('"', "\"\""));
    sqlx::query(&query)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to create database: {}", e))?;

    Ok(true)
}

/// Open a pool and verify it with `SELECT 1` before it is stored.
pub async fn connect(config: &ConnectionConfig) -> Result<PgPool, String> {
    let pool = create_pool(&connection_string(config)).await?;

    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to verify connection: {}", e))?;

    Ok(pool)
}

pub async fn list_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
) -> Result<Vec<ColumnInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
            CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
            WHERE tc.table_schema = $1
                AND tc.table_name = $2
                AND tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name
        LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
            WHERE tc.table_schema = $1
                AND tc.table_name = $2
                AND tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.column_name = fk.column_name
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position
        "#,
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to list columns: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|r| {
            let is_nullable: Option<String> = r.try_get("is_nullable").ok();
            ColumnInfo {
                name: r.try_get("column_name").ok(),
                data_type: r.try_get("data_type").ok(),
                is_nullable: is_nullable.as_deref() == Some("YES"),
                default_value: r.try_get("column_default").ok(),
                is_primary_key: r.try_get("is_primary_key").unwrap_or(false),
                is_foreign_key: r.try_get("is_foreign_key").unwrap_or(false),
            }
        })
        .collect())
}

pub async fn get_table_data(
    pool: &PgPool,
    schema: &str,
    table: &str,
    page: i32,
    limit: i32,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    filter: Option<String>,
) -> Result<TableDataResult, String> {
    let offset = (page - 1) * limit;

    // Optional WHERE clause from the UI filter box (trusted local DB client).
    // Reject multi-statement / dangerous fragments.
    let where_clause = if let Some(ref raw) = filter {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            String::new()
        } else if trimmed.contains(';') || trimmed.contains("--") || trimmed.contains("/*") {
            return Err("Filter cannot contain comments or multiple statements".to_string());
        } else {
            // Allow "col = 1" or a full "WHERE col = 1"
            let body = if trimmed.to_lowercase().starts_with("where ") {
                trimmed[6..].trim()
            } else {
                trimmed
            };
            format!(" WHERE ({})", body)
        }
    } else {
        String::new()
    };

    let count_query = format!(
        "SELECT COUNT(*) as count FROM \"{}\".\"{}\"{}",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        where_clause
    );
    let count_row: (i64,) = sqlx::query_as(&count_query)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get row count: {}", e))?;
    let total_rows = count_row.0;

    let columns_query = format!(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = '{}' AND table_name = '{}' ORDER BY ordinal_position",
        schema.replace('\'', "''"),
        table.replace('\'', "''")
    );
    let column_rows = sqlx::query(&columns_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to get columns: {}", e))?;

    let columns: Vec<String> = column_rows
        .iter()
        .map(|r| r.try_get::<String, _>("column_name").unwrap_or_default())
        .collect();

    let column_casts: Vec<String> = columns
        .iter()
        .map(|c| format!("\"{}\"::text", c.replace('"', "\"\"")))
        .collect();

    let order_by = if let Some(ref col) = sort_column {
        if columns.contains(col) {
            let direction = match sort_direction.as_deref() {
                Some("desc") | Some("DESC") => "DESC",
                _ => "ASC",
            };
            format!(" ORDER BY \"{}\" {}", col.replace('"', "\"\""), direction)
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let data_query = format!(
        "SELECT {} FROM \"{}\".\"{}\"{}{} LIMIT {} OFFSET {}",
        column_casts.join(", "),
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
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
                .map(|i| row.try_get::<Option<String>, _>(i).ok().flatten())
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
    pool: &PgPool,
    schema: &str,
    table: &str,
    pk_column: &str,
    pk_value: &str,
    column: &str,
    new_value: Option<String>,
) -> Result<bool, String> {
    let type_query = format!(
        "SELECT data_type FROM information_schema.columns WHERE table_schema = '{}' AND table_name = '{}' AND column_name = '{}'",
        schema.replace('\'', "''"),
        table.replace('\'', "''"),
        column.replace('\'', "''")
    );
    let col_type: Option<String> = sqlx::query_scalar(&type_query)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to get column type: {}", e))?;

    let data_type = col_type.unwrap_or_else(|| "text".to_string());

    let set_clause = match new_value {
        Some(ref _val) => format!("\"{}\" = $1::{}", column.replace('"', "\"\""), data_type),
        None => format!("\"{}\" = NULL", column.replace('"', "\"\"")),
    };

    let query = format!(
        "UPDATE \"{}\".\"{}\" SET {} WHERE \"{}\"::text = ${}",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        set_clause,
        pk_column.replace('"', "\"\""),
        if new_value.is_some() { "2" } else { "1" }
    );

    let result = match new_value {
        Some(ref val) => {
            sqlx::query(&query)
                .bind(val)
                .bind(pk_value)
                .execute(pool)
                .await
        }
        None => sqlx::query(&query).bind(pk_value).execute(pool).await,
    };

    let affected = result.map_err(|e| format!("Failed to update row: {}", e))?;

    if affected.rows_affected() == 0 {
        return Err("No rows were updated. The row may have been deleted.".to_string());
    }

    Ok(true)
}

pub async fn insert_row(
    pool: &PgPool,
    schema: &str,
    table: &str,
    columns: &[String],
    values: &[Option<String>],
) -> Result<bool, String> {
    if columns.is_empty() || columns.len() != values.len() {
        return Err("Columns and values must be non-empty and have equal length".to_string());
    }

    let col_list: Vec<String> = columns
        .iter()
        .map(|c| format!("\"{}\"", c.replace('"', "\"\"")))
        .collect();

    let placeholders: Vec<String> = (1..=values.len()).map(|i| format!("${}", i)).collect();

    let query = format!(
        "INSERT INTO \"{}\".\"{}\" ({}) VALUES ({})",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        col_list.join(", "),
        placeholders.join(", ")
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
    pool: &PgPool,
    schema: &str,
    table: &str,
    pk_column: &str,
    pk_values: &[String],
) -> Result<i32, String> {
    if pk_values.is_empty() {
        return Err("No rows specified for deletion".to_string());
    }

    let placeholders: Vec<String> = (1..=pk_values.len()).map(|i| format!("${}", i)).collect();

    let query = format!(
        "DELETE FROM \"{}\".\"{}\" WHERE \"{}\"::text IN ({})",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        pk_column.replace('"', "\"\""),
        placeholders.join(", ")
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

pub async fn list_foreign_keys(pool: &PgPool) -> Result<Vec<ForeignKeyInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT
            tc.constraint_name,
            kcu.table_schema AS from_schema,
            kcu.table_name AS from_table,
            kcu.column_name AS from_column,
            ccu.table_schema AS to_schema,
            ccu.table_name AS to_table,
            ccu.column_name AS to_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
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
