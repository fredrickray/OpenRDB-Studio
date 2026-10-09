use crate::adapters::models::{ConnectionConfig, DatabaseEngine};
use crate::adapters::mysql::{ops, query};

fn config(database: &str, password: &str) -> ConnectionConfig {
    ConnectionConfig {
        host: std::env::var("OPENRDB_MYSQL_HOST").unwrap_or_else(|_| "127.0.0.1".into()),
        port: std::env::var("OPENRDB_MYSQL_PORT")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(3306),
        username: std::env::var("OPENRDB_MYSQL_USER").unwrap_or_else(|_| "root".into()),
        password: password.into(),
        database: database.into(),
        ssl_required: false,
        engine: DatabaseEngine::Mysql,
    }
}

/// Exercises the MySQL adapter against a local server.
/// The password is read from the environment and is not stored in source.
/// Run with: OPENRDB_MYSQL_LIVE=1 OPENRDB_MYSQL_PASSWORD=... cargo test mysql_adapter_round_trip -- --nocapture
#[tokio::test]
async fn mysql_adapter_round_trip() {
    if std::env::var("OPENRDB_MYSQL_LIVE").ok().as_deref() != Some("1") {
        return;
    }
    let password = std::env::var("OPENRDB_MYSQL_PASSWORD").unwrap_or_default();
    if password.is_empty() {
        panic!("Set OPENRDB_MYSQL_PASSWORD before running the live MySQL test");
    }

    let server = config("", &password);
    let listed = ops::list_databases(&server).await.expect("list databases");
    assert!(
        listed.iter().any(|db| db.name == "studio_check"),
        "expected studio_check in {listed:?}"
    );

    let maintenance = ops::connect(&config("information_schema", &password))
        .await
        .expect("connect maintenance");
    sqlx::query("DROP DATABASE IF EXISTS openrdb_created")
        .execute(&maintenance)
        .await
        .expect("drop leftover database");

    ops::create_database(&server, "openrdb_created")
        .await
        .expect("create database");
    let listed = ops::list_databases(&server).await.expect("list after create");
    assert!(listed.iter().any(|db| db.name == "openrdb_created"));

    let cfg = config("studio_check", &password);
    let test = ops::test_connection(&cfg).await.expect("test connection");
    assert!(test.success, "{}", test.message);
    assert!(test.server_version.is_some());

    let pool = ops::connect(&cfg).await.expect("connect studio_check");
    sqlx::query("DROP TABLE IF EXISTS widgets")
        .execute(&pool)
        .await
        .expect("drop widgets");
    sqlx::query("CREATE TABLE widgets (id INT PRIMARY KEY, name VARCHAR(64))")
        .execute(&pool)
        .await
        .expect("create widgets");
    sqlx::query("INSERT INTO widgets (id, name) VALUES (1, 'alpha')")
        .execute(&pool)
        .await
        .expect("insert alpha");

    let tables = ops::list_tables(&pool).await.expect("list tables");
    assert!(
        tables.iter().any(|table| table.name.as_deref() == Some("widgets")),
        "tables: {tables:?}"
    );

    let columns = ops::list_columns(&pool, "studio_check", "widgets")
        .await
        .expect("list columns");
    let id_column = columns
        .iter()
        .find(|column| column.name.as_deref() == Some("id"))
        .expect("id column");
    assert!(id_column.is_primary_key, "columns: {columns:?}");

    let page = ops::get_table_data(&pool, "studio_check", "widgets", 1, 10, None, None, None)
        .await
        .expect("table data");
    assert_eq!(page.total_rows, 1);
    assert_eq!(page.columns, vec!["id".to_string(), "name".to_string()]);
    assert_eq!(page.rows[0][1].as_deref(), Some("alpha"));

    let selected = query::execute_query(&pool, "SELECT id, name FROM widgets")
        .await
        .expect("select");
    assert_eq!(selected.rows, vec![vec!["1".to_string(), "alpha".to_string()]]);

    ops::update_row(
        &pool,
        "studio_check",
        "widgets",
        "id",
        "1",
        "name",
        Some("beta".into()),
    )
    .await
    .expect("update row");
    let updated = query::execute_query(&pool, "SELECT name FROM widgets WHERE id = 1")
        .await
        .expect("select updated");
    assert_eq!(updated.rows[0][0], "beta");

    ops::insert_row(
        &pool,
        "studio_check",
        "widgets",
        &["id".into(), "name".into()],
        &[Some("2".into()), Some("gamma".into())],
    )
    .await
    .expect("insert row");
    let deleted = ops::delete_rows(&pool, "studio_check", "widgets", "id", &["2".into()])
        .await
        .expect("delete row");
    assert_eq!(deleted, 1);

    let keys = ops::list_foreign_keys(&pool).await.expect("foreign keys");
    assert!(keys.is_empty());
}
