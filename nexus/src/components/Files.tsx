import { useEffect, useState } from "react";
import { Folder, File as FileIcon, ArrowUp } from "lucide-react";
import { invoke } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";
import ConfirmDialog from "./ConfirmDialog";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  modified?: number;
  extension?: string;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function Files() {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  const [path, setPath] = useState(".");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<FileEntry | null>(null);

  async function load(p: string) {
    try {
      const list = await invoke<FileEntry[]>("list_directory", { path: p });
      setEntries(list);
      setPath(p);
    } catch {
      /* invalid path — keep previous listing */
    }
  }

  useEffect(() => {
    load(".");
  }, []);

  async function goUp() {
    const parent = path.split(/[\\/]/).slice(0, -1).join("/") || "/";
    load(parent);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await invoke("delete_path", { path: toDelete.path, secure: false });
      await invoke("log_activity", { category: "file", message: `Deleted ${toDelete.path}` });
    } finally {
      setToDelete(null);
      load(path);
    }
  }

  const filtered = entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <button onClick={goUp}><ArrowUp size={14} /></button>
        <input value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(path)} style={{ flex: 1 }} />
        <input placeholder={t("files.search")} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
      </div>

      <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{t("processes.name")}</th>
              <th>Size</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.path}>
                <td>{e.is_dir ? <Folder size={16} /> : <FileIcon size={16} />}</td>
                <td
                  style={{ cursor: e.is_dir ? "pointer" : "default" }}
                  onClick={() => e.is_dir && load(e.path)}
                >
                  {e.name}
                </td>
                <td>{e.is_dir ? "—" : formatSize(e.size_bytes)}</td>
                <td>{e.extension ?? (e.is_dir ? "folder" : "file")}</td>
                <td>
                  <button className="danger" onClick={() => setToDelete(e)}>
                    {t("files.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toDelete && (
        <ConfirmDialog
          title={t("ai.confirm.title")}
          body={`${t("files.delete")}: ${toDelete.path}`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
