import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Overview from "./components/Overview";
import Processes from "./components/Processes";
import Files from "./components/Files";
import Storage from "./components/Storage";
import Network from "./components/Network";
import Terminal from "./components/Terminal";
import AIAssistant from "./components/AIAssistant";
import Settings from "./components/Settings";
import Security from "./components/Security";
import Activity from "./components/Activity";
import CommandPalette from "./components/CommandPalette";
import { Services, Startup, Plugins } from "./components/MiscPanels";
import { useAppStore } from "./store/useAppStore";
import { translate, direction } from "./i18n/i18n";

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  overview: Overview,
  ai: AIAssistant,
  processes: Processes,
  files: Files,
  storage: Storage,
  network: Network,
  terminal: Terminal,
  services: Services,
  startup: Startup,
  security: Security,
  activity: Activity,
  plugins: Plugins,
  settings: Settings,
};

export default function App() {
  const { lang, theme, activeSection } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", direction[lang]);
  }, [theme, lang]);

  const ActiveComponent = SECTION_COMPONENTS[activeSection] ?? Overview;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {translate(lang, `nav.${activeSection}`)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ctrl+K</div>
        </div>
        <div className="content-scroll">
          <ActiveComponent />
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
