// SQLite-backed persistence for settings, activity log and security events.
// Uses a bundled SQLite (rusqlite "bundled" feature) so no external
// dependency is required on the target machine.

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub struct Database {
    conn: Connection,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ActivityEntry {
    pub id: String,
    pub category: String, // file | process | network | security | ai | user
    pub message: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SecurityEvent {
    pub id: String,
    pub level: String, // info | warning | critical
    pub message: String,
    pub timestamp: String,
}

impl Database {
    pub fn open(path: &Path) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        Ok(Self { conn })
    }

    pub fn migrate(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS activity_log (
                id        TEXT PRIMARY KEY,
                category  TEXT NOT NULL,
                message   TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS security_events (
                id        TEXT PRIMARY KEY,
                level     TEXT NOT NULL,
                message   TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_security_ts ON security_events(timestamp);
            "#,
        )
    }

    pub fn set_setting(&self, key: &str, value: &str) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO settings(key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_all_settings(&self) -> SqlResult<Vec<(String, String)>> {
        let mut stmt = self.conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
        rows.collect()
    }

    pub fn add_activity(&self, entry: &ActivityEntry) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO activity_log(id, category, message, timestamp) VALUES (?1, ?2, ?3, ?4)",
            params![entry.id, entry.category, entry.message, entry.timestamp],
        )?;
        Ok(())
    }

    pub fn get_activity(&self, limit: i64) -> SqlResult<Vec<ActivityEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, category, message, timestamp FROM activity_log
             ORDER BY timestamp DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |r| {
            Ok(ActivityEntry {
                id: r.get(0)?,
                category: r.get(1)?,
                message: r.get(2)?,
                timestamp: r.get(3)?,
            })
        })?;
        rows.collect()
    }

    pub fn add_security_event(&self, event: &SecurityEvent) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO security_events(id, level, message, timestamp) VALUES (?1, ?2, ?3, ?4)",
            params![event.id, event.level, event.message, event.timestamp],
        )?;
        Ok(())
    }

    pub fn get_security_events(&self, limit: i64) -> SqlResult<Vec<SecurityEvent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, level, message, timestamp FROM security_events
             ORDER BY timestamp DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |r| {
            Ok(SecurityEvent {
                id: r.get(0)?,
                level: r.get(1)?,
                message: r.get(2)?,
                timestamp: r.get(3)?,
            })
        })?;
        rows.collect()
    }
}
