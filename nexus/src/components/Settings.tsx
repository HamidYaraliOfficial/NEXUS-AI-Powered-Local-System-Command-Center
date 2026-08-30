import { useEffect, useState } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore, computeAvailability, ThemeName } from "../store/useAppStore";
import { translate, Lang, languageNames, direction } from "../i18n/i18n";

const THEMES: { id: ThemeName; key: string }[] = [
  { id: "win11-dark", key: "settings.theme.dark" },
  { id: "win11-light", key: "settings.theme.light" },
  { id: "win-default", key: "settings.theme.default" },
  { id: "crimson", key: "settings.theme.red" },
  { id: "azure", key: "settings.theme.blue" },
];

const DAY_LABELS: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fa: ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};

function formatDuration(ms: number, lang: Lang) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (lang === "fa") return `${h} ساعت و ${m} دقیقه`;
  if (lang === "zh") return `${h} 小时 ${m} 分钟`;
  return `${h}h ${m}m`;
}

export default function Settings() {
  const { lang, setLang, theme, setTheme, availability, setAvailability } = useAppStore();
  const t = (k: string) => translate(lang, k);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", direction[lang]);
  }, [theme, lang]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    invoke("update_setting", { key: "theme", value: theme }).catch(() => {});
  }, [theme]);
  useEffect(() => {
    invoke("update_setting", { key: "lang", value: lang }).catch(() => {});
  }, [lang]);

  const { isOpen, msUntilNextOpen } = computeAvailability(availability, now);

  function toggleDay(d: number) {
    const days = availability.activeDays.includes(d)
      ? availability.activeDays.filter((x) => x !== d)
      : [...availability.activeDays, d].sort();
    setAvailability({ activeDays: days });
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <div className="metric-label" style={{ marginBottom: 10 }}>{t("settings.appearance")}</div>
        <div className="metric-label">{t("settings.theme")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 18px" }}>
          {THEMES.map((th) => (
            <button
              key={th.id}
              className={theme === th.id ? "primary" : ""}
              onClick={() => setTheme(th.id)}
            >
              {t(th.key)}
            </button>
          ))}
        </div>

        <div className="metric-label">{t("settings.language")}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {(Object.keys(languageNames) as Lang[]).map((l) => (
            <button key={l} className={lang === l ? "primary" : ""} onClick={() => setLang(l)}>
              {languageNames[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="metric-label" style={{ marginBottom: 4 }}>{t("settings.hours.title")}</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12.5, marginBottom: 14 }}>
          {t("settings.hours.desc")}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={availability.enabled}
            onChange={(e) => setAvailability({ enabled: e.target.checked })}
          />
          {t("settings.hours.title")}
        </label>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="metric-label">{t("settings.hours.open")}</div>
            <input
              type="time"
              value={availability.openTime}
              onChange={(e) => setAvailability({ openTime: e.target.value })}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="metric-label">{t("settings.hours.close")}</div>
            <input
              type="time"
              value={availability.closeTime}
              onChange={(e) => setAvailability({ closeTime: e.target.value })}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>
        </div>

        <div className="metric-label" style={{ marginBottom: 8 }}>{t("settings.hours.days")}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {DAY_LABELS[lang].map((label, i) => (
            <button
              key={i}
              className={availability.activeDays.includes(i) ? "primary" : ""}
              onClick={() => toggleDay(i)}
              style={{ padding: "6px 10px" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          {availability.enabled ? (
            isOpen ? (
              <span className="badge ok">{t("settings.hours.status.open")}</span>
            ) : (
              <div>
                <span className="badge err">{t("settings.hours.status.closed")}</span>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {t("settings.hours.nextIn")}: <strong>{formatDuration(msUntilNextOpen, lang)}</strong>
                </div>
              </div>
            )
          ) : (
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {t("settings.hours.title")} — off
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
