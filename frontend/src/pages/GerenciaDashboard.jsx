import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, Calendar, ArrowRight, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export default function GerenciaDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved_today: 0, rejected_today: 0, total_month: 0 });
  const [items, setItems] = useState([]);
  const [turnoFilter, setTurnoFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    api.get("/requests/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/requests").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      const okTurno = !turnoFilter || r.turno === turnoFilter;
      const okStatus = !statusFilter || r.status === statusFilter;
      return okTurno && okStatus;
    });
  }, [items, turnoFilter, statusFilter]);

  const recent = filteredItems.slice(0, 10);
  const hasFilter = !!(turnoFilter || statusFilter);
  const clearFilters = () => { setTurnoFilter(null); setStatusFilter(null); };

  const toggleTurno = (t) => setTurnoFilter((prev) => (prev === t ? null : t));
  const toggleStatus = (s) => setStatusFilter((prev) => (prev === s ? null : s));

  // Chart 1: requests by turno
  const byTurno = useMemo(() => {
    const acc = { T1: 0, T2: 0, T3: 0, ADM: 0 };
    items.forEach((r) => { if (acc[r.turno] !== undefined) acc[r.turno]++; });
    return Object.entries(acc).map(([turno, total]) => ({ turno, total }));
  }, [items]);

  // Chart 2: status distribution
  const byStatus = useMemo(() => {
    const acc = { Pendente: 0, Aprovada: 0, Rejeitada: 0, Cancelada: 0 };
    items.forEach((r) => {
      const key = r.status?.startsWith("Pendente") ? "Pendente" : r.status;
      if (acc[key] !== undefined) acc[key]++;
    });
    return Object.entries(acc)
      .map(([status, value]) => ({ status, value }))
      .filter((x) => x.value > 0);
  }, [items]);

  const STATUS_COLORS = {
    Pendente: "#FDE047",
    Aprovada: "#22C55E",
    Rejeitada: "#D40511",
    Cancelada: "#94A3B8",
  };

  const cards = [
    { key: "pending", label: "Pendentes", value: stats.pending, icon: Clock, tone: "bg-[#FEF9C3] text-[#A16207]" },
    { key: "approved_today", label: "Aprovadas Hoje", value: stats.approved_today, icon: CheckCircle2, tone: "bg-[#DCFCE7] text-[#15803D]" },
    { key: "rejected_today", label: "Rejeitadas Hoje", value: stats.rejected_today, icon: XCircle, tone: "bg-[#FEE2E2] text-[#B91C1C]" },
    { key: "total_month", label: "Total do Mês", value: stats.total_month, icon: Calendar, tone: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Gerência</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
            Painel de Controle
          </h1>
          <p className="text-slate-500 mt-1">Bem-vinda, {user?.name?.split(" ")[0]}. Aqui está o resumo de hoje.</p>
        </div>
        <Link to="/gerencia/aprovacoes">
          <Button className="btn-primary rounded-md font-semibold" data-testid="go-approvals-btn">
            Aprovações Pendentes <ArrowRight size={18} className="ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {cards.map((c) => (
          <Card key={c.key} className="border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className={`inline-flex p-2 md:p-2.5 rounded-lg ${c.tone}`}>
                <c.icon size={20} strokeWidth={2} />
              </div>
              <div className="uppercase tracking-[0.14em] text-[10px] md:text-xs font-bold text-slate-500 mt-3 md:mt-4">
                {c.label}
              </div>
              <div className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1" data-testid={`stat-${c.key}`}>
                {c.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-slate-900">Solicitações por Turno</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                Clique para filtrar
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTurno} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="turno" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                    cursor={{ fill: "rgba(255,204,0,0.15)" }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                    onClick={(d) => toggleTurno(d.turno)}
                    style={{ cursor: "pointer" }}
                  >
                    {byTurno.map((entry) => (
                      <Cell
                        key={entry.turno}
                        fill={turnoFilter === entry.turno ? "#D40511" : "#FFCC00"}
                        stroke={turnoFilter === entry.turno ? "#7F1D1D" : "none"}
                        strokeWidth={turnoFilter === entry.turno ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-slate-900">Distribuição por Status</h2>
            </div>
            <div className="h-64">
              {byStatus.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatus} dataKey="value" nameKey="status"
                      cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}
                      onClick={(d) => toggleStatus(d.status)}
                      style={{ cursor: "pointer" }}
                    >
                      {byStatus.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status]}
                          stroke={statusFilter === entry.status ? "#0F172A" : "none"}
                          strokeWidth={statusFilter === entry.status ? 3 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                      onClick={(d) => toggleStatus(d.value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-heading text-xl font-bold text-slate-900">
                {hasFilter ? "Solicitações filtradas" : "Últimas Solicitações"}
              </h2>
              {turnoFilter && (
                <span
                  data-testid="active-filter-turno"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#FFCC00] bg-[#FFCC00]/20 text-slate-900"
                >
                  Turno: {turnoFilter}
                  <button onClick={() => setTurnoFilter(null)} className="hover:text-[#D40511]" aria-label="Remover">
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter && (
                <span
                  data-testid="active-filter-status"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-slate-300 bg-slate-100 text-slate-800"
                  style={{ borderColor: STATUS_COLORS[statusFilter], color: "#0F172A" }}
                >
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter(null)} className="hover:text-[#D40511]" aria-label="Remover">
                    <X size={12} />
                  </button>
                </span>
              )}
              {hasFilter && (
                <button
                  onClick={clearFilters}
                  data-testid="clear-filters-btn"
                  className="text-xs text-slate-500 hover:text-[#D40511] underline underline-offset-2"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <Link to="/gerencia/historico" className="text-sm text-[#D40511] font-semibold hover:underline">
              Ver histórico →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {hasFilter ? "Nenhuma solicitação corresponde aos filtros selecionados." : "Nenhuma solicitação registrada."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4" data-testid={`recent-request-${r.id}`}>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{r.colaborador}</div>
                    <div className="text-xs text-slate-500">
                      {r.numero} · {r.data} · {r.total_horas}h · Turno: {r.turno} · Gestor: {r.gestor_nome}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
