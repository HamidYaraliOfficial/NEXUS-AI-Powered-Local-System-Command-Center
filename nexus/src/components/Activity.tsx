import { useEffect, useState } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface ActivityEntry { id: string; category: string; message: string; timestamp: string }

export default function Activity() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const id = setInterval(() => {
      invoke<ActivityEntry[]>("get_activity_log", { limit: 300 }).then(setEntries).catch(() => {});
    }, 2500);
    invoke<ActivityEntry[]>("get_activity_log", { limit: 300 }).then(setEntries).catch(() => {});
    return () => clearInterval(id);
  }, []);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.category === filter);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="metric-label">{t("activity.title")}</div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["all", "file", "process", "network", "security", "ai", "user"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
        {filtered.map((e) => (
          <div key={e.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="badge ok" style={{ marginInlineEnd: 8 }}>{e.category}</span>
            <span style={{ fontSize: 13 }}>{e.message}</span>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
              {new Date(e.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
