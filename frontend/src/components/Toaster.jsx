import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(() => {});
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /** toast("Saved") · toast("Couldn't save", "bad") */
  const toast = useCallback(
    (message, tone = "ok") => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === "bad" ? 7000 : 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === "bad" ? AlertCircle : t.tone === "info" ? Info : CheckCircle2;
          return (
            <div key={t.id} className={`toast ${t.tone}`} role={t.tone === "bad" ? "alert" : "status"}>
              <Icon aria-hidden="true" />
              <span className="grow">{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
