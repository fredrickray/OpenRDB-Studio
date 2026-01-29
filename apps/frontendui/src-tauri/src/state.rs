use std::collections::HashMap;
use std::sync::RwLock;
use sqlx::{Pool, Postgres};
use uuid::Uuid;
use chrono::Utc;
use crate::adapters::postgres::{ConnectionConfig, ConnectionInfo};

pub type PgPool = Pool<Postgres>;

/// Application state holding active database connections
pub struct AppState {
    /// Map of connection ID to pool
    pub connections: RwLock<HashMap<String, PgPool>>,
    /// Map of connection ID to info
    pub connection_info: RwLock<HashMap<String, ConnectionInfo>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            connection_info: RwLock::new(HashMap::new()),
        }
    }

    /// Add a new connection and return its ID
    pub fn add_connection(&self, pool: PgPool, config: &ConnectionConfig) -> String {
        let id = Uuid::new_v4().to_string();
        let info = ConnectionInfo {
            id: id.clone(),
            host: config.host.clone(),
            port: config.port,
            database: config.database.clone(),
            username: config.username.clone(),
            connected_at: Utc::now().to_rfc3339(),
        };

        self.connections.write().unwrap().insert(id.clone(), pool);
        self.connection_info.write().unwrap().insert(id.clone(), info);
        id
    }

    /// Get a connection pool by ID
    pub fn get_connection(&self, id: &str) -> Option<PgPool> {
        self.connections.read().unwrap().get(id).cloned()
    }

    /// Remove a connection by ID
    pub fn remove_connection(&self, id: &str) -> bool {
        let removed_pool = self.connections.write().unwrap().remove(id).is_some();
        self.connection_info.write().unwrap().remove(id);
        removed_pool
    }

    /// Get all connection infos
    pub fn list_connections(&self) -> Vec<ConnectionInfo> {
        self.connection_info.read().unwrap().values().cloned().collect()
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
