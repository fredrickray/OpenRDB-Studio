use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::time::Duration;

use crate::adapters::models::ConnectionConfig;

pub type PgPool = Pool<Postgres>;

/// Maintenance database used to list and create databases on a PostgreSQL server.
pub const MAINTENANCE_DATABASE: &str = "postgres";

/// Build a PostgreSQL connection URL from the shared config.
pub fn connection_string(config: &ConnectionConfig) -> String {
    let ssl_mode = if config.ssl_required { "require" } else { "prefer" };
    format!(
        "postgresql://{}:{}@{}:{}/{}?sslmode={}",
        config.username, config.password, config.host, config.port, config.database, ssl_mode
    )
}

pub async fn create_pool(database_url: &str) -> Result<PgPool, String> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .map_err(|e| format!("Failed to connect to PostgreSQL: {}", e))
}