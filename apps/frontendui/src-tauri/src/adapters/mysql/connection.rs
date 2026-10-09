use sqlx::{mysql::MySqlPoolOptions, MySql, Pool};
use std::time::Duration;

use crate::adapters::models::ConnectionConfig;

pub type MySqlPool = Pool<MySql>;

/// Catalog database used to list and create databases without depending on the user's selection.
pub const MAINTENANCE_DATABASE: &str = "information_schema";

pub fn connection_string(config: &ConnectionConfig) -> String {
    let user = encode_userinfo(&config.username);
    let pass = if config.password.is_empty() {
        String::new()
    } else {
        format!(":{}", encode_userinfo(&config.password))
    };
    let host = if config.host.is_empty() {
        "localhost"
    } else {
        config.host.as_str()
    };
    let db = if config.database.is_empty() {
        "/".to_string()
    } else {
        format!("/{}", encode_userinfo(&config.database))
    };
    let ssl_mode = if config.ssl_required {
        "REQUIRED"
    } else {
        "DISABLED"
    };
    format!(
        "mysql://{user}{pass}@{host}:{port}{db}?ssl-mode={ssl_mode}",
        port = config.port
    )
}

pub async fn create_pool(database_url: &str) -> Result<MySqlPool, String> {
    MySqlPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .map_err(|e| format!("Failed to connect to MySQL: {}", e))
}

fn encode_userinfo(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
