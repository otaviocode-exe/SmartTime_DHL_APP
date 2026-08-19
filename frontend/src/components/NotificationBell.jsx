import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Bell, Check, CheckCheck } from "lucide-react";

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

const iconOf = (type) => {
  if (type === "aprovada") return "✓";
  if (type === "rejeitada") return "✗";
  return "•";
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = () => {
    api.get("/notifications").then((r) => {
      setItems(r.data.items || []);
      setUnread(r.data.unread || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      // Optimistic mark-all-read
      api.post("/notifications/read-all").then(() => setUnread(0)).catch(() => {});
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        data-testid="notification-bell"
        aria-label="Notificações"
        className="relative p-2 rounded-md hover:bg-slate-100 text-slate-700"
      >
        <Bell size={20} strokeWidth={2} />
        {unread > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -top-0.5 -right-0.5 bg-[#D40511] text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          data-testid="notification-panel"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-slate-200 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="font-heading font-bold text-slate-900 text-sm">Notificações</div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
              {items.length} total
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                <CheckCheck size={24} className="mx-auto mb-2 text-slate-300" />
                Nenhuma notificação
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id} className={`px-4 py-3 ${!n.read ? "bg-[#FFCC00]/10" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-lg leading-none mt-0.5 ${
                          n.type === "aprovada" ? "text-[#15803D]" :
                          n.type === "rejeitada" ? "text-[#D40511]" :
                          "text-slate-500"
                        }`}
                      >
                        {iconOf(n.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{formatTime(n.created_at)}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
