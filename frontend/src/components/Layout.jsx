import { useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDevice } from "@/context/DeviceContext";
import api from "@/lib/api";
import {
  LayoutDashboard, FilePlus2, ListTodo, ClipboardList, Users, History,
  Settings, ScrollText, LogOut, Menu, X, MonitorSmartphone, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import SmartTimeLogo from "@/components/SmartTimeLogo";
import DhlLogo from "@/components/DhlLogo";
import { roleLabel } from "@/lib/roles";

const coordenadorNav = [
  { to: "/coordenador", icon: LayoutDashboard, label: "Dashboard", short: "Início", end: true, testid: "nav-coordenador-dashboard" },
  { to: "/coordenador/nova", icon: FilePlus2, label: "Nova Solicitação", short: "Nova", testid: "nav-nova-solicitacao" },
  { to: "/coordenador/massa", icon: UsersRound, label: "Solicitação em Massa", short: "Massa", testid: "nav-solicitacao-massa" },
  { to: "/coordenador/minhas", icon: ListTodo, label: "Minhas Solicitações", short: "Minhas", testid: "nav-minhas-solicitacoes" },
  { to: "/coordenador/configuracoes", icon: Settings, label: "Configurações", short: "Ajustes", testid: "nav-configuracoes-gestor" },
];

const supervisorNav = [
  { to: "/supervisor", icon: LayoutDashboard, label: "Dashboard", short: "Início", end: true, testid: "nav-supervisor-dashboard" },
  { to: "/supervisor/aprovacoes", icon: ClipboardList, label: "Aprovações", short: "Aprovar", testid: "nav-aprovacoes", badgeKey: "pending" },
  { to: "/supervisor/nova", icon: FilePlus2, label: "Nova Solicitação", short: "Nova", testid: "nav-nova-solicitacao" },
  { to: "/supervisor/massa", icon: UsersRound, label: "Solicitação em Massa", short: "Massa", testid: "nav-solicitacao-massa" },
  { to: "/supervisor/minhas", icon: ListTodo, label: "Minhas Solicitações", short: "Minhas", testid: "nav-minhas-solicitacoes" },
  { to: "/supervisor/configuracoes", icon: Settings, label: "Configurações", short: "Ajustes", testid: "nav-configuracoes-supervisor" },
];

const gerenciaNav = [
  { to: "/gerencia", icon: LayoutDashboard, label: "Dashboard", short: "Início", end: true, testid: "nav-gerencia-dashboard" },
  { to: "/gerencia/aprovacoes", icon: ClipboardList, label: "Aprovações", short: "Aprovar", testid: "nav-aprovacoes", badgeKey: "pending" },
  { to: "/gerencia/historico", icon: History, label: "Histórico", short: "Hist.", testid: "nav-historico" },
  { to: "/gerencia/usuarios", icon: Users, label: "Usuários", short: "Users", testid: "nav-usuarios" },
  { to: "/gerencia/auditoria", icon: ScrollText, label: "Auditoria", short: "Audit.", testid: "nav-auditoria" },
  { to: "/gerencia/configuracoes", icon: Settings, label: "Configurações", short: "Ajustes", testid: "nav-configuracoes" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { deviceMode, resetDeviceMode } = useDevice();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === "coordenador" ? coordenadorNav : user?.role === "supervisor" ? supervisorNav : gerenciaNav;
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!["supervisor", "gerencia", "admin"].includes(user?.role)) return;
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
      className="w-48 bg-white text-slate-800 flex flex-col rounded-2xl border border-slate-100 shadow-[0_10px_34px_rgba(15,23,42,0.10)] h-full overflow-hidden"
    >
      {/* DHL brand box */}
      <div className="relative px-3 pt-3">
        <div className="rounded-xl bg-[#FFCC00] py-3.5 flex items-center justify-center">
          <DhlLogo height={22} />
        </div>
        {(!isNotebook) && (
          <button
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-900"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            data-testid="close-menu-btn"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to} to={item.to} end={item.end} data-testid={item.testid}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-center transition-colors ${
                isActive ? "bg-slate-100 text-slate-900"
                         : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <span className="relative">
              <item.icon size={22} strokeWidth={2} />
              {item.badgeKey === "pending" && pendingCount > 0 && (
                <span
                  data-testid="sidebar-pending-badge"
                  className="absolute -top-2 -right-2.5 bg-[#D40511] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-tight"
                >
                  {pendingCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 pt-2 border-t border-slate-100">
        <div className="px-2 pt-2 pb-3 text-center" data-testid="sidebar-user-name">
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
            {roleLabel(user?.role)}{user?.area && user.area !== "ALL" ? ` · ${user.area}` : ""}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-800 truncate">{user?.name}</div>
        </div>
        <button
          data-testid="logout-btn" onClick={handleLogout}
          className="w-full flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-slate-600 hover:bg-[#FDF2F2] hover:text-[#D40511] transition-colors"
        >
          <LogOut size={20} strokeWidth={2} />
          <span className="text-[11px] font-medium">Sair</span>
        </button>
        <button
          onClick={changeDevice}
          data-testid="change-device-btn"
          className="mt-1 w-full text-center text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Dispositivo: {deviceMode || "auto"}
        </button>
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
        <div className="hidden md:block sticky top-0 h-screen p-3">{Sidebar}</div>
      )}

      {/* Tablet: always-open narrow-ish sidebar */}
      {isTablet && (
        <div className="hidden md:block sticky top-0 h-screen p-3">{Sidebar}</div>
      )}

      {/* Drawer (used for tablet mode below md breakpoint and notebook mode on smaller screens — NOT for celular) */}
      {mobileOpen && !isCelular && (
        <div className={`fixed inset-0 z-50 ${isNotebook ? "md:hidden" : ""}`} data-testid="mobile-drawer">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 p-3">{Sidebar}</div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden min-w-0">
        <div className="h-1.5 bg-[#FFCC00]" />

        {/* Top bar: for celular (logo only, no hamburger) AND on small screens for notebook */}
        {isCelular ? (
          <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
            <SmartTimeLogo size={32} wordmarkClass="text-sm text-[#333333]" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="text-right leading-tight">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                  {roleLabel(user?.role)}
                </div>
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                  {user?.name?.split(" ")[0]}
                </div>
              </div>
            </div>
          </div>
        ) : isNotebook ? (
          <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              data-testid="open-menu-btn"
              className="p-1.5 rounded-md hover:bg-slate-100"
            >
              <Menu size={22} className="text-slate-700" />
            </button>
            <div className="flex-1"><SmartTimeLogo size={32} wordmarkClass="text-sm text-[#333333]" /></div>
            <NotificationBell />
          </div>
        ) : null}

        {/* Desktop notification bell (top-right floating) */}
        {isNotebook && (
          <div className="hidden md:block absolute top-3 right-6 z-20">
            <NotificationBell />
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
