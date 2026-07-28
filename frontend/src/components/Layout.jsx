import { useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDevice } from "@/context/DeviceContext";
import api from "@/lib/api";
import {
  LayoutDashboard, FilePlus2, ListTodo, ClipboardList, Users, History,
  Settings, ScrollText, LogOut, Menu, X, MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const gestorNav = [
  { to: "/gestor", icon: LayoutDashboard, label: "Dashboard", short: "Início", end: true, testid: "nav-gestor-dashboard" },
  { to: "/gestor/nova", icon: FilePlus2, label: "Nova Solicitação", short: "Nova", testid: "nav-nova-solicitacao" },
  { to: "/gestor/minhas", icon: ListTodo, label: "Minhas Solicitações", short: "Minhas", testid: "nav-minhas-solicitacoes" },
  { to: "/gestor/configuracoes", icon: Settings, label: "Configurações", short: "Ajustes", testid: "nav-configuracoes-gestor" },
];

const gerenciaNav = [
  { to: "/gerencia", icon: LayoutDashboard, label: "Dashboard", short: "Início", end: true, testid: "nav-gerencia-dashboard" },
  { to: "/gerencia/aprovacoes", icon: ClipboardList, label: "Aprovações", short: "Aprovar", testid: "nav-aprovacoes", badgeKey: "pending" },
  { to: "/gerencia/historico", icon: History, label: "Histórico", short: "Hist.", testid: "nav-historico" },
  { to: "/gerencia/usuarios", icon: Users, label: "Usuários", short: "Users", testid: "nav-usuarios" },
  { to: "/gerencia/configuracoes", icon: Settings, label: "Configurações", short: "Ajustes", testid: "nav-configuracoes" },
  { to: "/gerencia/auditoria", icon: ScrollText, label: "Auditoria", short: "Audit.", testid: "nav-auditoria" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { deviceMode, resetDeviceMode } = useDevice();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === "gestor" ? gestorNav : gerenciaNav;
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (user?.role !== "gerencia" && user?.role !== "admin") return;
    const fetchPending = () => {
      api.get("/requests/stats").then((r) => setPendingCount(r.data.pending)).catch(() => {});
    };
    fetchPending();
    const t = setInterval(fetchPending, 30000);
    return () => clearInterval(t);
  }, [user]);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const changeDevice = () => { resetDeviceMode(); navigate("/device-select"); };

  // Only "notebook" uses the always-visible desktop sidebar.
  // "celular" and "tablet" both use the drawer, but with different container widths (CSS).
  const isCelular = deviceMode === "celular";
  const isTablet = deviceMode === "tablet";
  const isNotebook = deviceMode === "notebook" || !deviceMode;

  const compact = isCelular; // icon-only style for narrow

  const Sidebar = (
    <aside
      data-testid="sidebar"
      className="w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 h-full"
    >
      <div className="px-5 py-5 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="dhl-logo text-white">
            <span className="dhl-logo-mark">DHL</span>
            <span className="text-sm font-semibold tracking-wide text-slate-200">Horas Extras</span>
          </div>
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {user?.role === "gestor" ? "Gestor" : user?.role === "gerencia" ? "Gerência" : "Admin"}
            </div>
            <div className="mt-1 text-sm font-medium truncate" data-testid="sidebar-user-name">{user?.name}</div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
        {(!isNotebook) && (
          <button
            className="text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            data-testid="close-menu-btn"
          >
            <X size={22} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to} to={item.to} end={item.end} data-testid={item.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${
                isActive ? "bg-[#FFCC00] text-slate-900 font-semibold"
                         : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <item.icon size={18} strokeWidth={2} />
            <span className="flex-1">{item.label}</span>
            {item.badgeKey === "pending" && pendingCount > 0 && (
              <span
                data-testid="sidebar-pending-badge"
                className="bg-[#D40511] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
              >
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-1">
        <Button
          variant="ghost"
          onClick={changeDevice}
          data-testid="change-device-btn"
          className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white text-xs"
        >
          <MonitorSmartphone size={16} className="mr-2" />
          Trocar dispositivo ({deviceMode || "auto"})
        </Button>
        <Button
          data-testid="logout-btn" onClick={handleLogout} variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={18} className="mr-2" /> Sair
        </Button>
      </div>
    </aside>
  );

  // BOTTOM TAB BAR (only for CELULAR mode - iOS/Android style)
  const BottomTabs = isCelular && (
    <nav
      data-testid="bottom-tabs"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-200 grid pb-safe z-40"
      style={{ gridTemplateColumns: `repeat(${Math.min(nav.length, 6)}, 1fr)` }}
    >
      {nav.slice(0, 6).map((item) => (
        <NavLink
          key={item.to} to={item.to} end={item.end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors relative ${
              isActive ? "text-[#D40511]" : "text-slate-500"
            }`
          }
        >
          <item.icon size={20} strokeWidth={2} />
          <span className="truncate max-w-full px-1">{item.short || item.label.split(" ")[0]}</span>
          {item.badgeKey === "pending" && pendingCount > 0 && (
            <span className="absolute top-1 right-1/2 translate-x-4 bg-[#D40511] text-white text-[9px] font-bold px-1.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className={`app-shell flex bg-[#F8FAFC] min-h-screen ${isCelular ? "pb-16" : ""}`}>
      {/* Desktop sidebar: only for notebook */}
      {isNotebook && (
        <div className="hidden md:block sticky top-0 h-screen">{Sidebar}</div>
      )}

      {/* Tablet: always-open narrow-ish sidebar */}
      {isTablet && (
        <div className="hidden md:block sticky top-0 h-screen">{Sidebar}</div>
      )}

      {/* Drawer (used for celular and as fallback below md breakpoint) */}
      {mobileOpen && (
        <div className={`fixed inset-0 z-50 ${isNotebook ? "md:hidden" : ""}`} data-testid="mobile-drawer">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72">{Sidebar}</div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden min-w-0">
        <div className="h-1.5 bg-[#FFCC00]" />

        {/* Top bar: for celular AND on small screens for notebook (auto-adaptive) */}
        {(isCelular || (isNotebook && true)) && (
          <div className={`${isCelular ? "" : "md:hidden"} sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm`}>
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              data-testid="open-menu-btn"
              className={`p-1.5 rounded-md hover:bg-slate-100 ${isCelular ? "" : ""}`}
            >
              <Menu size={22} className="text-slate-700" />
            </button>
            <div className="dhl-logo flex-1">
              <span className="dhl-logo-mark">DHL</span>
              <span className="text-sm font-bold text-slate-900">Horas Extras</span>
            </div>
          </div>
        )}

        <div className={`content-wrap ${isNotebook ? "p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" : isTablet ? "p-6 max-w-4xl mx-auto" : "px-4 py-4"}`}>
          <Outlet />
        </div>
      </main>

      {BottomTabs}
    </div>
  );
}
