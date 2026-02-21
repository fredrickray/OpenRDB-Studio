use tauri::{command, State};
use crate::state::AppState;
use crate::adapters::postgres::{
    ConnectionConfig, ConnectionTestResult, ConnectionInfo, 
    TableInfo, QueryResult, DatabaseInfo, ColumnInfo, create_pool, 
    list_tables as db_list_tables, execute_query as db_execute_query
};
use sqlx::Row;

/// Test a PostgreSQL connection without storing it
#[command]
pub async fn test_connection(config: ConnectionConfig) -> Result<ConnectionTestResult, String> {
    let connection_string = config.to_connection_string();
    let expected_db = config.database.clone();
    
    match create_pool(&connection_string).await {
        Ok(pool) => {
            // Verify we can query and that we're connected to the expected database
            // This ensures the database exists and we have access
            match sqlx::query("SELECT current_database(), version()")
                .fetch_one(&pool)
                .await {
                Ok(row) => {
                    let current_db: String = row.try_get(0).unwrap_or_default();
                    let version: Option<String> = row.try_get(1).ok();
                    
                    // Verify we're connected to the expected database
                    if current_db.to_lowercase() != expected_db.to_lowercase() {
                        return Ok(ConnectionTestResult {
                            success: false,
                            message: format!("Connected to '{}' but expected '{}'", current_db, expected_db),
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

/// List all available databases (connects to postgres database)
#[command]
pub async fn list_databases(config: ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    // Connect to 'postgres' database to list all databases
    let mut config_for_listing = config.clone();
    config_for_listing.database = "postgres".to_string();
    
    let connection_string = config_for_listing.to_connection_string();
    let pool = create_pool(&connection_string).await?;
    
    let rows = sqlx::query(
        r#"
        SELECT 
            datname as name,
            pg_size_pretty(pg_database_size(datname)) as size,
            pg_catalog.pg_get_userbyid(datdba) as owner
        FROM pg_database
        WHERE datistemplate = false
        ORDER BY datname
        "#
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

/// Establish a connection and store it in app state
#[command]
pub async fn connect(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<ConnectionInfo, String> {
    let connection_string = config.to_connection_string();
    let pool = create_pool(&connection_string).await?;
    
    // Verify connection works by running a simple query
    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to verify connection: {}", e))?;
    
    let id = state.add_connection(pool, &config);
    
    let info = state.connection_info
        .read()
        .unwrap()
        .get(&id)
        .cloned()
        .ok_or("Failed to retrieve connection info")?;
    
    Ok(info)
}

/// Disconnect and remove a connection
#[command]
pub async fn disconnect(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    Ok(state.remove_connection(&connection_id))
}

/// List all active connections
#[command]
pub async fn list_connections(state: State<'_, AppState>) -> Result<Vec<ConnectionInfo>, String> {
    Ok(state.list_connections())
}

/// List tables for a connection
#[command]
pub async fn list_tables(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TableInfo>, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
    db_list_tables(&pool).await
}

/// Execute a SQL query
#[command]
pub async fn execute_query(
    connection_id: String,
    sql: String,
    state: State<'_, AppState>,
) -> Result<QueryResult, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
    db_execute_query(&pool, &sql).await
}

/// Simple ping command for testing
#[command]
pub fn ping() -> String {
    "pong".to_string()
}

/// List columns for a specific table
#[command]
pub async fn list_columns(
    connection_id: String,
    schema: String,
    table: String,
    state: State<'_, AppState>,
) -> Result<Vec<ColumnInfo>, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
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
        "#
    )
    .bind(&schema)
    .bind(&table)
    .fetch_all(&pool)
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

/// Paginated table data response
#[derive(serde::Serialize)]
pub struct TableDataResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub total_rows: i64,
    pub page: i32,
    pub limit: i32,
}

/// Get paginated table data
#[command]
pub async fn get_table_data(
    connection_id: String,
    schema: String,
    table: String,
    page: i32,
    limit: i32,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    state: State<'_, AppState>,
) -> Result<TableDataResult, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
    let offset = (page - 1) * limit;
    
    // Get total row count
    let count_query = format!(
        "SELECT COUNT(*) as count FROM \"{}\".\"{}\""
,
        schema.replace('"', "\"\""),
        table.replace('"', "\"\"")
    );
    let count_row: (i64,) = sqlx::query_as(&count_query)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to get row count: {}", e))?;
    let total_rows = count_row.0;
    
    // Get column names
    let columns_query = format!(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = '{}' AND table_name = '{}' ORDER BY ordinal_position",
        schema.replace('\'', "''"),
        table.replace('\'', "''")
    );
    let column_rows = sqlx::query(&columns_query)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to get columns: {}", e))?;
    
    let columns: Vec<String> = column_rows
        .iter()
        .map(|r| r.try_get::<String, _>("column_name").unwrap_or_default())
        .collect();
    
    // Build column list with CAST to text for each column
    let column_casts: Vec<String> = columns
        .iter()
        .map(|c| format!("\"{}\"::text", c.replace('"', "\"\"")))
        .collect();
    
    // Build ORDER BY clause if sorting is requested
    let order_by = if let Some(ref col) = sort_column {
        // Validate column exists to prevent SQL injection
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
    
    // Get actual data - cast all columns to text to avoid type issues
    let data_query = format!(
        "SELECT {} FROM \"{}\".\"{}\"{}  LIMIT {} OFFSET {}",
        column_casts.join(", "),
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        order_by,
        limit,
        offset
    );
    
    let data_rows = sqlx::query(&data_query)
        .fetch_all(&pool)
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

/// Update a single cell in a table
#[command]
pub async fn update_row(
    connection_id: String,
    schema: String,
    table: String,
    pk_column: String,
    pk_value: String,
    column: String,
    new_value: Option<String>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
    // Build parameterized UPDATE query
    let query = format!(
        "UPDATE \"{}\".\"{}\" SET \"{}\" = $1 WHERE \"{}\" = $2",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        column.replace('"', "\"\""),
        pk_column.replace('"', "\"\"")
    );
    
    sqlx::query(&query)
        .bind(&new_value)
        .bind(&pk_value)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update row: {}", e))?;
    
    Ok(true)
}

/// Insert a new row into a table
#[command]
pub async fn insert_row(
    connection_id: String,
    schema: String,
    table: String,
    columns: Vec<String>,
    values: Vec<Option<String>>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
    if columns.is_empty() || columns.len() != values.len() {
        return Err("Columns and values must be non-empty and have equal length".to_string());
    }
    
    // Build column list
    let col_list: Vec<String> = columns
        .iter()
        .map(|c| format!("\"{}\"", c.replace('"', "\"\"")))
        .collect();
    
    // Build placeholder list ($1, $2, etc)
    let placeholders: Vec<String> = (1..=values.len())
        .map(|i| format!("${}", i))
        .collect();
    
    let query = format!(
        "INSERT INTO \"{}\".\"{}\" ({}) VALUES ({})",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        col_list.join(", "),
        placeholders.join(", ")
    );
    
    let mut query_builder = sqlx::query(&query);
    for value in &values {
        query_builder = query_builder.bind(value);
    }
    
    query_builder
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to insert row: {}", e))?;
    
    Ok(true)
}

/// Delete rows from a table by primary key values
#[command]
pub async fn delete_rows(
    connection_id: String,
    schema: String,
    table: String,
    pk_column: String,
    pk_values: Vec<String>,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    let pool = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;
    
    if pk_values.is_empty() {
        return Err("No rows specified for deletion".to_string());
    }
    
    // Build placeholder list ($1, $2, etc)
    let placeholders: Vec<String> = (1..=pk_values.len())
        .map(|i| format!("${}", i))
        .collect();
    
    let query = format!(
        "DELETE FROM \"{}\".\"{}\" WHERE \"{}\" IN ({})",
        schema.replace('"', "\"\""),
        table.replace('"', "\"\""),
        pk_column.replace('"', "\"\""),
        placeholders.join(", ")
    );
    
    let mut query_builder = sqlx::query(&query);
    for pk in &pk_values {
        query_builder = query_builder.bind(pk);
    }
    
    let result = query_builder
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete rows: {}", e))?;
    
    Ok(result.rows_affected() as i32)
}
