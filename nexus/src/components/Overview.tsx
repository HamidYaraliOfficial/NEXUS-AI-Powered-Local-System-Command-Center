import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface SystemSnapshot {
  cpu_global_usage: number;
  cpu_cores: { name: string; usage: number }[];
  total_memory: number;
  used_memory: number;
  disks: { name: string; mount_point: string; total_bytes: number; available_bytes: number }[];
  uptime_seconds: number;
  process_count: number;
}

interface HealthScore {
  overall_score: number;
  cpu_score: number;
  memory_score: number;
  disk_score: number;
  issues: string[];
}

function bytesToGB(bytes: number) {
  return (bytes / 1024 / 1024 / 1024).toFixed(1);
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Overview() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [cpuHistory, setCpuHistory] = useState<{ t: number; usage: number }[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const snap = await invoke<SystemSnapshot>("get_system_snapshot");
        const h = await invoke<HealthScore>("get_health_score");
        if (cancelled) return;
        setSnapshot(snap);
        setHealth(h);
        setCpuHistory((prev) => [...prev.slice(-29), { t: Date.now(), usage: snap.cpu_global_usage }]);
      } catch (e) {
        // surfaced in console by lib/tauri; keep UI resilient
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const memPct = snapshot ? (snapshot.used_memory / snapshot.total_memory) * 100 : 0;

  return (
    <div>
      <div className="grid grid-metrics">
        <div className="card">
          <div className="metric-label">{t("overview.cpu")}</div>
          <div className="metric-value">{snapshot ? snapshot.cpu_global_usage.toFixed(0) : "--"}%</div>
          <div style={{ height: 60, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} labelFormatter={() => ""} />
                <Area type="monotone" dataKey="usage" stroke="var(--accent)" fill="url(#cpuGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="metric-label">{t("overview.ram")}</div>
          <div className="metric-value">{memPct.toFixed(0)}%</div>
          <div className="metric-sub">
            {snapshot ? `${bytesToGB(snapshot.used_memory)} / ${bytesToGB(snapshot.total_memory)} GB` : "--"}
          </div>
        </div>

        <div className="card">
          <div className="metric-label">{t("overview.disk")}</div>
          {snapshot?.disks.slice(0, 1).map((d) => (
            <div key={d.mount_point}>
              <div className="metric-value">
                {(((d.total_bytes - d.available_bytes) / d.total_bytes) * 100 || 0).toFixed(0)}%
              </div>
              <div className="metric-sub">
                {bytesToGB(d.total_bytes - d.available_bytes)} / {bytesToGB(d.total_bytes)} GB — {d.mount_point}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="metric-label">{t("overview.uptime")}</div>
          <div className="metric-value" style={{ fontSize: 22 }}>
            {snapshot ? formatUptime(snapshot.uptime_seconds) : "--"}
          </div>
          <div className="metric-sub">
            {t("overview.processes")}: {snapshot?.process_count ?? "--"}
          </div>
        </div>

        <div className="card">
          <div className="metric-label">{t("overview.health")}</div>
          <div className="metric-value">{health ? Math.round(health.overall_score) : "--"}</div>
          <div className="metric-sub">
            {health && health.issues.length > 0
              ? health.issues.join(", ")
              : health
              ? "All systems nominal"
              : "--"}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="metric-label" style={{ marginBottom: 10 }}>Cores</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {snapshot?.cpu_cores.map((c) => (
            <div
              key={c.name}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "var(--bg-elevated)",
                fontSize: 12,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {c.name}: {c.usage.toFixed(0)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
