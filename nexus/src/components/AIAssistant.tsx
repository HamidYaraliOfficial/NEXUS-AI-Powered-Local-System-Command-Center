import { useState, useRef, useEffect } from "react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface AiToolCall { tool: string; requires_confirmation: boolean }
interface AiResponse { reply: string; tool_call?: AiToolCall; data?: unknown }
interface ChatMsg { role: "user" | "assistant"; text: string; data?: unknown }

export default function AIAssistant() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await invoke<AiResponse>("ai_route_request", { request: q, rootPath: "." });
      setMessages((m) => [...m, { role: "assistant", text: res.reply, data: res.data }]);
      await invoke("log_activity", { category: "ai", message: `AI request: ${q}` });
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ height: "72vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`ai-bubble ${m.role}`}>{m.text}</div>
            {m.data ? (
              <pre
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 11,
                  maxHeight: 200,
                  overflow: "auto",
                  marginBottom: 10,
                }}
              >
                {JSON.stringify(m.data, null, 2).slice(0, 3000)}
              </pre>
            ) : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <input
        style={{ marginTop: 10 }}
        placeholder={t("ai.placeholder")}
        value={input}
        disabled={busy}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
      />
    </div>
  );
}
