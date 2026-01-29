use tauri::{command, State};
use crate::state::AppState;
use crate::adapters::postgres::{
    ConnectionConfig, ConnectionTestResult, ConnectionInfo, 
    TableInfo, QueryResult, create_pool, 
    list_tables as db_list_tables, execute_query as db_execute_query
};
use sqlx::Row;

/// Test a PostgreSQL connection without storing it
#[command]
pub async fn test_connection(config: ConnectionConfig) -> Result<ConnectionTestResult, String> {
    let connection_string = config.to_connection_string();
    
    match create_pool(&connection_string).await {
        Ok(pool) => {
            // Get server version
            let version: Option<String> = sqlx::query("SELECT version()")
                .fetch_one(&pool)
                .await
                .ok()
                .and_then(|row| row.try_get(0).ok());
            
            Ok(ConnectionTestResult {
                success: true,
                message: "Connection successful".to_string(),
                server_version: version,
            })
        }
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: e,
            server_version: None,
        }),
    }
}

/// Establish a connection and store it in app state
#[command]
pub async fn connect(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<ConnectionInfo, String> {
    let connection_string = config.to_connection_string();
    let pool = create_pool(&connection_string).await?;
    
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
