// Internal terminal bridge. Commands are executed through the OS shell
// and full stdout/stderr/exit-code is returned. Callers on the frontend
// are responsible for showing a confirmation dialog for anything the
// UI classifies as sensitive (delete, format, shutdown, kill, etc.) —
// this backend command itself only executes what it is told, exactly
// like a real terminal would.

use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub success: bool,
}

#[tauri::command]
pub fn run_command(command: String, cwd: Option<String>) -> Result<CommandResult, String> {
    if command.trim().is_empty() {
        return Err("Empty command".into());
    }

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", &command]);
        c
    };

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd.output().map_err(|e| e.to_string())?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
        success: output.status.success(),
    })
}
