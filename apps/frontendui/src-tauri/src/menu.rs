use std::path::PathBuf;

use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter, Manager, Runtime,
};
use tauri_plugin_log::TargetKind;
use tauri_plugin_opener::OpenerExt;

const GITHUB_REPO: &str = "https://github.com/fredrickray/OpenRDB-Studio";
const HELP_URL: &str = "https://github.com/fredrickray/OpenRDB-Studio#readme";
const BUG_REPORT_URL: &str =
    "https://github.com/fredrickray/OpenRDB-Studio/issues/new?template=bug_report.yml";
const FEATURE_REQUEST_URL: &str =
    "https://github.com/fredrickray/OpenRDB-Studio/issues/new?template=feature_request.yml";

const LOG_FILE_NAME: &str = "openrdb-studio.log";
const MENU_EVENT: &str = "menu-action";

pub fn init_logging<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    app.plugin(
        tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .targets([
                tauri_plugin_log::Target::new(TargetKind::Stdout),
                tauri_plugin_log::Target::new(TargetKind::LogDir {
                    file_name: Some(LOG_FILE_NAME.into()),
                }),
            ])
            .build(),
    )
}

fn action_item<R: Runtime>(
    app: &AppHandle<R>,
    id: &str,
    text: &str,
    accelerator: Option<&str>,
) -> tauri::Result<MenuItem<R>> {
    let mut builder = MenuItemBuilder::with_id(id, text);
    if let Some(acc) = accelerator {
        builder = builder.accelerator(acc);
    }
    builder.build(app)
}

pub fn build_app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let new_connection = action_item(app, "new_connection", "New Connection", Some("CmdOrCtrl+N"))?;
    let refresh_connections =
        action_item(app, "refresh_connections", "Refresh Connections", Some("F5"))?;

    let connections_submenu = {
        #[cfg(target_os = "macos")]
        {
            SubmenuBuilder::new(app, "Connections")
                .item(&new_connection)
                .item(&refresh_connections)
                .build()?
        }
        #[cfg(not(target_os = "macos"))]
        {
            SubmenuBuilder::new(app, "Connections")
                .item(&new_connection)
                .item(&refresh_connections)
                .separator()
                .quit()
                .build()?
        }
    };

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .select_all()
        .build()?;

    let go_connections = action_item(app, "go_connections", "Connections", Some("CmdOrCtrl+1"))?;
    let go_workspace = action_item(app, "go_workspace", "Table Workspace", Some("CmdOrCtrl+2"))?;
    let go_query = action_item(app, "go_query", "Query Editor", Some("CmdOrCtrl+3"))?;
    let go_erd = action_item(app, "go_erd", "ERD View", Some("CmdOrCtrl+4"))?;
    let toggle_connections_sidebar = action_item(
        app,
        "toggle_connections_sidebar",
        "Toggle Connections Sidebar",
        Some("CmdOrCtrl+Shift+B"),
    )?;
    let toggle_explorer_sidebar = action_item(
        app,
        "toggle_explorer_sidebar",
        "Toggle Explorer Sidebar",
        Some("CmdOrCtrl+Shift+E"),
    )?;
    let reload_app = action_item(app, "reload_app", "Reload", Some("CmdOrCtrl+R"))?;

    let view_submenu = SubmenuBuilder::new(app, "View")
        .item(&go_connections)
        .item(&go_workspace)
        .item(&go_query)
        .item(&go_erd)
        .separator()
        .item(&toggle_connections_sidebar)
        .item(&toggle_explorer_sidebar)
        .separator()
        .item(&reload_app)
        .build()?;

    let query_new_tab = action_item(app, "query_new_tab", "New Query Tab", Some("CmdOrCtrl+T"))?;
    let query_run = action_item(app, "query_run", "Run Query", Some("CmdOrCtrl+Enter"))?;
    let query_cancel = action_item(app, "query_cancel", "Cancel Query", Some("CmdOrCtrl+."))?;
    let query_format = action_item(app, "query_format", "Format SQL", Some("CmdOrCtrl+Shift+F"))?;
    let query_save = action_item(app, "query_save", "Save Query", Some("CmdOrCtrl+S"))?;

    let query_submenu = SubmenuBuilder::new(app, "Query")
        .item(&query_new_tab)
        .item(&query_run)
        .item(&query_cancel)
        .separator()
        .item(&query_format)
        .item(&query_save)
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?;

    #[cfg(target_os = "macos")]
    window_submenu.set_as_windows_menu_for_nsapp()?;

    let help_docs = action_item(app, "help_docs", "OpenRDB Studio Help", Some("F1"))?;
    let separator_1 = PredefinedMenuItem::separator(app)?;
    let view_source = MenuItemBuilder::with_id("view_source", "View Source on GitHub").build(app)?;
    let suggest_feature =
        MenuItemBuilder::with_id("suggest_feature", "Suggest a Feature").build(app)?;
    let report_bug = MenuItemBuilder::with_id("report_bug", "Report a Bug").build(app)?;
    let separator_2 = PredefinedMenuItem::separator(app)?;
    let open_log = MenuItemBuilder::with_id("open_log", "Open Log File").build(app)?;

    let help_submenu = SubmenuBuilder::new(app, "Help")
        .item(&help_docs)
        .item(&separator_1)
        .item(&view_source)
        .item(&suggest_feature)
        .item(&report_bug)
        .item(&separator_2)
        .item(&open_log)
        .build()?;

    #[cfg(target_os = "macos")]
    help_submenu.set_as_help_menu_for_nsapp()?;

    let mut menu_builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        let app_submenu = SubmenuBuilder::new(app, "OpenRDB Studio")
            .about(None)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;
        menu_builder = menu_builder.item(&app_submenu);
    }

    let menu = menu_builder
        .item(&connections_submenu)
        .item(&edit_submenu)
        .item(&view_submenu)
        .item(&query_submenu)
        .item(&window_submenu)
        .item(&help_submenu)
        .build()?;

    app.set_menu(menu)?;

    let app_handle = app.clone();
    app.on_menu_event(move |_, event| {
        handle_menu_event(&app_handle, event.id().as_ref());
    });

    Ok(())
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    let result = match id {
        "help_docs" => open_url(app, HELP_URL),
        "view_source" => open_url(app, GITHUB_REPO),
        "suggest_feature" => open_url(app, FEATURE_REQUEST_URL),
        "report_bug" => open_url(app, BUG_REPORT_URL),
        "open_log" => open_log_file(app),
        "reload_app" => reload_app(app),
        "new_connection"
        | "refresh_connections"
        | "go_connections"
        | "go_workspace"
        | "go_query"
        | "go_erd"
        | "toggle_connections_sidebar"
        | "toggle_explorer_sidebar"
        | "query_new_tab"
        | "query_run"
        | "query_cancel"
        | "query_format"
        | "query_save" => emit_menu_action(app, id),
        _ => Ok(()),
    };

    if let Err(error) = result {
        log::error!("Menu action '{id}' failed: {error}");
    }
}

fn emit_menu_action<R: Runtime>(app: &AppHandle<R>, action: &str) -> Result<(), String> {
    app.emit(MENU_EVENT, action)
        .map_err(|e| format!("Failed to emit menu action: {e}"))
}

fn reload_app<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    window
        .eval("window.location.reload()")
        .map_err(|e| format!("Failed to reload app: {e}"))
}

fn open_url<R: Runtime>(app: &AppHandle<R>, url: &str) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Failed to open {url}: {e}"))
}

fn log_file_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to resolve log directory: {e}"))?;

    std::fs::create_dir_all(&log_dir)
        .map_err(|e| format!("Failed to create log directory: {e}"))?;

    Ok(log_dir.join(LOG_FILE_NAME))
}

fn open_log_file<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let path = log_file_path(app)?;

    if !path.exists() {
        std::fs::File::create(&path).map_err(|e| format!("Failed to create log file: {e}"))?;
    }

    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| format!("Failed to reveal log file: {e}"))
}
