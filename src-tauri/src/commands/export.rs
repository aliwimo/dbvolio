use std::path::Path;

#[derive(serde::Serialize)]
pub struct UiFontFile {
    family: String,
    base64: String,
}

fn base64(data: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((n >> 6) & 63) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(n & 63) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

/// The UI face the webview actually draws, so PDF text can use the same file.
#[tauri::command]
pub fn read_ui_font() -> Option<UiFontFile> {
    const CANDIDATES: &[(&str, &str)] = &[
        ("-apple-system", "/System/Library/Fonts/SFNS.ttf"),
        ("Segoe UI", r"C:\Windows\Fonts\segoeui.ttf"),
    ];
    for (family, path) in CANDIDATES {
        if let Ok(bytes) = std::fs::read(path) {
            if !bytes.is_empty() {
                return Some(UiFontFile {
                    family: (*family).to_string(),
                    base64: base64(&bytes),
                });
            }
        }
    }
    None
}

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
