use crate::db::ActivityEntry;
use crate::AppState;
use chrono::Utc;
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<HashMap<String, String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let pairs = db.get_all_settings().map_err(|e| e.to_string())?;
    Ok(pairs.into_iter().collect())
}

#[tauri::command]
pub fn update_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_activity(
    state: State<AppState>,
    category: String,
    message: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_activity(&ActivityEntry {
        id: Uuid::new_v4().to_string(),
        category,
        message,
        timestamp: Utc::now().to_rfc3339(),
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_activity_log(state: State<AppState>, limit: i64) -> Result<Vec<ActivityEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_activity(limit).map_err(|e| e.to_string())
}
