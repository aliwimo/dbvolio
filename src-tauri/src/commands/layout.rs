use crate::commands::projects::with_root;
use crate::models::project::ProjectState;
use crate::services::path_guard::resolve_path;
use std::fs;
use std::sync::Mutex;
use tauri::State;

const LAYOUT_RELATIVE: &str = ".dbml-studio/layout.json";

#[tauri::command]
pub fn read_layout_metadata(
    state: State<'_, Mutex<ProjectState>>,
) -> Result<Option<String>, String> {
    with_root(&state, |root| {
        let path = match resolve_path(root, LAYOUT_RELATIVE) {
            Ok(p) => p,
            Err(_) => return Ok(None),
        };
        if !path.is_file() {
            return Ok(None);
        }
        let content =
            fs::read_to_string(&path).map_err(|e| format!("Failed to read layout: {e}"))?;
        Ok(Some(content))
    })
}

#[tauri::command]
pub fn write_layout_metadata(
    content: String,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<(), String> {
    with_root(&state, |root| {
        let path = resolve_path(root, LAYOUT_RELATIVE).map_err(|e| e.message())?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create layout directory: {e}"))?;
        }
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, &content).map_err(|e| format!("Failed to write layout: {e}"))?;
        fs::rename(&tmp, &path).map_err(|e| format!("Failed to save layout: {e}"))?;
        Ok(())
    })
}
