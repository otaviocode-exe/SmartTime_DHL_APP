import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  LayoutDashboard,
  FilePlus2,
  ListTodo,
  ClipboardList,
  Users,
  History,
  Settings,
  ScrollText,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const gestorNav = [
  { to: "/gestor", icon: LayoutDashboard, label: "Dashboard", end: true, testid: "nav-gestor-dashboard" },
  { to: "/gestor/nova", icon: FilePlus2, label: "Nova Solicitação", testid: "nav-nova-solicitacao" },
  { to: "/gestor/minhas", icon: ListTodo, label: "Minhas Solicitações", testid: "nav-minhas-solicitacoes" },
  { to: "/gestor/configuracoes", icon: Settings, label: "Configurações", testid: "nav-configuracoes-gestor" },
];

const gerenciaNav = [
  { to: "/gerencia", icon: LayoutDashboard, label: "Dashboard", end: true, testid: "nav-gerencia-dashboard" },
  { to: "/gerencia/aprovacoes", icon: ClipboardList, label: "Aprovações", testid: "nav-aprovacoes", badgeKey: "pending" },
  { to: "/gerencia/historico", icon: History, label: "Histórico", testid: "nav-historico" },
  { to: "/gerencia/usuarios", icon: Users, label: "Usuários", testid: "nav-usuarios" },
  { to: "/gerencia/auditoria", icon: ScrollText, label: "Auditoria", testid: "nav-auditoria" },
  { to: "/gerencia/configuracoes", icon: Settings, label: "Configurações", testid: "nav-configuracoes" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "gestor" ? gestorNav : gerenciaNav;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.role !== "gerencia" && user?.role !== "admin") return;
    const fetchPending = () => {
      api.get("/requests/stats").then((r) => setPendingCount(r.data.pending)).catch(() => {});
    };
    fetchPending();
    const t = setInterval(fetchPending, 30000);
    return () => clearInterval(t);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800"
      >
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="dhl-logo text-white">
            <span className="dhl-logo-mark">DHL</span>
            <span className="text-sm font-semibold tracking-wide text-slate-200">
              Horas Extras
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              {user?.role === "gestor" ? "Gestor" : user?.role === "gerencia" ? "Gerência" : "Admin"}
            </div>
            <div className="mt-1 text-sm font-medium truncate" data-testid="sidebar-user-name">
              {user?.name}
            </div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-[#FFCC00] text-slate-900 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} strokeWidth={2} />
              <span className="flex-1">{item.label}</span>
              {item.badgeKey === "pending" && pendingCount > 0 && (
                <span
                  data-testid="sidebar-pending-badge"
                  className="ml-auto bg-[#D40511] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
                >
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <Button
            data-testid="logout-btn"
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} className="mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="h-1.5 bg-[#FFCC00]" />
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
