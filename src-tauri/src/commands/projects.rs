use crate::models::project::ProjectState;
use crate::services::path_guard::{PathGuardError, require_root_opt};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{State, Window};

#[tauri::command]
pub fn set_project_root(
    path: String,
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_dir() {
        return Err("Selected path is not a directory".into());
    }
    let canonical = path_buf
        .canonicalize()
        .map_err(|e| format!("Failed to open project folder: {e}"))?;
    state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?
        .set_root(window.label().to_string(), canonical);
    Ok(())
}

#[tauri::command]
pub fn get_project_root(
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<Option<String>, String> {
    let state = state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?;
    Ok(state.root(window.label()).map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn clear_project(
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?
        .clear(window.label());
    Ok(())
}

pub fn map_guard_err(err: PathGuardError) -> String {
    err.message()
}

pub fn with_root<F, T>(
    window: &Window,
    state: &State<'_, Mutex<ProjectState>>,
    f: F,
) -> Result<T, String>
where
    F: FnOnce(&PathBuf) -> Result<T, String>,
{
    let guard = state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?;
    let root_opt = guard.root(window.label());
    let root = require_root_opt(root_opt).map_err(map_guard_err)?;
    f(root)
}

