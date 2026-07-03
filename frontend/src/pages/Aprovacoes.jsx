import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Check, X, Inbox } from "lucide-react";

export default function Aprovacoes() {
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get("/requests", { params: { status: "Pendente" } })
      .then((r) => setPending(r.data))
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const openReview = (r) => { setSelected(r); setObs(""); };

  const decide = async (action) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/requests/${selected.id}/${action}`, { observacoes_gerencia: obs });
      toast.success(action === "approve" ? "Solicitação aprovada." : "Solicitação rejeitada.");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Fila de Aprovação</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
          Solicitações Pendentes
        </h1>
        <p className="text-slate-500 mt-1">Analise, aprove ou rejeite as solicitações abaixo.</p>
      </div>

      {pending.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center text-center text-slate-500">
            <Inbox size={40} className="mb-3 text-slate-300" />
            <div className="font-semibold text-slate-700">Nenhuma solicitação pendente</div>
            <div className="text-sm mt-1">Tudo em dia por aqui.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pending.map((r) => (
            <Card key={r.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`pending-card-${r.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-slate-500">{r.numero}</div>
                    <div className="font-heading text-xl font-bold text-slate-900 mt-1">{r.colaborador}</div>
                    <div className="text-sm text-slate-500">Matrícula: {r.matricula} · Turno: {r.turno || "—"} · Setor: {r.setor || "—"}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <MiniField label="Data" value={r.data} />
                  <MiniField label="Horário" value={`${r.hora_inicial}–${r.hora_final}`} />
                  <MiniField label="Total" value={`${r.total_horas}h`} highlight />
                </div>

                <div className="mt-4">
                  <div className="uppercase tracking-[0.1em] text-[10px] font-bold text-slate-500">Motivo</div>
                  <div className="text-sm text-slate-800 mt-1 line-clamp-3">{r.motivo}</div>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Solicitado por <span className="font-semibold text-slate-700">{r.gestor_nome}</span>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openReview(r)}
                    data-testid={`review-btn-${r.id}`}
                  >
                    Analisar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl" data-testid="approval-dialog">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  Analisar Solicitação
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {selected.numero}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Colaborador" value={selected.colaborador} />
                <Info label="Matrícula" value={selected.matricula} />
                <Info label="Setor" value={selected.setor || "—"} />
                <Info label="Turno" value={selected.turno || "—"} />
                <Info label="Data" value={selected.data} />
                <Info label="Horário" value={`${selected.hora_inicial} — ${selected.hora_final}`} />
                <Info label="Total de Horas" value={`${selected.total_horas}h`} />
                <Info label="Gestor Solicitante" value={selected.gestor_nome} />
              </div>

              <div className="mt-2">
                <Info label="Motivo" value={selected.motivo} block />
                {selected.observacoes && <Info label="Observações do Gestor" value={selected.observacoes} block />}
              </div>

              <div className="mt-4">
                <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">
                  Observações da Gerência (opcional)
                </Label>
                <Textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={3}
                  className="mt-1.5"
                  placeholder="Adicione um comentário sobre a decisão..."
                  data-testid="approval-observacoes"
                />
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => decide("reject")}
                  disabled={busy}
                  data-testid="reject-btn"
                  className="border-[#D40511] text-[#D40511] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                >
                  <X size={18} className="mr-1" /> Rejeitar
                </Button>
                <Button
                  onClick={() => decide("approve")}
                  disabled={busy}
                  data-testid="approve-btn"
                  className="btn-accent rounded-md font-semibold"
                >
                  <Check size={18} className="mr-1" /> Aprovar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniField({ label, value, highlight }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? "bg-[#FFCC00]/20 border-[#FFCC00]" : "bg-slate-50 border-slate-200"}`}>
      <div className="uppercase tracking-[0.1em] text-[9px] font-bold text-slate-500">{label}</div>
      <div className="font-semibold text-slate-900 text-sm mt-0.5">{value}</div>
    </div>
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
