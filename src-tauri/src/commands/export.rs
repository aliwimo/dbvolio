use std::path::Path;

#[tauri::command]
pub fn write_export_file(path: String, data: Vec<u8>) -> Result<(), String> {
    if path.is_empty() || path.contains('\0') {
        return Err("Invalid export path".into());
    }
    let path = Path::new(&path);
    if !path.is_absolute() {
        return Err("Export path must be absolute".into());
    }
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create export directory: {e}"))?;
        }
    }
    std::fs::write(path, data).map_err(|e| format!("Failed to write export file: {e}"))?;
    Ok(())
}
