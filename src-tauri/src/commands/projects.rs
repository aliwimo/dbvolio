use crate::models::project::ProjectState;
use crate::services::path_guard::{require_root, PathGuardError};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn set_project_root(
    path: String,
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
        .set_root(canonical);
    Ok(())
}

#[tauri::command]
pub fn get_project_root(state: State<'_, Mutex<ProjectState>>) -> Result<Option<String>, String> {
    let state = state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?;
    Ok(state.root().map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn clear_project(state: State<'_, Mutex<ProjectState>>) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?
        .clear();
    Ok(())
}

pub fn map_guard_err(err: PathGuardError) -> String {
    err.message()
}

pub fn with_root<F, T>(
    state: &State<'_, Mutex<ProjectState>>,
    f: F,
) -> Result<T, String>
where
    F: FnOnce(&PathBuf) -> Result<T, String>,
{
    let guard = state
        .lock()
        .map_err(|_| "Project state lock poisoned".to_string())?;
    let root = require_root(&guard).map_err(map_guard_err)?;
    f(root)
}
