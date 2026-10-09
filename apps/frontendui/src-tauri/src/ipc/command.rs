use tauri::{command, AppHandle, Manager, State};
use crate::adapters::{
    connect_session, create_database as db_create_database, list_databases as db_list_databases,
    test_connection as db_test_connection, ColumnInfo, ConnectionConfig, ConnectionInfo,
    ConnectionTestResult, DatabaseInfo, ForeignKeyInfo, QueryResult, TableDataResult, TableInfo,
};
use crate::state::AppState;
use std::fs;
use std::path::PathBuf;

/// Test a connection without storing it. The adapter is chosen from `config.engine`.
#[command]
pub async fn test_connection(config: ConnectionConfig) -> Result<ConnectionTestResult, String> {
    db_test_connection(&config).await
}

/// List databases on the server. The adapter picks its own maintenance database.
#[command]
pub async fn list_databases(config: ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    db_list_databases(&config).await
}

/// Create a database on the server.
#[command]
pub async fn create_database(config: ConnectionConfig, name: String) -> Result<bool, String> {
    db_create_database(&config, &name).await
}

/// Establish a connection and store it in app state
#[command]
pub async fn connect(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<ConnectionInfo, String> {
    let session = connect_session(&config).await?;
    let id = state.add_connection(session, &config);

    let info = state
        .connection_info
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
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session.list_tables().await
}

/// Execute a SQL query
#[command]
pub async fn execute_query(
    connection_id: String,
    sql: String,
    state: State<'_, AppState>,
) -> Result<QueryResult, String> {
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session.execute_query(&sql).await
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
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session.list_columns(&schema, &table).await
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
    filter: Option<String>,
    state: State<'_, AppState>,
) -> Result<TableDataResult, String> {
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session
        .get_table_data(
            &schema,
            &table,
            page,
            limit,
            sort_column,
            sort_direction,
            filter,
        )
        .await
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
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session
        .update_row(
            &schema,
            &table,
            &pk_column,
            &pk_value,
            &column,
            new_value,
        )
        .await
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
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session
        .insert_row(&schema, &table, &columns, &values)
        .await
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
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session
        .delete_rows(&schema, &table, &pk_column, &pk_values)
        .await
}

/// Get the path to the saved connections JSON file
fn get_connections_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;

    Ok(data_dir.join("connections.json"))
}

/// Save connection configurations to disk
#[command]
pub async fn save_connections(connections_json: String, app: AppHandle) -> Result<bool, String> {
    let path = get_connections_path(&app)?;

    serde_json::from_str::<serde_json::Value>(&connections_json)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    fs::write(&path, &connections_json)
        .map_err(|e| format!("Failed to save connections: {}", e))?;

    Ok(true)
}

/// Load saved connection configurations from disk
#[command]
pub async fn load_connections(app: AppHandle) -> Result<String, String> {
    let path = get_connections_path(&app)?;

    if !path.exists() {
        return Ok("[]".to_string());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read connections: {}", e))?;

    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("Invalid saved data: {}", e))?;

    Ok(content)
}

const KEYCHAIN_SERVICE: &str = "OpenRDB-Studio";

/// Save a password to the OS keychain
#[command]
pub async fn save_password(connection_id: String, password: String) -> Result<bool, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    entry
        .set_password(&password)
        .map_err(|e| format!("Failed to save password to keychain: {}", e))?;

    Ok(true)
}

/// Get a password from the OS keychain
#[command]
pub async fn get_password(connection_id: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to get password from keychain: {}", e)),
    }
}

/// Delete a password from the OS keychain
#[command]
pub async fn delete_password(connection_id: String) -> Result<bool, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    match entry.delete_credential() {
        Ok(()) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(true),
        Err(e) => Err(format!("Failed to delete password from keychain: {}", e)),
    }
}

/// List foreign key relationships for the connected database
#[command]
pub async fn list_foreign_keys(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ForeignKeyInfo>, String> {
    let session = state
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    session.list_foreign_keys().await
}

/// Drain Atlas connect payloads queued by the localhost bridge.
#[command]
pub fn take_pending_atlas_connects(
    state: State<'_, AppState>,
) -> Result<Vec<crate::bridge::AtlasConnectPayload>, String> {
    Ok(state.take_atlas_connects())
}
