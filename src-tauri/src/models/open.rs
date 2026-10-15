use crate::services::dbml_open::DbmlOpenTarget;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbmlOpenPayload {
    pub project_root: String,
    pub relative_path: String,
}

impl DbmlOpenPayload {
    pub fn from_target(target: &DbmlOpenTarget) -> Self {
        Self {
            project_root: target
                .project_root
                .to_string_lossy()
                .into_owned(),
            relative_path: target.relative_path.clone(),
        }
    }
}
