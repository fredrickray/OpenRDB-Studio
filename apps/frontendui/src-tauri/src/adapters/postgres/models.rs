use serde::{Deserialize, Serialize};

/// Configuration for a PostgreSQL connection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
    #[serde(default)]
    pub ssl_required: bool,
}

impl ConnectionConfig {
    /// Build a PostgreSQL connection URL from the config
    pub fn to_connection_string(&self) -> String {
        let ssl_mode = if self.ssl_required { "require" } else { "prefer" };
        format!(
            "postgresql://{}:{}@{}:{}/{}?sslmode={}",
            self.username, self.password, self.host, self.port, self.database, ssl_mode
        )
    }
}

/// Information about a database table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub schema: Option<String>,
    pub name: Option<String>,
}

/// Information about a table column
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: Option<String>,
    pub data_type: Option<String>,
    pub is_nullable: bool,
    pub default_value: Option<String>,
    #[serde(default)]
    pub is_primary_key: bool,
    #[serde(default)]
    pub is_foreign_key: bool,
}

/// Result of executing a query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

/// Result of a connection test
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub server_version: Option<String>,
}

/// Information about an active connection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub connected_at: String,
}

/// Database info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub size: Option<String>,
    pub owner: Option<String>,
}

/// Foreign key relationship between tables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub from_schema: String,
    pub from_table: String,
    pub from_column: String,
    pub to_schema: String,
    pub to_table: String,
    pub to_column: String,
}
