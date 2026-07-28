import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";

function calcHoras(hi, hf) {
  if (!hi || !hf) return 0;
  const [h1, m1] = hi.split(":").map(Number);
  const [h2, m2] = hf.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

const TURNO_HORARIOS = {
  T1:  { hora_inicial: "14:00", hora_final: "16:00" },
  T2:  { hora_inicial: "22:00", hora_final: "00:00" },
  T3:  { hora_inicial: "06:00", hora_final: "08:00" },
  ADM: { hora_inicial: "17:00", hora_final: "19:00" },
};

export default function NovaSolicitacao() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    colaborador: "",
    matricula: "",
    turno: "ADM",
    setor: "",
    data: new Date().toISOString().slice(0, 10),
    hora_inicial: TURNO_HORARIOS.ADM.hora_inicial,
    hora_final: TURNO_HORARIOS.ADM.hora_final,
    motivo: "",
    observacoes: "",
  });
  const [busy, setBusy] = useState(false);

  const totalHoras = useMemo(
    () => calcHoras(form.hora_inicial, form.hora_final),
    [form.hora_inicial, form.hora_final]
  );
  const exceedsLimit = totalHoras > 2;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (totalHoras <= 0) {
      toast.error("Hora final deve ser posterior à hora inicial.");
      return;
    }
    if (exceedsLimit) {
      toast.error("Limite excedido — contate o supervisor/gerente.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/requests", { ...form, total_horas: totalHoras });
      toast.success("Solicitação enviada com sucesso!");
      navigate("/gestor/minhas");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro ao enviar solicitação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 fade-in-up max-w-4xl">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3"
          data-testid="back-btn"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Solicitação</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
          Nova Solicitação de Horas Extras
        </h1>
        <p className="text-slate-500 mt-1">Preencha as informações abaixo para envio à gerência.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nome do Colaborador" required>
                <Input required data-testid="input-colaborador" value={form.colaborador} onChange={set("colaborador")} placeholder="Ex.: João da Silva" />
              </Field>
              <Field label="Matrícula" required>
                <Input required data-testid="input-matricula" value={form.matricula} onChange={set("matricula")} placeholder="Ex.: 12345" />
              </Field>
              <Field label="Turno" required>
                <Select
                  value={form.turno}
                  onValueChange={(v) => {
                    const h = TURNO_HORARIOS[v] || {};
                    setForm({
                      ...form,
                      turno: v,
                      hora_inicial: h.hora_inicial ?? form.hora_inicial,
                      hora_final: h.hora_final ?? form.hora_final,
                    });
                  }}
                >
                  <SelectTrigger data-testid="input-turno" className="mt-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T1">T1 — 1º Turno (14h–16h)</SelectItem>
                    <SelectItem value="T2">T2 — 2º Turno (22h–00h)</SelectItem>
                    <SelectItem value="T3">T3 — 3º Turno (06h–08h)</SelectItem>
                    <SelectItem value="ADM">ADM — Administrativo (17h–19h)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Setor">
                <Input data-testid="input-setor" value={form.setor} onChange={set("setor")} placeholder="Ex.: Operações" />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <Field label="Data" required>
                <Input required type="date" data-testid="input-data" value={form.data} onChange={set("data")} />
              </Field>
              <Field label="Hora Inicial" required>
                <Input required type="time" data-testid="input-hora-inicial" value={form.hora_inicial} onChange={set("hora_inicial")} />
              </Field>
              <Field label="Hora Final" required>
                <Input required type="time" data-testid="input-hora-final" value={form.hora_final} onChange={set("hora_final")} />
              </Field>
              <Field label="Total (Horas)">
                <div
                  data-testid="total-horas"
                  className={`mt-1.5 h-10 px-4 flex items-center rounded-md border font-semibold ${
                    exceedsLimit
                      ? "border-[#D40511] bg-[#FEE2E2] text-[#B91C1C]"
                      : "border-slate-300 bg-[#FFCC00]/20 text-slate-900"
                  }`}
                >
                  {totalHoras.toFixed(2)}h
                </div>
              </Field>
            </div>

            {exceedsLimit && (
              <div
                data-testid="limit-warning"
                className="rounded-lg border-2 border-[#D40511] bg-[#FEE2E2] p-4 flex items-start gap-3"
              >
                <div className="p-2 rounded-md bg-[#D40511] text-white shrink-0">
                  <span className="block w-5 h-5 text-center font-bold leading-5">!</span>
                </div>
                <div>
                  <div className="font-heading text-base font-bold text-[#7F1D1D]">
                    Limite de 2 horas excedido
                  </div>
                  <p className="text-sm text-[#7F1D1D] mt-1 leading-relaxed">
                    Solicitações de <b>hora extra acima de 2 horas</b> precisam de
                    aprovação direta do seu <b>supervisor ou gerente da área</b>.
                    Por favor, entre em contato com ele antes de prosseguir — o
                    envio pelo sistema está bloqueado neste caso.
                  </p>
                </div>
              </div>
            )}

            <Field label="Motivo da Hora Extra" required>
              <Textarea
                required
                data-testid="input-motivo"
                value={form.motivo}
                onChange={set("motivo")}
                rows={3}
                placeholder="Descreva o motivo da necessidade..."
              />
            </Field>

            <Field label="Observações">
              <Textarea
                data-testid="input-observacoes"
                value={form.observacoes}
                onChange={set("observacoes")}
                rows={2}
                placeholder="Informações adicionais (opcional)"
              />
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} data-testid="cancel-btn">
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || exceedsLimit} className="btn-primary rounded-md font-semibold disabled:opacity-40 disabled:cursor-not-allowed" data-testid="submit-request-btn">
                <Save size={18} className="mr-2" />
                {busy ? "Enviando..." : exceedsLimit ? "Contate o supervisor" : "Enviar Solicitação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">
        {label} {required && <span className="text-[#D40511]">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
