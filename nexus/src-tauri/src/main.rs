// NEXUS — AI-Powered Local System Command Center
// Rust backend entry point. All heavy logic (system info, processes,
// files, terminal, security, ai tool-routing, settings) lives in
// `commands/*` and is exposed to the React/Tauri frontend as
// `#[tauri::command]` invocations.

mod commands;
mod db;

use std::sync::Mutex;
use tauri::Manager;

use commands::{ai, files, network, processes, security, settings, system, terminal};
use db::Database;

/// Shared application state accessible from every Tauri command.
pub struct AppState {
    pub db: Mutex<Database>,
}

fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("could not resolve app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("nexus.db");

            let database = Database::open(&db_path).expect("failed to open NEXUS database");
            database.migrate().expect("failed to run migrations");

            app.manage(AppState {
                db: Mutex::new(database),
            });

            tracing::info!("NEXUS backend initialized. db at {:?}", db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // system
            system::get_system_snapshot,
            system::get_static_system_info,
            system::get_health_score,
            // processes
            processes::list_processes,
            processes::kill_process,
            processes::set_process_priority,
            // files
            files::list_directory,
            files::get_file_metadata,
            files::delete_path,
            files::rename_path,
            files::copy_path,
            files::move_path,
            files::hash_file,
            files::find_large_files,
            files::find_duplicate_files,
            files::analyze_storage,
            // terminal
            terminal::run_command,
            // network
            network::get_network_snapshot,
            network::scan_local_network,
            // security
            security::list_security_events,
            security::log_security_event,
            // ai
            ai::ai_route_request,
            // settings
            settings::get_settings,
            settings::update_setting,
            settings::log_activity,
            settings::get_activity_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXUS");
}
