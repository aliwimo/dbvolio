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

use crate::models::project::ProjectState;
use std::collections::HashMap;
use std::sync::atomic::AtomicU64;
use tauri::{WebviewUrl, WebviewWindowBuilder};

static WINDOW_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Default)]
pub struct PendingDbmlOpens {
    /// Window-specific pending opens (e.g. for newly created windows).
    window_queues: Mutex<HashMap<String, Vec<DbmlOpenPayload>>>,
    /// Global startup queue for the first window before it establishes listeners.
    startup_queue: Mutex<Vec<DbmlOpenPayload>>,
    /// After the primary window drains startup, live dispatch mode is active.
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

        let live = *self
            .live_dispatch
            .lock()
            .map_err(|_| "Open queue lock poisoned".to_string())?;

        if !live {
            // App is still in initial startup phase, put in initial queue.
            self.startup_queue
                .lock()
                .map_err(|_| "Open queue lock poisoned".to_string())?
                .push(payload);
            return Ok(());
        }

        // Live mode: check if existing windows have projects loaded or if we should open a new window.
        let project_state = app.try_state::<Mutex<ProjectState>>();
        let has_active_project = project_state
            .as_ref()
            .and_then(|ps| ps.lock().ok())
            .map(|ps| ps.has_any_root())
            .unwrap_or(false);

        // If no project is currently open in any window, we can send to an existing window.
        // But if a project is already open, spawn a new window for this file!
        if !has_active_project {
            // Try emitting to existing window first
            if let Some(main_win) = app.get_webview_window("main") {
                if main_win.emit("dbml-open", &payload).is_ok() {
                    let _ = main_win.set_focus();
                    return Ok(());
                }
            }
        }

        // Spawn a new window for this dbml file
        let new_id = WINDOW_COUNTER.fetch_add(1, Ordering::SeqCst);
        let new_label = format!("win-{}", new_id);

        // Record the pending payload for this new window
        {
            let mut queues = self
                .window_queues
                .lock()
                .map_err(|_| "Open queue lock poisoned".to_string())?;
            queues.entry(new_label.clone()).or_default().push(payload.clone());
        }

        let builder = WebviewWindowBuilder::new(
            app,
            &new_label,
            WebviewUrl::App("index.html".into()),
        )
        .title("DB-Volio")
        .inner_size(1400.0, 900.0);

        #[cfg(target_os = "macos")]
        let builder = builder.title_bar_style(tauri::TitleBarStyle::Overlay);

        let new_window = builder
            .build()
            .map_err(|e| format!("Failed to create window: {e}"))?;

        let _ = new_window.set_focus();

        // Also emit event to the new window in case it finishes loading quickly
        let win_clone = new_window.clone();
        let payload_clone = payload;
        std::thread::spawn(move || {
            // Brief delay to allow frontend React app to mount if needed
            std::thread::sleep(std::time::Duration::from_millis(500));
            let _ = win_clone.emit("dbml-open", &payload_clone);
        });

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
    window: tauri::Window,
    pending: State<'_, PendingDbmlOpens>,
) -> Result<Vec<DbmlOpenPayload>, String> {
    // First check if there is a window-specific queue for this window
    let mut window_queues = pending
        .window_queues
        .lock()
        .map_err(|_| "Open queue lock poisoned".to_string())?;

    if let Some(items) = window_queues.remove(window.label()) {
        if !items.is_empty() {
            return Ok(items);
        }
    }

    // Otherwise check startup queue
    let mut queue = pending
        .startup_queue
        .lock()
        .map_err(|_| "Open queue lock poisoned".to_string())?;
    let items = std::mem::take(&mut *queue);
    *pending
        .live_dispatch
        .lock()
        .map_err(|_| "Open queue lock poisoned".to_string())? = true;
    Ok(items)
}

