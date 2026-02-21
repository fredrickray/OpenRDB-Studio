mod ipc;
mod state;
mod adapters;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            ipc::command::ping,
            ipc::command::test_connection,
            ipc::command::connect,
            ipc::command::disconnect,
            ipc::command::list_connections,
            ipc::command::list_databases,
            ipc::command::list_tables,
            ipc::command::list_columns,
            ipc::command::get_table_data,
            ipc::command::execute_query,
            ipc::command::update_row,
            ipc::command::insert_row,
            ipc::command::delete_rows,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
