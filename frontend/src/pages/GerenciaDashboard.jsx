import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, Calendar, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

export default function GerenciaDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved_today: 0, rejected_today: 0, total_month: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get("/requests/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/requests").then((r) => setRecent(r.data.slice(0, 6))).catch(() => {});
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <Card key={c.key} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className={`inline-flex p-2.5 rounded-lg ${c.tone}`}>
                <c.icon size={22} strokeWidth={2} />
              </div>
              <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500 mt-4">
                {c.label}
              </div>
              <div
                className="font-heading text-4xl font-bold text-slate-900 mt-1"
                data-testid={`stat-${c.key}`}
              >
                {c.value}
              </div>
            </CardContent>
          </Card>
        ))}
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
