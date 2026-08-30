// Advanced File Explorer + Storage Analyzer.
// Directory listing, metadata, copy/move/rename/delete, hashing,
// large-file discovery and duplicate detection (by size+hash).

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub modified: Option<u64>,
    pub created: Option<u64>,
    pub extension: Option<String>,
    pub readonly: bool,
}

fn to_unix(t: std::io::Result<std::time::SystemTime>) -> Option<u64> {
    t.ok()?.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs())
}

fn entry_from_path(path: &Path) -> Result<FileEntry, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    Ok(FileEntry {
        name: path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        path: path.to_string_lossy().to_string(),
        is_dir: meta.is_dir(),
        size_bytes: if meta.is_dir() { 0 } else { meta.len() },
        modified: to_unix(meta.modified()),
        created: to_unix(meta.created()),
        extension: path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase()),
        readonly: meta.permissions().readonly(),
    })
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("{} is not a directory", path));
    }
    let mut entries = vec![];
    for item in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        if let Ok(fe) = entry_from_path(&item.path()) {
            entries.push(fe);
        }
    }
    Ok(entries)
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<FileEntry, String> {
    entry_from_path(Path::new(&path))
}

#[tauri::command]
pub fn delete_path(path: String, secure: bool) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        if secure {
            // Best-effort secure delete: overwrite bytes before unlinking.
            if let Ok(meta) = fs::metadata(p) {
                let len = meta.len();
                if let Ok(mut f) = fs::OpenOptions::new().write(true).open(p) {
                    use std::io::{Seek, SeekFrom, Write};
                    let zeros = vec![0u8; 64 * 1024];
                    let mut remaining = len;
                    let _ = f.seek(SeekFrom::Start(0));
                    while remaining > 0 {
                        let chunk = remaining.min(zeros.len() as u64) as usize;
                        let _ = f.write_all(&zeros[..chunk]);
                        remaining -= chunk as u64;
                    }
                    let _ = f.flush();
                }
            }
        }
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn copy_path(from: String, to: String) -> Result<(), String> {
    let src = Path::new(&from);
    if src.is_dir() {
        copy_dir_recursive(src, Path::new(&to)).map_err(|e| e.to_string())
    } else {
        fs::copy(&from, &to).map(|_| ()).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn move_path(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to).or_else(|_| {
        copy_path(from.clone(), to.clone())?;
        delete_path(from, false)
    })
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let target = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn hash_file(path: String) -> Result<String, String> {
    let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

#[derive(Serialize)]
pub struct LargeFile {
    pub path: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub fn find_large_files(root: String, top_n: usize) -> Result<Vec<LargeFile>, String> {
    let mut files: Vec<LargeFile> = WalkDir::new(&root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| {
            e.metadata().ok().map(|m| LargeFile {
                path: e.path().to_string_lossy().to_string(),
                size_bytes: m.len(),
            })
        })
        .collect();
    files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    files.truncate(top_n);
    Ok(files)
}

#[derive(Serialize)]
pub struct DuplicateGroup {
    pub hash: String,
    pub size_bytes: u64,
    pub paths: Vec<String>,
}

/// Groups files first by size (cheap), then hashes only the candidates
/// that share a size, which keeps large scans fast.
#[tauri::command]
pub fn find_duplicate_files(root: String) -> Result<Vec<DuplicateGroup>, String> {
    let mut by_size: HashMap<u64, Vec<String>> = HashMap::new();

    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                if meta.len() > 0 {
                    by_size
                        .entry(meta.len())
                        .or_default()
                        .push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    let mut groups = vec![];
    for (size, paths) in by_size.into_iter().filter(|(_, p)| p.len() > 1) {
        let mut by_hash: HashMap<String, Vec<String>> = HashMap::new();
        for p in paths {
            if let Ok(h) = hash_file(p.clone()) {
                by_hash.entry(h).or_default().push(p);
            }
        }
        for (hash, group_paths) in by_hash.into_iter().filter(|(_, p)| p.len() > 1) {
            groups.push(DuplicateGroup {
                hash,
                size_bytes: size,
                paths: group_paths,
            });
        }
    }
    Ok(groups)
}

#[derive(Serialize)]
pub struct StorageBreakdown {
    pub extension: String,
    pub total_bytes: u64,
    pub file_count: u64,
}

#[tauri::command]
pub fn analyze_storage(root: String) -> Result<Vec<StorageBreakdown>, String> {
    let mut map: HashMap<String, (u64, u64)> = HashMap::new();

    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let ext = entry
                .path()
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_else(|| "(no extension)".to_string());
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let slot = map.entry(ext).or_insert((0, 0));
            slot.0 += size;
            slot.1 += 1;
        }
    }

    let mut result: Vec<StorageBreakdown> = map
        .into_iter()
        .map(|(extension, (total_bytes, file_count))| StorageBreakdown {
            extension,
            total_bytes,
            file_count,
        })
        .collect();
    result.sort_by(|a, b| b.total_bytes.cmp(&a.total_bytes));
    Ok(result)
}
