use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Default)]
pub struct ProjectState {
    roots: HashMap<String, PathBuf>,
}

impl ProjectState {
    pub fn root(&self, window_label: &str) -> Option<&PathBuf> {
        self.roots.get(window_label)
    }

    pub fn set_root(&mut self, window_label: String, root: PathBuf) {
        self.roots.insert(window_label, root);
    }

    pub fn clear(&mut self, window_label: &str) {
        self.roots.remove(window_label);
    }

    pub fn has_any_root(&self) -> bool {
        !self.roots.is_empty()
    }
}

