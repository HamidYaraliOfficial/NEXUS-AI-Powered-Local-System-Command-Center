// Security Center: append-only event log (kept in SQLite, never plain
// secrets — NEXUS does not store passwords or tokens anywhere).

use crate::db::SecurityEvent;
use crate::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn log_security_event(
    state: State<AppState>,
    level: String,
    message: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_security_event(&SecurityEvent {
        id: Uuid::new_v4().to_string(),
        level,
        message,
        timestamp: Utc::now().to_rfc3339(),
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_security_events(
    state: State<AppState>,
    limit: i64,
) -> Result<Vec<SecurityEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_security_events(limit).map_err(|e| e.to_string())
}
