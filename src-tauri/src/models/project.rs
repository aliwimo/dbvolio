use std::path::PathBuf;

#[derive(Default)]
pub struct ProjectState {
    pub root: Option<PathBuf>,
}

impl ProjectState {
    pub fn root(&self) -> Option<&PathBuf> {
        self.root.as_ref()
    }

    pub fn set_root(&mut self, root: PathBuf) {
        self.root = Some(root);
    }

    pub fn clear(&mut self) {
        self.root = None;
    }
}
