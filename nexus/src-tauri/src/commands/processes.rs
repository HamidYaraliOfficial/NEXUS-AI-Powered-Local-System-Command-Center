// Advanced Process Manager: list, search/sort/filter (frontend side),
// terminate, and (where the OS allows) adjust priority.

use serde::Serialize;
use sysinfo::{Pid, ProcessesToUpdate, Signal, System};

#[derive(Serialize, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub status: String,
    pub user: Option<String>,
    pub start_time: u64,
    pub exe_path: Option<String>,
    pub cmd: Vec<String>,
}

#[tauri::command]
pub fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    let mut sys = System::new_all();
    sys.refresh_cpu_all();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let list = sys
        .processes()
        .iter()
        .map(|(pid, p)| ProcessInfo {
            pid: pid.as_u32(),
            name: p.name().to_string_lossy().to_string(),
            cpu_usage: p.cpu_usage(),
            memory_bytes: p.memory(),
            status: format!("{:?}", p.status()),
            user: p.user_id().map(|u| u.to_string()),
            start_time: p.start_time(),
            exe_path: p.exe().map(|e| e.to_string_lossy().to_string()),
            cmd: p
                .cmd()
                .iter()
                .map(|c| c.to_string_lossy().to_string())
                .collect(),
        })
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn kill_process(pid: u32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let target = Pid::from_u32(pid);

    match sys.process(target) {
        Some(process) => {
            let ok = process.kill_with(Signal::Term).unwrap_or_else(|| process.kill());
            Ok(ok)
        }
        None => Err(format!("Process with PID {} was not found", pid)),
    }
}

/// Best-effort priority adjustment. Full "nice" control differs across
/// OSes and is exposed here as a placeholder hook the frontend can call;
/// on platforms where sysinfo doesn't expose a setter, we report that
/// clearly instead of silently pretending it worked.
#[tauri::command]
pub fn set_process_priority(pid: u32, _priority: i32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let target = Pid::from_u32(pid);

    if sys.process(target).is_none() {
        return Err(format!("Process with PID {} was not found", pid));
    }

    Err("Priority adjustment is not supported on this platform build".to_string())
}
