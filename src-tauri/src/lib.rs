mod commands;
mod models;
mod services;

// Rebuild when bundle icons change (see build.rs).
const _: &str = include_str!(concat!(env!("OUT_DIR"), "/app-icon-stamp"));

use commands::open::{enqueue_dbml_path, enqueue_startup_args, PendingDbmlOpens};
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
            let handle = app.handle().clone();
            let pending = app.state::<PendingDbmlOpens>();
            enqueue_startup_args(&handle, &pending);
            Ok(())
        })
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
                let pending = app_handle.state::<PendingDbmlOpens>();
                for url in urls {
                    if url.scheme() == "file" {
                        if let Ok(path) = url.to_file_path() {
                            enqueue_dbml_path(app_handle, &pending, path);
                        }
                    }
                }
            }
        });
}
