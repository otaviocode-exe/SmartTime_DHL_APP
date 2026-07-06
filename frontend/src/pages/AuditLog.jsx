import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";

const ACTION_LABELS = {
  CREATE_REQUEST: { label: "Criou solicitação", tone: "bg-blue-100 text-blue-800 border-blue-200" },
  APROVADA_REQUEST: { label: "Aprovou", tone: "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]" },
  REJEITADA_REQUEST: { label: "Rejeitou", tone: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]" },
  CANCEL_REQUEST: { label: "Cancelou", tone: "bg-slate-100 text-slate-700 border-slate-300" },
  CLEANUP_OLD: { label: "Limpeza antigos", tone: "bg-[#FEF9C3] text-[#A16207] border-[#FDE047]" },
  PURGE_ALL: { label: "Excluiu tudo", tone: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]" },
  UPDATE_SETTINGS: { label: "Alterou config.", tone: "bg-slate-100 text-slate-700 border-slate-300" },
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/audit-log").then((r) => setLogs(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Auditoria</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
          Log de Atividades
        </h1>
        <p className="text-slate-500 mt-1">
          Rastreamento completo de todas as ações realizadas no sistema.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-500">
              <ScrollText size={40} className="mb-3 text-slate-300" />
              Nenhuma atividade registrada.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => {
                    const info = ACTION_LABELS[l.action] || { label: l.action, tone: "bg-slate-100 text-slate-700 border-slate-200" };
                    return (
                      <TableRow key={l.id} data-testid={`audit-row-${l.id}`}>
                        <TableCell className="font-mono text-xs">
                          {new Date(l.at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium">{l.user_name}</TableCell>
                        <TableCell className="text-slate-500 capitalize text-sm">{l.user_role}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${info.tone}`}>
                            {info.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{l.details || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
