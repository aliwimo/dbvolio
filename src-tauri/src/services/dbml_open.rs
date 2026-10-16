use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OpenTarget {
    Folder(PathBuf),
    DbmlFile {
        project_root: PathBuf,
        relative_path: String,
    },
}

pub fn resolve_open_path(path: &Path) -> Result<OpenTarget, String> {
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path: {e}"))?;

    if canonical.is_dir() {
        return Ok(OpenTarget::Folder(canonical));
    }

    if !canonical.is_file() {
        return Err("Path is not a file or directory".into());
    }

    let extension = canonical
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("dbml") {
        return Err("Only .dbml files can be opened".into());
    }

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

    Ok(OpenTarget::DbmlFile {
        project_root: parent,
        relative_path,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(prefix: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("{prefix}-{stamp}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn temp_dbml(dir: &Path, name: &str, contents: &str) -> PathBuf {
        let file = dir.join(name);
        fs::write(&file, contents).unwrap();
        file
    }

    #[test]
    fn resolves_dbml_file_to_parent_project_and_relative_path() {
        let dir = temp_dir("dbvolio-open-test");
        let file = temp_dbml(&dir, "schema.dbml", "Table users { id int }");
        let resolved = resolve_open_path(&file).unwrap();
        assert_eq!(
            resolved,
            OpenTarget::DbmlFile {
                project_root: dir.canonicalize().unwrap(),
                relative_path: "schema.dbml".into(),
            }
        );
    }

    #[test]
    fn resolves_project_folder() {
        let dir = temp_dir("dbvolio-open-folder");
        temp_dbml(&dir, "main.dbml", "Table users { id int }");
        let resolved = resolve_open_path(&dir).unwrap();
        assert_eq!(resolved, OpenTarget::Folder(dir.canonicalize().unwrap()));
    }

    #[test]
    fn rejects_non_dbml_extension() {
        let dir = temp_dir("dbvolio-open-reject");
        let file = temp_dbml(&dir, "readme.txt", "hello");
        let err = resolve_open_path(&file).unwrap_err();
        assert!(err.contains(".dbml"));
    }
}
