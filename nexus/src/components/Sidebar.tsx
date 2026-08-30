import {
  LayoutDashboard, Bot, Cpu, FolderOpen, HardDrive, Wifi, TerminalSquare,
  Cog, Rocket, ShieldCheck, History, Puzzle, Settings as SettingsIcon,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

const SECTIONS = [
  { id: "overview", icon: LayoutDashboard, key: "nav.overview" },
  { id: "ai", icon: Bot, key: "nav.ai" },
  { id: "processes", icon: Cpu, key: "nav.processes" },
  { id: "files", icon: FolderOpen, key: "nav.files" },
  { id: "storage", icon: HardDrive, key: "nav.storage" },
  { id: "network", icon: Wifi, key: "nav.network" },
  { id: "terminal", icon: TerminalSquare, key: "nav.terminal" },
  { id: "services", icon: Cog, key: "nav.services" },
  { id: "startup", icon: Rocket, key: "nav.startup" },
  { id: "security", icon: ShieldCheck, key: "nav.security" },
  { id: "activity", icon: History, key: "nav.activity" },
  { id: "plugins", icon: Puzzle, key: "nav.plugins" },
  { id: "settings", icon: SettingsIcon, key: "nav.settings" },
];

export default function Sidebar() {
  const { lang, activeSection, setActiveSection } = useAppStore();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-text">
          <div className="name">{translate(lang, "app.name")}</div>
          <div className="tagline">{translate(lang, "app.tagline")}</div>
        </div>
      </div>

      {SECTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.id}
            className={`nav-item ${activeSection === s.id ? "active" : ""}`}
            onClick={() => setActiveSection(s.id)}
          >
            <Icon className="nav-icon" />
            <span>{translate(lang, s.key)}</span>
          </div>
        );
      })}
    </aside>
  );
}
