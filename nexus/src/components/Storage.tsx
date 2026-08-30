import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface Breakdown { extension: string; total_bytes: number; file_count: number }
interface LargeFile { path: string; size_bytes: number }

const COLORS = ["#3f8cff", "#3fd67a", "#ffb648", "#ff5c6c", "#a675ff", "#1fb2ff", "#ff4d5e"];

export default function Storage() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [root, setRoot] = useState(".");
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [largest, setLargest] = useState<LargeFile[]>([]);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([
        invoke<Breakdown[]>("analyze_storage", { root }),
        invoke<LargeFile[]>("find_large_files", { root, topN: 12 }),
      ]);
      setBreakdown(b.slice(0, 8));
      setLargest(l);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input value={root} onChange={(e) => setRoot(e.target.value)} style={{ flex: 1 }} />
          <button className="primary" onClick={analyze} disabled={loading}>
            {t("storage.analyze")}
          </button>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={breakdown} dataKey="total_bytes" nameKey="extension" innerRadius={55} outerRadius={95}>
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${(v / 1024 / 1024).toFixed(1)} MB`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {breakdown.map((b, i) => (
            <span key={b.extension} className="badge ok" style={{ background: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length] }}>
              {b.extension} · {b.file_count}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="metric-label" style={{ marginBottom: 10 }}>{t("storage.largest")}</div>
        <table>
          <tbody>
            {largest.map((f) => (
              <tr key={f.path}>
                <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</td>
                <td>{(f.size_bytes / 1024 / 1024).toFixed(1)} MB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
