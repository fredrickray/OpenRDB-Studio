use crate::adapters::models::{
    ColumnInfo, ConnectionConfig, ConnectionTestResult, DatabaseEngine, DatabaseInfo, ForeignKeyInfo,
    QueryResult, TableDataResult, TableInfo,
};
use crate::adapters::mysql::{self, MySqlPool};
use crate::adapters::postgres::{self, PgPool};

/// A live connection. Add a variant here when a new engine adapter is implemented.
#[derive(Clone)]
pub enum DbSession {
    Postgres(PgPool),
    Mysql(MySqlPool),
}

impl DbSession {
    pub async fn list_tables(&self) -> Result<Vec<TableInfo>, String> {
        match self {
            DbSession::Postgres(pool) => postgres::list_tables(pool).await,
            DbSession::Mysql(pool) => mysql::ops::list_tables(pool).await,
        }
    }

    pub async fn list_columns(&self, schema: &str, table: &str) -> Result<Vec<ColumnInfo>, String> {
        match self {
            DbSession::Postgres(pool) => postgres::ops::list_columns(pool, schema, table).await,
            DbSession::Mysql(pool) => mysql::ops::list_columns(pool, schema, table).await,
        }
    }

    pub async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        page: i32,
        limit: i32,
        sort_column: Option<String>,
        sort_direction: Option<String>,
        filter: Option<String>,
    ) -> Result<TableDataResult, String> {
        match self {
            DbSession::Postgres(pool) => {
                postgres::ops::get_table_data(
                    pool,
                    schema,
                    table,
                    page,
                    limit,
                    sort_column,
                    sort_direction,
                    filter,
                )
                .await
            }
            DbSession::Mysql(pool) => {
                mysql::ops::get_table_data(
                    pool,
                    schema,
                    table,
                    page,
                    limit,
                    sort_column,
                    sort_direction,
                    filter,
                )
                .await
            }
        }
    }

    pub async fn execute_query(&self, sql: &str) -> Result<QueryResult, String> {
        match self {
            DbSession::Postgres(pool) => postgres::execute_query(pool, sql).await,
            DbSession::Mysql(pool) => mysql::query::execute_query(pool, sql).await,
        }
    }

    pub async fn update_row(
        &self,
        schema: &str,
        table: &str,
        pk_column: &str,
        pk_value: &str,
        column: &str,
        new_value: Option<String>,
    ) -> Result<bool, String> {
        match self {
            DbSession::Postgres(pool) => {
                postgres::ops::update_row(pool, schema, table, pk_column, pk_value, column, new_value)
                    .await
            }
            DbSession::Mysql(pool) => {
                mysql::ops::update_row(pool, schema, table, pk_column, pk_value, column, new_value)
                    .await
            }
        }
    }

    pub async fn insert_row(
        &self,
        schema: &str,
        table: &str,
        columns: &[String],
        values: &[Option<String>],
    ) -> Result<bool, String> {
        match self {
            DbSession::Postgres(pool) => {
                postgres::ops::insert_row(pool, schema, table, columns, values).await
            }
            DbSession::Mysql(pool) => mysql::ops::insert_row(pool, schema, table, columns, values).await,
        }
    }

    pub async fn delete_rows(
        &self,
        schema: &str,
        table: &str,
        pk_column: &str,
        pk_values: &[String],
    ) -> Result<i32, String> {
        match self {
            DbSession::Postgres(pool) => {
                postgres::ops::delete_rows(pool, schema, table, pk_column, pk_values).await
            }
            DbSession::Mysql(pool) => {
                mysql::ops::delete_rows(pool, schema, table, pk_column, pk_values).await
            }
        }
    }

    pub async fn list_foreign_keys(&self) -> Result<Vec<ForeignKeyInfo>, String> {
        match self {
            DbSession::Postgres(pool) => postgres::ops::list_foreign_keys(pool).await,
            DbSession::Mysql(pool) => mysql::ops::list_foreign_keys(pool).await,
        }
    }
}

pub async fn test_connection(config: &ConnectionConfig) -> Result<ConnectionTestResult, String> {
    match config.engine {
        DatabaseEngine::Postgres => postgres::ops::test_connection(config).await,
        DatabaseEngine::Mysql => mysql::ops::test_connection(config).await,
    }
}

pub async fn list_databases(config: &ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    match config.engine {
        DatabaseEngine::Postgres => postgres::ops::list_databases(config).await,
        DatabaseEngine::Mysql => mysql::ops::list_databases(config).await,
    }
}

pub async fn create_database(config: &ConnectionConfig, name: &str) -> Result<bool, String> {
    match config.engine {
        DatabaseEngine::Postgres => postgres::ops::create_database(config, name).await,
        DatabaseEngine::Mysql => mysql::ops::create_database(config, name).await,
    }
}

pub async fn connect_session(config: &ConnectionConfig) -> Result<DbSession, String> {
    match config.engine {
        DatabaseEngine::Postgres => Ok(DbSession::Postgres(postgres::ops::connect(config).await?)),
        DatabaseEngine::Mysql => Ok(DbSession::Mysql(mysql::ops::connect(config).await?)),
    }
}
