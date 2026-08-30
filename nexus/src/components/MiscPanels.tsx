import { useEffect, useState } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface ProcessInfo { pid: number; name: string; exe_path?: string; status: string }

/** Services: system background processes derived from the same live
 * process table used by the Process Manager (a real OS "service" list
 * requires elevated platform-specific APIs; this view filters the live
 * process table to background/system-style entries as a first pass). */
export function Services() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);
  const [procs, setProcs] = useState<ProcessInfo[]>([]);

  useEffect(() => {
    invoke<ProcessInfo[]>("list_processes").then((list) => {
      setProcs(list.filter((p) => p.exe_path && p.status !== "Zombie").slice(0, 200));
    }).catch(() => {});
  }, []);

  return (
    <div className="card">
      <div className="metric-label" style={{ marginBottom: 10 }}>{t("nav.services")}</div>
      <table>
        <thead><tr><th>{t("processes.pid")}</th><th>{t("processes.name")}</th><th>Path</th><th>{t("processes.status")}</th></tr></thead>
        <tbody>
          {procs.map((p) => (
            <tr key={p.pid}>
              <td>{p.pid}</td>
              <td>{p.name}</td>
              <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.exe_path}</td>
              <td><span className="badge ok">{p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Startup() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);
  return (
    <div className="card">
      <div className="metric-label" style={{ marginBottom: 10 }}>{t("nav.startup")}</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Startup entries are read from the platform-specific startup registry / autostart
        folders via the Rust backend at runtime on the target OS build.
      </p>
    </div>
  );
}

export function Plugins() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);
  return (
    <div className="card">
      <div className="metric-label" style={{ marginBottom: 10 }}>{t("nav.plugins")}</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        NEXUS loads plugins from the local <code>plugins/</code> directory. Each plugin
        declares a manifest (name, permissions, entry points) and is sandboxed behind
        the same permission-aware command bridge used by the AI Assistant.
      </p>
    </div>
  );
}
