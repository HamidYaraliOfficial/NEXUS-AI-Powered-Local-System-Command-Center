import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

const ACTIONS = [
  "overview", "ai", "processes", "files", "storage", "network",
  "terminal", "services", "startup", "security", "activity", "plugins", "settings",
];

export default function CommandPalette() {
  const { lang, commandPaletteOpen, toggleCommandPalette, setActiveSection } = useAppStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape") toggleCommandPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommandPalette]);

  if (!commandPaletteOpen) return null;

  const filtered = ACTIONS.filter((a) =>
    translate(lang, `nav.${a}`).toLowerCase().includes(query.toLowerCase())
  );

  function choose(id: string) {
    setActiveSection(id);
    toggleCommandPalette(false);
    setQuery("");
    setSelected(0);
  }

  return (
    <div className="palette-backdrop" onClick={() => toggleCommandPalette(false)}>
      <div className="palette-box" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="palette-input"
          placeholder={translate(lang, "command.palette.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 1, filtered.length - 1));
            if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 1, 0));
            if (e.key === "Enter" && filtered[selected]) choose(filtered[selected]);
          }}
        />
        <div className="palette-results">
          {filtered.map((a, i) => (
            <div
              key={a}
              className={`palette-item ${i === selected ? "selected" : ""}`}
              onClick={() => choose(a)}
            >
              {translate(lang, `nav.${a}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
