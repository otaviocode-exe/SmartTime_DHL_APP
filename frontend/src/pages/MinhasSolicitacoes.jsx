import { useEffect, useState } from "react";
import api, { formatApiErrorDetail, API } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { FilePlus2, Search, Ban, FileDown } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import Attachments from "@/components/Attachments";
import { useAuth } from "@/context/AuthContext";
import { homePathFor } from "@/lib/roles";
import { setorLabel } from "@/lib/format";

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const basePath = homePathFor(user?.role);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const load = () => api.get("/requests/mine").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const cancelRequest = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente cancelar esta solicitação?")) return;
    try {
      await api.post(`/requests/${id}/cancel`);
      toast.success("Solicitação cancelada");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro");
    }
  };

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
        <Link to={`${basePath}/nova`}>
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-500">
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
                    <TableCell className="text-right">
                      {r.status?.startsWith("Pendente") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => cancelRequest(r.id, e)}
                          data-testid={`cancel-btn-${r.id}`}
                          className="text-[#D40511] hover:bg-[#FEE2E2] hover:text-[#B91C1C] h-8"
                        >
                          <Ban size={14} className="mr-1" /> Cancelar
                        </Button>
                      )}
                    </TableCell>
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
  const [downloading, setDownloading] = useState(false);
  const canDownload = !!request && !request.status?.startsWith("Pendente");

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/requests/${request.id}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Falha");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `comprovante_${request.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      toast.success("Comprovante PDF gerado");
    } catch {
      toast.error("Erro ao gerar comprovante");
    } finally {
      setDownloading(false);
    }
  };

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
              <Info label="Setor" value={setorLabel(request.setor)} />
              <Info label="Data" value={request.data} />
              <Info label="Horário" value={`${request.hora_inicial} — ${request.hora_final}`} />
              <Info label="Total de horas" value={`${request.total_horas}h`} />
              <Info label="Solicitante" value={request.gestor_nome} />
              <Info label="Aprovação Supervisor" value={request.supervisor_nome || "—"} />
              <Info label="Aprovação Gerência" value={request.gerente_nome || "—"} />
            </div>
            <div className="mt-2">
              <Info label="Motivo" value={request.motivo} block />
              {request.categoria_ia && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] bg-slate-100 border border-slate-300 text-slate-700">
                  🤖 IA: {request.categoria_ia.replace("_", " ")}
                </div>
              )}
              {request.observacoes && <Info label="Observações do Gestor" value={request.observacoes} block />}
              {request.observacoes_gerencia && (
                <Info label="Observações da Gerência" value={request.observacoes_gerencia} block />
              )}
              {request.data_aprovacao && (
                <Info label="Data da Decisão" value={new Date(request.data_aprovacao).toLocaleString("pt-BR")} block />
              )}
              <Attachments requestId={request.id} readOnly={!request.status?.startsWith("Pendente")} />
            </div>
            {canDownload && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                <Button
                  onClick={downloadPDF}
                  disabled={downloading}
                  data-testid="download-request-pdf-btn"
                  variant="outline"
                  className="rounded-md font-semibold border-[#D40511] text-[#D40511] hover:bg-[#FEE2E2]"
                >
                  <FileDown size={18} className="mr-2" />
                  {downloading ? "Gerando..." : "Baixar comprovante PDF"}
                </Button>
              </div>
            )}
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
