// Real system telemetry (CPU / RAM / Disk / Uptime / Battery-adjacent info).
// All values are read live via `sysinfo` — nothing here is mocked.

use serde::Serialize;
use sysinfo::{Disks, System};

#[derive(Serialize)]
pub struct CpuCore {
    pub name: String,
    pub usage: f32,
}

#[derive(Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub file_system: String,
    pub is_removable: bool,
}

#[derive(Serialize)]
pub struct SystemSnapshot {
    pub cpu_global_usage: f32,
    pub cpu_cores: Vec<CpuCore>,
    pub total_memory: u64,
    pub used_memory: u64,
    pub total_swap: u64,
    pub used_swap: u64,
    pub disks: Vec<DiskInfo>,
    pub uptime_seconds: u64,
    pub load_average: (f64, f64, f64),
    pub process_count: usize,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct StaticSystemInfo {
    pub host_name: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub cpu_brand: String,
    pub cpu_physical_cores: usize,
    pub total_memory: u64,
}

#[tauri::command]
pub fn get_system_snapshot() -> Result<SystemSnapshot, String> {
    let mut sys = System::new_all();
    sys.refresh_cpu_all();
    // sysinfo recommends a short delay between two refreshes for accurate %.
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_all();
    sys.refresh_memory();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let cpu_cores = sys
        .cpus()
        .iter()
        .enumerate()
        .map(|(i, c)| CpuCore {
            name: format!("Core {}", i),
            usage: c.cpu_usage(),
        })
        .collect::<Vec<_>>();

    let cpu_global_usage = if cpu_cores.is_empty() {
        0.0
    } else {
        cpu_cores.iter().map(|c| c.usage).sum::<f32>() / cpu_cores.len() as f32
    };

    let disks = Disks::new_with_refreshed_list()
        .iter()
        .map(|d| DiskInfo {
            name: d.name().to_string_lossy().to_string(),
            mount_point: d.mount_point().to_string_lossy().to_string(),
            total_bytes: d.total_space(),
            available_bytes: d.available_space(),
            file_system: d.file_system().to_string_lossy().to_string(),
            is_removable: d.is_removable(),
        })
        .collect();

    let load = System::load_average();

    Ok(SystemSnapshot {
        cpu_global_usage,
        cpu_cores,
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        total_swap: sys.total_swap(),
        used_swap: sys.used_swap(),
        disks,
        uptime_seconds: System::uptime(),
        load_average: (load.one, load.five, load.fifteen),
        process_count: sys.processes().len(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn get_static_system_info() -> Result<StaticSystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_cpu_all();

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".into());

    Ok(StaticSystemInfo {
        host_name: System::host_name().unwrap_or_else(|| "unknown-host".into()),
        os_name: System::name().unwrap_or_else(|| "Unknown OS".into()),
        os_version: System::os_version().unwrap_or_else(|| "unknown".into()),
        kernel_version: System::kernel_version().unwrap_or_else(|| "unknown".into()),
        cpu_brand,
        cpu_physical_cores: System::physical_core_count().unwrap_or(0),
        total_memory: sys.total_memory(),
    })
}

/// Very simple heuristic health score (0-100) derived from live metrics.
/// Weighted: CPU pressure 35%, memory pressure 35%, disk pressure 30%.
#[tauri::command]
pub fn get_health_score() -> Result<serde_json::Value, String> {
    let snapshot = get_system_snapshot()?;

    let mem_pct = if snapshot.total_memory > 0 {
        snapshot.used_memory as f64 / snapshot.total_memory as f64 * 100.0
    } else {
        0.0
    };

    let disk_pct = if !snapshot.disks.is_empty() {
        let total: u64 = snapshot.disks.iter().map(|d| d.total_bytes).sum();
        let avail: u64 = snapshot.disks.iter().map(|d| d.available_bytes).sum();
        if total > 0 {
            (1.0 - (avail as f64 / total as f64)) * 100.0
        } else {
            0.0
        }
    } else {
        0.0
    };

    let cpu_score = (100.0 - snapshot.cpu_global_usage as f64).max(0.0);
    let mem_score = (100.0 - mem_pct).max(0.0);
    let disk_score = (100.0 - disk_pct).max(0.0);

    let overall = cpu_score * 0.35 + mem_score * 0.35 + disk_score * 0.30;

    let mut issues: Vec<String> = vec![];
    if snapshot.cpu_global_usage > 85.0 {
        issues.push("high_cpu_usage".into());
    }
    if mem_pct > 85.0 {
        issues.push("high_memory_pressure".into());
    }
    if disk_pct > 90.0 {
        issues.push("low_disk_space".into());
    }

    Ok(serde_json::json!({
        "overall_score": overall.round(),
        "cpu_score": cpu_score.round(),
        "memory_score": mem_score.round(),
        "disk_score": disk_score.round(),
        "issues": issues,
    }))
}
