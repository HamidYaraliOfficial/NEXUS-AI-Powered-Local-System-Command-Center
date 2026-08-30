import { useEffect, useMemo, useState } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";
import ConfirmDialog from "./ConfirmDialog";

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_usage: number;
  memory_bytes: number;
  status: string;
  user?: string;
  start_time: number;
}

type SortKey = "cpu_usage" | "memory_bytes" | "name" | "pid";

export default function Processes() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cpu_usage");
  const [pendingKill, setPendingKill] = useState<ProcessInfo | null>(null);

  async function refresh() {
    try {
      const list = await invoke<ProcessInfo[]>("list_processes");
      setProcesses(list);
    } catch {
      /* handled centrally */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return processes
      .filter((p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q))
      .sort((a, b) => {
        if (sortKey === "name") return a.name.localeCompare(b.name);
        return (b[sortKey] as number) - (a[sortKey] as number);
      });
  }, [processes, search, sortKey]);

  async function confirmKill() {
    if (!pendingKill) return;
    try {
      await invoke("kill_process", { pid: pendingKill.pid });
      await invoke("log_activity", {
        category: "process",
        message: `Terminated process ${pendingKill.name} (PID ${pendingKill.pid})`,
      });
    } finally {
      setPendingKill(null);
      refresh();
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          placeholder={t("processes.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="cpu_usage">{t("processes.cpu")}</option>
          <option value="memory_bytes">{t("processes.mem")}</option>
          <option value="name">{t("processes.name")}</option>
          <option value="pid">{t("processes.pid")}</option>
        </select>
      </div>

      <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>{t("processes.pid")}</th>
              <th>{t("processes.name")}</th>
              <th>{t("processes.cpu")}</th>
              <th>{t("processes.mem")}</th>
              <th>{t("processes.status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((p) => (
              <tr key={p.pid}>
                <td>{p.pid}</td>
                <td>{p.name}</td>
                <td>{p.cpu_usage.toFixed(1)}%</td>
                <td>{(p.memory_bytes / 1024 / 1024).toFixed(0)} MB</td>
                <td>
                  <span className="badge ok">{p.status}</span>
                </td>
                <td>
                  <button className="danger" onClick={() => setPendingKill(p)}>
                    {t("processes.kill")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingKill && (
        <ConfirmDialog
          title={t("ai.confirm.title")}
          body={`${t("processes.kill")}: ${pendingKill.name} (PID ${pendingKill.pid})`}
          onConfirm={confirmKill}
          onCancel={() => setPendingKill(null)}
        />
      )}
    </div>
  );
}
