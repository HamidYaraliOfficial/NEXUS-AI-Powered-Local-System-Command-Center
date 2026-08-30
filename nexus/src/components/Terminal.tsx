import { useState, useRef, useEffect } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";
import ConfirmDialog from "./ConfirmDialog";

interface CommandResult { stdout: string; stderr: string; exit_code?: number; success: boolean }

const SENSITIVE_PATTERNS = [/rm\s+-rf/i, /del\s+\/s/i, /format/i, /shutdown/i, /reg\s+delete/i, /diskpart/i];

interface Line { type: "cmd" | "out" | "err"; text: string }

export default function Terminal() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewRef.current?.scrollTo({ top: viewRef.current.scrollHeight });
  }, [lines]);

  async function execute(cmd: string) {
    setLines((l) => [...l, { type: "cmd", text: `> ${cmd}` }]);
    try {
      const res = await invoke<CommandResult>("run_command", { command: cmd, cwd: null });
      if (res.stdout) setLines((l) => [...l, { type: "out", text: res.stdout }]);
      if (res.stderr) setLines((l) => [...l, { type: "err", text: res.stderr }]);
      await invoke("log_activity", { category: "user", message: `Ran command: ${cmd}` });
    } catch (e) {
      setLines((l) => [...l, { type: "err", text: String(e) }]);
    }
  }

  function onSubmit() {
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    if (SENSITIVE_PATTERNS.some((p) => p.test(cmd))) {
      setPending(cmd);
    } else {
      execute(cmd);
    }
  }

  return (
    <div className="card" style={{ height: "72vh", display: "flex", flexDirection: "column" }}>
      <div className="terminal-view" ref={viewRef}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.type === "err" ? "#ff8a8a" : l.type === "cmd" ? "#7fd9ff" : undefined }}>
            {l.text}
          </div>
        ))}
      </div>
      <input
        style={{ marginTop: 10 }}
        placeholder={t("terminal.placeholder")}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      />
      {pending && (
        <ConfirmDialog
          title={t("ai.confirm.title")}
          body={pending}
          onConfirm={() => {
            const cmd = pending;
            setPending(null);
            execute(cmd);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
