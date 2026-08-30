// Network Center: interfaces, traffic counters, and a best-effort local
// subnet presence scan (ICMP-less TCP connect probes so no raw sockets /
// admin privileges are required).

use serde::Serialize;
use std::net::TcpStream;
use std::time::Duration;
use sysinfo::Networks;

#[derive(Serialize)]
pub struct InterfaceInfo {
    pub name: String,
    pub mac_address: String,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
    pub total_received: u64,
    pub total_transmitted: u64,
}

#[derive(Serialize)]
pub struct NetworkSnapshot {
    pub interfaces: Vec<InterfaceInfo>,
    pub local_ip: Option<String>,
    pub timestamp: String,
}

#[tauri::command]
pub fn get_network_snapshot() -> Result<NetworkSnapshot, String> {
    let networks = Networks::new_with_refreshed_list();

    let interfaces = networks
        .iter()
        .map(|(name, data)| InterfaceInfo {
            name: name.clone(),
            mac_address: data.mac_address().to_string(),
            received_bytes: data.received(),
            transmitted_bytes: data.transmitted(),
            total_received: data.total_received(),
            total_transmitted: data.total_transmitted(),
        })
        .collect();

    let local_ip = local_ip_address::local_ip()
        .ok()
        .map(|ip| ip.to_string());

    Ok(NetworkSnapshot {
        interfaces,
        local_ip,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

#[derive(Serialize)]
pub struct LanDevice {
    pub ip: String,
    pub reachable: bool,
}

/// Probes the /24 subnet of the machine's local IP with short-timeout
/// TCP connects on common ports, purely to detect *reachability* —
/// no packet crafting, no privileged sockets, entirely within normal
/// user permissions.
#[tauri::command]
pub fn scan_local_network() -> Result<Vec<LanDevice>, String> {
    let local_ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let octets = match local_ip {
        std::net::IpAddr::V4(v4) => v4.octets(),
        _ => return Err("IPv6 local network scanning is not supported".into()),
    };

    let mut results = vec![];
    for host in 1..255u8 {
        let candidate = format!("{}.{}.{}.{}:80", octets[0], octets[1], octets[2], host);
        let reachable = TcpStream::connect_timeout(
            &candidate.parse().map_err(|e: std::net::AddrParseError| e.to_string())?,
            Duration::from_millis(60),
        )
        .is_ok();
        if reachable {
            results.push(LanDevice {
                ip: format!("{}.{}.{}.{}", octets[0], octets[1], octets[2], host),
                reachable,
            });
        }
    }
    Ok(results)
}
