mod adapters;
mod ipc;
mod menu;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            ipc::command::ping,
            ipc::command::test_connection,
            ipc::command::connect,
            ipc::command::disconnect,
            ipc::command::list_connections,
            ipc::command::list_databases,
            ipc::command::create_database,
            ipc::command::list_tables,
            ipc::command::list_columns,
            ipc::command::get_table_data,
            ipc::command::execute_query,
            ipc::command::update_row,
            ipc::command::insert_row,
            ipc::command::delete_rows,
            ipc::command::save_connections,
            ipc::command::load_connections,
            ipc::command::save_password,
            ipc::command::get_password,
            ipc::command::delete_password,
            ipc::command::list_foreign_keys,
        ])
        .setup(|app| {
            menu::init_logging(app.handle())?;
            menu::build_app_menu(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
