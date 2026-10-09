use std::collections::HashMap;
use std::sync::{Mutex, RwLock};
use uuid::Uuid;
use chrono::Utc;
use crate::adapters::{ConnectionConfig, ConnectionInfo, DbSession};
use crate::bridge::AtlasConnectPayload;

/// Application state holding active database connections
pub struct AppState {
    /// Map of connection ID to an engine-specific session
    pub connections: RwLock<HashMap<String, DbSession>>,
    /// Map of connection ID to info
    pub connection_info: RwLock<HashMap<String, ConnectionInfo>>,
    /// Atlas → Studio connect requests waiting for the UI to consume
    pub pending_atlas_connects: Mutex<Vec<AtlasConnectPayload>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            connection_info: RwLock::new(HashMap::new()),
            pending_atlas_connects: Mutex::new(Vec::new()),
        }
    }

    pub fn push_atlas_connect(&self, payload: AtlasConnectPayload) {
        self.pending_atlas_connects.lock().unwrap().push(payload);
    }

    pub fn take_atlas_connects(&self) -> Vec<AtlasConnectPayload> {
        std::mem::take(&mut *self.pending_atlas_connects.lock().unwrap())
    }

    /// Add a new connection and return its ID
    pub fn add_connection(&self, session: DbSession, config: &ConnectionConfig) -> String {
        let id = Uuid::new_v4().to_string();
        let info = ConnectionInfo {
            id: id.clone(),
            host: config.host.clone(),
            port: config.port,
            database: config.database.clone(),
            username: config.username.clone(),
            connected_at: Utc::now().to_rfc3339(),
            engine: config.engine,
        };

        self.connections.write().unwrap().insert(id.clone(), session);
        self.connection_info.write().unwrap().insert(id.clone(), info);
        id
    }

    /// Get a live session by ID
    pub fn get_connection(&self, id: &str) -> Option<DbSession> {
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
