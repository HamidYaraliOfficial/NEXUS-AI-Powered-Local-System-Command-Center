import { useAppStore } from "../store/useAppStore";
import { translate } from "../i18n/i18n";

interface Props {
  title: string;
  body: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, body, onConfirm, onCancel }: Props) {
  const { lang } = useAppStore();
  const t = (k: string) => translate(lang, k);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>{body}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onCancel}>{t("confirm.no")}</button>
          <button className="danger" onClick={onConfirm}>{t("confirm.yes")}</button>
        </div>
      </div>
    </div>
  );
}
