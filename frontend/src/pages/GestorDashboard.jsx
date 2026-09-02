import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FilePlus2, ListTodo, CheckCircle2, XCircle, Clock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { homePathFor } from "@/lib/roles";

const cards = [
  { key: "Pendente", label: "Pendentes", icon: Clock, color: "text-[#A16207]", bg: "bg-[#FEF9C3]" },
  { key: "Aprovada", label: "Aprovadas", icon: CheckCircle2, color: "text-[#15803D]", bg: "bg-[#DCFCE7]" },
  { key: "Rejeitada", label: "Rejeitadas", icon: XCircle, color: "text-[#B91C1C]", bg: "bg-[#FEE2E2]" },
];

export default function GestorDashboard() {
  const { user } = useAuth();
  const basePath = homePathFor(user?.role);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get("/requests/mine").then((r) => setRequests(r.data)).catch(() => {});
  }, []);

  const counts = cards.map((c) => ({
    ...c,
    value: requests.filter((r) =>
      c.key === "Pendente" ? r.status?.startsWith("Pendente") : r.status === c.key
    ).length,
  }));

  const recent = requests.slice(0, 5);

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Dashboard</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
            Olá, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="text-slate-500 mt-1">Gerencie suas solicitações de horas extras.</p>
        </div>
        <div className="flex gap-2">
          <Link to={`${basePath}/nova`}>
            <Button data-testid="new-request-btn" className="btn-primary rounded-md font-semibold">
              <FilePlus2 size={18} className="mr-2" /> Nova Solicitação
            </Button>
          </Link>
          <Link to={`${basePath}/minhas`}>
            <Button variant="outline" data-testid="view-mine-btn" className="rounded-md font-semibold">
              <ListTodo size={18} className="mr-2" /> Ver todas
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {counts.map((c) => (
          <Card key={c.key} className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">{c.label}</div>
                <div className="font-heading text-4xl font-bold text-slate-900 mt-2" data-testid={`count-${c.key.toLowerCase()}`}>
                  {c.value}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${c.bg}`}>
                <c.icon className={c.color} size={26} strokeWidth={2} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-slate-900">Solicitações Recentes</h2>
            <Link to={`${basePath}/minhas`} className="text-sm text-[#D40511] font-semibold hover:underline">
              Ver todas →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhuma solicitação ainda. <Link to={`${basePath}/nova`} className="text-[#D40511] font-semibold">Criar a primeira →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4" data-testid={`recent-request-${r.id}`}>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{r.colaborador}</div>
                    <div className="text-xs text-slate-500">{r.numero} · {r.data} · {r.total_horas}h</div>
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
