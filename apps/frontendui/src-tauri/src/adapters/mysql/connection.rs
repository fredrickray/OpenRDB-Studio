use sqlx::{mysql::MySqlPoolOptions, MySql, Pool};
use std::time::Duration;

use crate::adapters::models::ConnectionConfig;
use crate::adapters::userinfo::{encode_userinfo, redact_secret};

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

pub async fn create_pool(config: &ConnectionConfig) -> Result<MySqlPool, String> {
    let database_url = connection_string(config);
    MySqlPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
        .map_err(|e| {
            redact_secret(
                &format!("Failed to connect to MySQL: {}", e),
                &config.password,
            )
        })
}
