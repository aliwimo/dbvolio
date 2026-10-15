use std::{env, fs, path::Path};

const ICON_PATHS: &[&str] = &[
    "icons/icon.icns",
    "icons/icon.png",
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
];

fn main() {
    tauri_build::build();

    // `generate_context!()` embeds the macOS dev dock icon at compile time and does not
    // track icon files as inputs. Write a stamp the library includes so icon updates rebuild.
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let out_dir = env::var("OUT_DIR").expect("OUT_DIR");
    let stamp_path = Path::new(&out_dir).join("app-icon-stamp");

    let mut stamp = String::new();
    for relative in ICON_PATHS {
        let path = manifest_dir.join(relative);
        println!("cargo:rerun-if-changed={}", path.display());
        if path.exists() {
            if let Ok(meta) = fs::metadata(&path) {
                if let Ok(modified) = meta.modified() {
                    stamp.push_str(&format!("{relative}:{modified:?}\n"));
                }
            }
        }
    }

    let iconset_dir = manifest_dir.join("../src/assets/iconset");
    if iconset_dir.is_dir() {
        println!("cargo:rerun-if-changed={}", iconset_dir.display());
        if let Ok(entries) = fs::read_dir(&iconset_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                println!("cargo:rerun-if-changed={}", path.display());
                if path.is_file() {
                    if let Ok(meta) = fs::metadata(&path) {
                        if let Ok(modified) = meta.modified() {
                            stamp.push_str(&format!("iconset/{}:{modified:?}\n", path.display()));
                        }
                    }
                }
            }
        }
    }

    fs::write(&stamp_path, stamp).expect("write app-icon-stamp");
}
