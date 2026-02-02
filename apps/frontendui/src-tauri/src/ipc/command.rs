use tauri::{command, State};
use crate::state::AppState;
use crate::adapters::postgres::{
    ConnectionConfig, ConnectionTestResult, ConnectionInfo, 
    TableInfo, QueryResult, DatabaseInfo, create_pool, 
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
