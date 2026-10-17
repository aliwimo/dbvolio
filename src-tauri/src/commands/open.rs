use crate::models::open::DbmlOpenPayload;
use crate::services::dbml_open::resolve_open_path;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{LazyLock, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

/// macOS can deliver `RunEvent::Opened` before `setup()` runs; buffer paths until then.
#[cfg(target_os = "macos")]
static STARTUP_HOOKS_COMPLETE: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "macos")]
static PRE_SETUP_OPEN_PATHS: LazyLock<Mutex<Vec<PathBuf>>> = LazyLock::new(|| Mutex::new(Vec::new()));

#[derive(Default)]
pub struct PendingDbmlOpens {
    queue: Mutex<Vec<DbmlOpenPayload>>,
    /// After the frontend drains the startup queue, new opens are emitted live.
    live_dispatch: Mutex<bool>,
}

fn should_ignore_open_path(path: &Path) -> bool {
    let text = path.to_string_lossy();
    text.ends_with(".app") || text.contains(".app/")
}

impl PendingDbmlOpens {
    fn dispatch(&self, app: &AppHandle, path: PathBuf) -> Result<(), String> {
        if should_ignore_open_path(&path) {
            return Ok(());
        }
        let target = resolve_open_path(&path)?;
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

    #[cfg(target_os = "macos")]
    fn drain_pre_setup_paths(&self, app: &AppHandle) {
        let paths = match PRE_SETUP_OPEN_PATHS.lock() {
            Ok(mut guard) => std::mem::take(&mut *guard),
            Err(_) => return,
        };
        for path in paths {
            if let Err(err) = self.dispatch(app, path) {
                eprintln!("dbvolio: failed to open dropped-in path: {err}");
            }
        }
    }
}

fn path_from_startup_arg(arg: &std::ffi::OsStr) -> Option<PathBuf> {
    let text = arg.to_str()?;
    if text.starts_with('-') {
        return None;
    }
    if let Ok(url) = tauri::Url::parse(text) {
        if url.scheme() == "file" {
            return url.to_file_path().ok();
        }
        return None;
    }
    Some(PathBuf::from(text))
}

#[cfg(target_os = "macos")]
pub fn ingest_opened_path(app: &AppHandle, path: PathBuf) {
    if STARTUP_HOOKS_COMPLETE.load(Ordering::SeqCst) {
        if let Some(pending) = app.try_state::<PendingDbmlOpens>() {
            if let Err(err) = pending.dispatch(app, path) {
                eprintln!("dbvolio: failed to open file: {err}");
            }
        }
        return;
    }
    if let Ok(mut guard) = PRE_SETUP_OPEN_PATHS.lock() {
        guard.push(path);
    }
}

pub fn finish_startup_open_queue(app: &AppHandle, pending: &PendingDbmlOpens) {
    #[cfg(target_os = "macos")]
    pending.drain_pre_setup_paths(app);
    for arg in std::env::args_os().skip(1) {
        if let Some(path) = path_from_startup_arg(&arg) {
            if let Err(err) = pending.dispatch(app, path) {
                eprintln!("dbvolio: failed to open startup path: {err}");
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        // macOS may still deliver `Opened` while startup args are processed.
        pending.drain_pre_setup_paths(app);
        STARTUP_HOOKS_COMPLETE.store(true, Ordering::SeqCst);
        pending.drain_pre_setup_paths(app);
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
