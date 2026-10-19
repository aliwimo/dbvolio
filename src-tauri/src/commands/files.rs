use crate::commands::projects::with_root;
use crate::models::project::ProjectState;
use crate::services::path_guard::resolve_path;
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::State;

const DBML_EXT: &str = "dbml";
const STUDIO_DIRS: [&str; 2] = [".dbvolio", ".dbml-studio"];

#[derive(Serialize)]
pub struct ProjectFileEntry {
    pub relative_path: String,
    pub is_directory: bool,
}

#[derive(Serialize)]
pub struct FileContent {
    pub content: String,
    pub modified_ms: Option<u64>,
}

fn modified_ms(path: &Path) -> Option<u64> {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
}

fn should_list(relative: &Path) -> bool {
    let s = relative.to_string_lossy();
    if STUDIO_DIRS.iter().any(|dir| s.starts_with(dir)) {
        return false;
    }
    true
}

fn collect_files(root: &Path, dir: &Path, entries: &mut Vec<ProjectFileEntry>) -> Result<(), String> {
    let read_dir = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {e}"))?;
    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let path = entry.path();
        let relative = path
            .strip_prefix(root)
            .map_err(|_| "Failed to compute relative path".to_string())?;
        if !should_list(relative) {
            continue;
        }
        let is_directory = path.is_dir();
        if is_directory {
            collect_files(root, &path, entries)?;
        }
        let rel_str = relative.to_string_lossy().replace('\\', "/");
        if is_directory || rel_str.ends_with(DBML_EXT) {
            entries.push(ProjectFileEntry {
                relative_path: rel_str,
                is_directory,
            });
        }
    }
    Ok(())
}

use tauri::Window;

#[tauri::command]
pub fn list_project_files(
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<Vec<ProjectFileEntry>, String> {
    with_root(&window, &state, |root| {
        let mut entries = Vec::new();
        collect_files(root, root, &mut entries)?;
        entries.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
        Ok(entries)
    })
}

#[tauri::command]
pub fn read_project_file(
    relative_path: String,
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<FileContent, String> {
    with_root(&window, &state, |root| {
        let path = resolve_path(root, &relative_path).map_err(|e| e.message())?;
        if !path.is_file() {
            return Err("Path is not a file".into());
        }
        let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))?;
        Ok(FileContent {
            content,
            modified_ms: modified_ms(&path),
        })
    })
}

#[tauri::command]
pub fn write_project_file(
    relative_path: String,
    content: String,
    expected_modified_ms: Option<u64>,
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<FileContent, String> {
    with_root(&window, &state, |root| {
        let path = resolve_path(root, &relative_path).map_err(|e| e.message())?;
        if path.exists() {
            if let Some(expected) = expected_modified_ms {
                let current = modified_ms(&path);
                if current != Some(expected) {
                    return Err(
                        "File was modified on disk. Reload or save again after reviewing changes."
                            .into(),
                    );
                }
            }
        } else if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories: {e}"))?;
        }

        let tmp = path.with_extension("dbml.tmp");
        fs::write(&tmp, &content).map_err(|e| format!("Failed to write file: {e}"))?;
        fs::rename(&tmp, &path).map_err(|e| format!("Failed to save file: {e}"))?;

        Ok(FileContent {
            content,
            modified_ms: modified_ms(&path),
        })
    })
}

#[tauri::command]
pub fn create_project_file(
    relative_path: String,
    content: Option<String>,
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<FileContent, String> {
    with_root(&window, &state, |root| {
        let path = resolve_path(root, &relative_path).map_err(|e| e.message())?;
        if path.exists() {
            return Err("File already exists".into());
        }
        if !relative_path.ends_with(DBML_EXT) {
            return Err("Only .dbml files can be created".into());
        }
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories: {e}"))?;
        }
        let content = content.unwrap_or_default();
        fs::write(&path, &content).map_err(|e| format!("Failed to create file: {e}"))?;
        Ok(FileContent {
            content,
            modified_ms: modified_ms(&path),
        })
    })
}

#[tauri::command]
pub fn rename_project_file(
    from_relative: String,
    to_relative: String,
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<(), String> {
    with_root(&window, &state, |root| {
        let from = resolve_path(root, &from_relative).map_err(|e| e.message())?;
        let to = resolve_path(root, &to_relative).map_err(|e| e.message())?;
        if !from.is_file() {
            return Err("Source path is not a file".into());
        }
        if to.exists() {
            return Err("Destination already exists".into());
        }
        if let Some(parent) = to.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories: {e}"))?;
        }
        fs::rename(from, to).map_err(|e| format!("Failed to rename file: {e}"))?;
        Ok(())
    })
}

#[tauri::command]
pub fn delete_project_file(
    relative_path: String,
    window: Window,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<(), String> {
    with_root(&window, &state, |root| {
        let path = resolve_path(root, &relative_path).map_err(|e| e.message())?;
        if !path.is_file() {
            return Err("Path is not a file".into());
        }
        fs::remove_file(path).map_err(|e| format!("Failed to delete file: {e}"))?;
        Ok(())
    })
}

