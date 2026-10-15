use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PathGuardError {
    InvalidPath,
    AbsoluteNotAllowed,
    TraversalNotAllowed,
    OutsideProjectRoot,
    RootNotSet,
}

impl std::fmt::Display for PathGuardError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PathGuardError::InvalidPath => write!(f, "Invalid path"),
            PathGuardError::AbsoluteNotAllowed => write!(f, "Path must be relative to project root"),
            PathGuardError::TraversalNotAllowed => write!(f, "Path traversal is not allowed"),
            PathGuardError::OutsideProjectRoot => write!(f, "Path is outside project root"),
            PathGuardError::RootNotSet => write!(f, "No project root selected"),
        }
    }
}

impl PathGuardError {
    pub fn message(&self) -> String {
        self.to_string()
    }
}

/// Validates `relative` against `root` and returns the resolved path (may not exist yet).
pub fn resolve_path(root: &Path, relative: &str) -> Result<PathBuf, PathGuardError> {
    if relative.is_empty() || relative.contains('\0') {
        return Err(PathGuardError::InvalidPath);
    }

    let rel = Path::new(relative);
    if rel.is_absolute() {
        return Err(PathGuardError::AbsoluteNotAllowed);
    }

    for component in rel.components() {
        if matches!(component, Component::ParentDir) {
            return Err(PathGuardError::TraversalNotAllowed);
        }
    }

    let canonical_root = root
        .canonicalize()
        .map_err(|_| PathGuardError::InvalidPath)?;

    let joined = canonical_root.join(rel);

    if joined.exists() {
        let canonical = joined
            .canonicalize()
            .map_err(|_| PathGuardError::InvalidPath)?;
        if !canonical.starts_with(&canonical_root) {
            return Err(PathGuardError::OutsideProjectRoot);
        }
        return Ok(canonical);
    }

    let parent = joined
        .parent()
        .ok_or(PathGuardError::InvalidPath)?;
    let canonical_parent = if parent.exists() {
        parent
            .canonicalize()
            .map_err(|_| PathGuardError::InvalidPath)?
    } else {
        let mut current = canonical_root.clone();
        for component in rel.parent().unwrap_or(Path::new("")).components() {
            match component {
                Component::Normal(name) => current.push(name),
                Component::CurDir => {}
                Component::ParentDir => return Err(PathGuardError::TraversalNotAllowed),
                _ => return Err(PathGuardError::InvalidPath),
            }
        }
        if !current.starts_with(&canonical_root) {
            return Err(PathGuardError::OutsideProjectRoot);
        }
        current
    };

    if !canonical_parent.starts_with(&canonical_root) {
        return Err(PathGuardError::OutsideProjectRoot);
    }

    Ok(canonical_parent.join(
        rel.file_name()
            .ok_or(PathGuardError::InvalidPath)?,
    ))
}

pub fn require_root(state: &crate::models::project::ProjectState) -> Result<&PathBuf, PathGuardError> {
    state.root().ok_or(PathGuardError::RootNotSet)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;

    #[test]
    fn rejects_parent_dir() {
        let dir = std::env::temp_dir().join("dbvolio_path_guard");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let err = resolve_path(&dir, "../etc/passwd").unwrap_err();
        assert_eq!(err, PathGuardError::TraversalNotAllowed);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn allows_nested_file() {
        let dir = std::env::temp_dir().join("dbvolio_path_guard_nested");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("tables")).unwrap();
        let file = dir.join("tables/users.dbml");
        let mut f = fs::File::create(&file).unwrap();
        writeln!(f, "Table users {{ id int }}").unwrap();

        let resolved = resolve_path(&dir, "tables/users.dbml").unwrap();
        assert_eq!(resolved, file.canonicalize().unwrap());
        let _ = fs::remove_dir_all(&dir);
    }
}
