use crate::services::dbml_open::OpenTarget;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbmlOpenPayload {
    pub project_root: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relative_path: Option<String>,
}

impl DbmlOpenPayload {
    pub fn from_target(target: &OpenTarget) -> Self {
        match target {
            OpenTarget::Folder(root) => Self {
                project_root: root.to_string_lossy().into_owned(),
                relative_path: None,
            },
            OpenTarget::DbmlFile {
                project_root,
                relative_path,
            } => Self {
                project_root: project_root.to_string_lossy().into_owned(),
                relative_path: Some(relative_path.clone()),
            },
        }
    }
}
