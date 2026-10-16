mod commands;
mod menu;
mod models;
mod services;

// Rebuild when bundle icons change (see build.rs).
const _: &str = include_str!(concat!(env!("OUT_DIR"), "/app-icon-stamp"));

use commands::open::{finish_startup_open_queue, ingest_opened_path, PendingDbmlOpens};
use models::project::ProjectState;
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(ProjectState::default()))
        .manage(PendingDbmlOpens::default())
        .setup(|app| {
            menu::init(app)?;
            let handle = app.handle().clone();
            let pending = app.state::<PendingDbmlOpens>();
            finish_startup_open_queue(&handle, &pending);
            Ok(())
        })
        .on_menu_event(menu::on_menu_event)
        .invoke_handler(tauri::generate_handler![
            commands::projects::set_project_root,
            commands::projects::get_project_root,
            commands::projects::clear_project,
            commands::files::list_project_files,
            commands::files::read_project_file,
            commands::files::write_project_file,
            commands::files::create_project_file,
            commands::files::rename_project_file,
            commands::files::delete_project_file,
            commands::layout::read_layout_metadata,
            commands::layout::write_layout_metadata,
            commands::export::write_export_file,
            commands::open::take_pending_dbml_opens,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Opened { urls } = event {
                for url in urls {
                    if url.scheme() == "file" {
                        if let Ok(path) = url.to_file_path() {
                            ingest_opened_path(app_handle, path);
                        }
                    }
                }
            }
        });
}
