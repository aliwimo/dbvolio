use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DbmlOpenTarget {
    pub project_root: PathBuf,
    pub relative_path: String,
}

pub fn resolve_dbml_open_path(path: &Path) -> Result<DbmlOpenTarget, String> {
    if !path.is_file() {
        return Err("Path is not a file".into());
    }
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("dbml") {
        return Err("Only .dbml files can be opened".into());
    }

    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve file path: {e}"))?;
    let parent = canonical
        .parent()
        .ok_or_else(|| "File has no parent directory".to_string())?
        .to_path_buf();
    let relative = canonical
        .strip_prefix(&parent)
        .map_err(|_| "Failed to compute path relative to project folder".to_string())?;
    let relative_path = relative
        .to_str()
        .ok_or_else(|| "Project file path is not valid UTF-8".to_string())?
        .replace('\\', "/");

    Ok(DbmlOpenTarget {
        project_root: parent,
        relative_path,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dbml(name: &str, contents: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("dbvolio-open-test-{stamp}"));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join(name);
        fs::write(&file, contents).unwrap();
        file
    }

    #[test]
    fn resolves_dbml_file_to_parent_project_and_relative_path() {
        let file = temp_dbml("schema.dbml", "Table users { id int }");
        let resolved = resolve_dbml_open_path(&file).unwrap();
        assert_eq!(resolved.relative_path, "schema.dbml");
        assert_eq!(
            resolved.project_root,
            file.parent().unwrap().canonicalize().unwrap()
        );
    }

    #[test]
    fn rejects_non_dbml_extension() {
        let file = temp_dbml("readme.txt", "hello");
        let err = resolve_dbml_open_path(&file).unwrap_err();
        assert!(err.contains(".dbml"));
    }
}
