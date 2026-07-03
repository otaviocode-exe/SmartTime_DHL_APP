import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { FilePlus2, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

export default function MinhasSolicitacoes() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/requests/mine").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  const filtered = items.filter((r) =>
    [r.numero, r.colaborador, r.matricula, r.status]
      .join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Solicitações</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">Minhas Solicitações</h1>
          <p className="text-slate-500 mt-1">Consulte todas as solicitações enviadas por você.</p>
        </div>
        <Link to="/gestor/nova">
          <Button data-testid="new-request-btn-2" className="btn-primary rounded-md font-semibold">
            <FilePlus2 size={18} className="mr-2" /> Nova
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="relative mb-4 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="search-input"
              placeholder="Buscar por número, nome, matrícula ou status..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gerente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      Nenhuma solicitação encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-slate-50"
                    data-testid={`request-row-${r.id}`}
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="font-mono text-xs">{r.numero}</TableCell>
                    <TableCell className="font-medium">{r.colaborador}</TableCell>
                    <TableCell>{r.matricula}</TableCell>
                    <TableCell>{r.data}</TableCell>
                    <TableCell>{r.total_horas}h</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-slate-600">{r.gerente_nome || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RequestDetailDialog request={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export function RequestDetailDialog({ request, onClose }) {
  const open = !!request;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="request-detail-dialog">
        {request && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl flex items-center gap-3">
                {request.colaborador} <StatusBadge status={request.status} />
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">{request.numero}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Matrícula" value={request.matricula} />
              <Info label="Turno" value={request.turno || "—"} />
              <Info label="Setor" value={request.setor || "—"} />
              <Info label="Data" value={request.data} />
              <Info label="Horário" value={`${request.hora_inicial} — ${request.hora_final}`} />
              <Info label="Total de horas" value={`${request.total_horas}h`} />
              <Info label="Gestor" value={request.gestor_nome} />
              <Info label="Gerente" value={request.gerente_nome || "—"} />
            </div>
            <div className="mt-2">
              <Info label="Motivo" value={request.motivo} block />
              {request.observacoes && <Info label="Observações do Gestor" value={request.observacoes} block />}
              {request.observacoes_gerencia && (
                <Info label="Observações da Gerência" value={request.observacoes_gerencia} block />
              )}
              {request.data_aprovacao && (
                <Info label="Data da Decisão" value={new Date(request.data_aprovacao).toLocaleString("pt-BR")} block />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, block }) {
  return (
    <div className={block ? "mt-3" : ""}>
      <div className="uppercase tracking-[0.1em] text-[10px] font-bold text-slate-500">{label}</div>
      <div className="text-slate-900 text-sm mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
