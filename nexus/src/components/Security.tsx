import { useEffect, useState } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface SecurityEvent { id: string; level: string; message: string; timestamp: string }

export default function Security() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    invoke<SecurityEvent[]>("list_security_events", { limit: 200 })
      .then(setEvents)
      .catch(() => {});
  }, []);

  return (
    <div className="card">
      <div className="metric-label" style={{ marginBottom: 10 }}>{t("security.events")}</div>
      <table>
        <thead><tr><th>Level</th><th>Message</th><th>Time</th></tr></thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>
                <span className={`badge ${e.level === "critical" ? "err" : e.level === "warning" ? "warn" : "ok"}`}>
                  {e.level}
                </span>
              </td>
              <td>{e.message}</td>
              <td>{new Date(e.timestamp).toLocaleString()}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={3} style={{ color: "var(--text-secondary)" }}>No security events recorded yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
