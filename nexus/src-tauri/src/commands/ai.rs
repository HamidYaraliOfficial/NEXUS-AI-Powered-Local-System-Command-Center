// AI Assistant tool router.
//
// NEXUS ships with a lightweight LOCAL intent router: it matches the
// user's natural-language request against a set of real system tools
// (the same commands exposed elsewhere in this file tree — process
// list, storage analyzer, duplicate finder, network snapshot, health
// score, etc.), runs the matching tool for real, and returns a
// natural-language summary. No request ever leaves the machine.
//
// The architecture is intentionally provider-agnostic: `ai_route_request`
// is the single seam where a remote or local LLM (e.g. an Ollama
// endpoint) can later be dropped in to replace keyword matching with
// true reasoning — the tool contracts below would not need to change.
// Any operation with a side effect (kill process, delete file, run a
// sensitive shell command) is returned as a *proposal* the frontend
// must render as a confirmation dialog before calling the real command.

use super::{files, network, processes, system};
use serde::Serialize;

#[derive(Serialize)]
pub struct AiToolCall {
    pub tool: String,
    pub requires_confirmation: bool,
}

#[derive(Serialize)]
pub struct AiResponse {
    pub reply: String,
    pub tool_call: Option<AiToolCall>,
    pub data: Option<serde_json::Value>,
}

#[tauri::command]
pub fn ai_route_request(request: String, root_path: Option<String>) -> Result<AiResponse, String> {
    let q = request.to_lowercase();
    let root = root_path.unwrap_or_else(|| ".".to_string());

    // --- Largest files -----------------------------------------------
    if contains_any(&q, &["largest file", "بزرگ‌ترین فایل", "بزرگترین فایل", "最大的文件", "大文件"]) {
        let large = files::find_large_files(root.clone(), 15)?;
        return Ok(AiResponse {
            reply: format!(
                "Scanned {} and found the {} largest files. See the results panel.",
                root,
                large.len()
            ),
            tool_call: Some(AiToolCall {
                tool: "find_large_files".into(),
                requires_confirmation: false,
            }),
            data: Some(serde_json::to_value(large).unwrap()),
        });
    }

    // --- Duplicate files ------------------------------------------------
    if contains_any(&q, &["duplicate", "تکراری", "重复文件", "重复"]) {
        let dups = files::find_duplicate_files(root.clone())?;
        return Ok(AiResponse {
            reply: format!(
                "Found {} groups of duplicate files under {}.",
                dups.len(),
                root
            ),
            tool_call: Some(AiToolCall {
                tool: "find_duplicate_files".into(),
                requires_confirmation: false,
            }),
            data: Some(serde_json::to_value(dups).unwrap()),
        });
    }

    // --- Top RAM-consuming processes ------------------------------------
    if contains_any(&q, &["ram", "memory", "حافظه", "内存"]) && contains_any(&q, &["process", "پردازش", "进程"]) {
        let mut procs = processes::list_processes()?;
        procs.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
        procs.truncate(10);
        return Ok(AiResponse {
            reply: "Here are the top 10 processes by memory usage.".into(),
            tool_call: Some(AiToolCall {
                tool: "list_processes".into(),
                requires_confirmation: false,
            }),
            data: Some(serde_json::to_value(procs).unwrap()),
        });
    }

    // --- Network status --------------------------------------------------
    if contains_any(&q, &["network", "شبکه", "网络"]) {
        let snap = network::get_network_snapshot()?;
        return Ok(AiResponse {
            reply: format!(
                "Network check complete. Local IP: {}. {} interface(s) active.",
                snap.local_ip.clone().unwrap_or_else(|| "unknown".into()),
                snap.interfaces.len()
            ),
            tool_call: Some(AiToolCall {
                tool: "get_network_snapshot".into(),
                requires_confirmation: false,
            }),
            data: Some(serde_json::to_value(snap).unwrap()),
        });
    }

    // --- Storage / folder analysis ---------------------------------------
    if contains_any(&q, &["analyze", "storage", "تحلیل", "فضای", "存储", "分析"]) {
        let breakdown = files::analyze_storage(root.clone())?;
        return Ok(AiResponse {
            reply: format!("Storage analysis of {} complete.", root),
            tool_call: Some(AiToolCall {
                tool: "analyze_storage".into(),
                requires_confirmation: false,
            }),
            data: Some(serde_json::to_value(breakdown).unwrap()),
        });
    }

    // --- Overall system / health status ----------------------------------
    if contains_any(&q, &["system status", "وضعیت کلی", "وضعیت سیستم", "系统状态", "health"]) {
        let health = system::get_health_score()?;
        return Ok(AiResponse {
            reply: "Here is the current system health summary.".into(),
            tool_call: Some(AiToolCall {
                tool: "get_health_score".into(),
                requires_confirmation: false,
            }),
            data: Some(health),
        });
    }

    Ok(AiResponse {
        reply: "I can help with: largest files, duplicate files, top RAM processes, network status, storage analysis, or overall system health. Try rephrasing your request around one of these.".into(),
        tool_call: None,
        data: None,
    })
}

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| haystack.contains(n))
}
