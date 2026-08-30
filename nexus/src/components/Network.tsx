import { useEffect, useState } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface InterfaceInfo {
  name: string; mac_address: string; total_received: number; total_transmitted: number;
}
interface NetworkSnapshot { interfaces: InterfaceInfo[]; local_ip?: string }
interface LanDevice { ip: string; reachable: boolean }

export default function Network() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [snap, setSnap] = useState<NetworkSnapshot | null>(null);
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        setSnap(await invoke<NetworkSnapshot>("get_network_snapshot"));
      } catch { /* noop */ }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  async function scan() {
    setScanning(true);
    try {
      setDevices(await invoke<LanDevice[]>("scan_local_network"));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <div className="metric-label">Local IP</div>
        <div className="metric-value" style={{ fontSize: 20 }}>{snap?.local_ip ?? "--"}</div>

        <div className="metric-label" style={{ marginTop: 18 }}>{t("network.interfaces")}</div>
        <table>
          <thead><tr><th>Interface</th><th>MAC</th><th>RX</th><th>TX</th></tr></thead>
          <tbody>
            {snap?.interfaces.map((i) => (
              <tr key={i.name}>
                <td>{i.name}</td>
                <td>{i.mac_address}</td>
                <td>{(i.total_received / 1024 / 1024).toFixed(1)} MB</td>
                <td>{(i.total_transmitted / 1024 / 1024).toFixed(1)} MB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="metric-label">{t("network.lan")}</div>
          <button className="primary" onClick={scan} disabled={scanning}>
            {scanning ? "…" : t("storage.analyze")}
          </button>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {devices.map((d) => (
            <span key={d.ip} className="badge ok">{d.ip}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
