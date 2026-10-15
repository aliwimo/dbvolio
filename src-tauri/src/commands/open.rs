use crate::models::open::DbmlOpenPayload;
use crate::services::dbml_open::resolve_dbml_open_path;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct PendingDbmlOpens {
    queue: Mutex<Vec<DbmlOpenPayload>>,
    /// After the frontend drains the startup queue, new opens are emitted live.
    live_dispatch: Mutex<bool>,
}

impl PendingDbmlOpens {
    fn dispatch(&self, app: &AppHandle, path: PathBuf) -> Result<(), String> {
        let target = resolve_dbml_open_path(&path)?;
        let payload = DbmlOpenPayload::from_target(&target);
        let live = self
            .live_dispatch
            .lock()
            .map_err(|_| "Open queue lock poisoned".to_string())?;
        if *live {
            app.emit("dbml-open", &payload)
                .map_err(|e| format!("Failed to notify frontend: {e}"))?;
        } else {
            self.queue
                .lock()
                .map_err(|_| "Open queue lock poisoned".to_string())?
                .push(payload);
        }
        Ok(())
    }
}

pub fn enqueue_dbml_path(
    app: &AppHandle,
    pending: &PendingDbmlOpens,
    path: impl AsRef<Path>,
) {
    let _ = pending.dispatch(app, path.as_ref().to_path_buf());
}

pub fn enqueue_startup_args(app: &AppHandle, pending: &PendingDbmlOpens) {
    for arg in std::env::args_os().skip(1) {
        enqueue_dbml_path(app, pending, PathBuf::from(arg));
    }
}

#[tauri::command]
pub fn take_pending_dbml_opens(
    pending: State<'_, PendingDbmlOpens>,
) -> Result<Vec<DbmlOpenPayload>, String> {
    let mut queue = pending
        .queue
        .lock()
        .map_err(|_| "Open queue lock poisoned".to_string())?;
    let items = std::mem::take(&mut *queue);
    *pending
        .live_dispatch
        .lock()
        .map_err(|_| "Open queue lock poisoned".to_string())? = true;
    Ok(items)
}
