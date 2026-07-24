import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, Calendar, ArrowRight } from "lucide-react";
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

  useEffect(() => {
    api.get("/requests/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/requests").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  const recent = items.slice(0, 6);

  // Chart 1: requests by turno
  const byTurno = useMemo(() => {
    const acc = { T1: 0, T2: 0, T3: 0, ADM: 0 };
    items.forEach((r) => { if (acc[r.turno] !== undefined) acc[r.turno]++; });
    return Object.entries(acc).map(([turno, total]) => ({ turno, total }));
  }, [items]);

  // Chart 2: status distribution
  const byStatus = useMemo(() => {
    const acc = { Pendente: 0, Aprovada: 0, Rejeitada: 0, Cancelada: 0 };
    items.forEach((r) => { if (acc[r.status] !== undefined) acc[r.status]++; });
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
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-4">Solicitações por Turno</h2>
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
                  <Bar dataKey="total" fill="#FFCC00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-4">Distribuição por Status</h2>
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
                    >
                      {byStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-slate-900">Últimas Solicitações</h2>
            <Link to="/gerencia/historico" className="text-sm text-[#D40511] font-semibold hover:underline">
              Ver histórico →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Nenhuma solicitação registrada.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{r.colaborador}</div>
                    <div className="text-xs text-slate-500">
                      {r.numero} · {r.data} · {r.total_horas}h · Gestor: {r.gestor_nome}
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
