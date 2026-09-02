import { useMemo, useState, useRef } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { homePathFor } from "@/lib/roles";
import { setorLabel } from "@/lib/format";
import {
  Save, ArrowLeft, Camera, Upload, X, Image as ImageIcon, FileText, Paperclip, AlertTriangle, Clock,
} from "lucide-react";

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
  const { user } = useAuth();
  const basePath = homePathFor(user?.role);
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
  const [pendingFiles, setPendingFiles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [adpAlert, setAdpAlert] = useState(null);
  const [block24h, setBlock24h] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const sugTimerRef = useRef(null);

  const checkMatricula = async (mat) => {
    const m = String(mat || "").trim();
    if (!m) { setAdpAlert(null); setBlock24h(null); return; }
    try {
      const [adp, block] = await Promise.all([
        api.get(`/integrations/adp/hora-extra/${encodeURIComponent(m)}`),
        api.get(`/requests/block-status/${encodeURIComponent(m)}`),
      ]);
      setAdpAlert(adp.data.em_hora_extra ? adp.data : null);
      setBlock24h(block.data.blocked ? block.data : null);
    } catch { setAdpAlert(null); setBlock24h(null); }
  };

  const searchColab = (text) => {
    clearTimeout(sugTimerRef.current);
    if (!text || text.length < 2) { setSuggestions([]); return; }
    sugTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/colaboradores/search?q=${encodeURIComponent(text)}`);
        setSuggestions(data || []);
      } catch { setSuggestions([]); }
    }, 250);
  };

  const applyColab = (c) => {
    setForm((prev) => ({
      ...prev,
      matricula: c.matricula || prev.matricula,
      colaborador: c.nome || prev.colaborador,
      setor: c.setor || prev.setor,
      turno: c.turno || prev.turno,
      ...(c.turno && TURNO_HORARIOS[c.turno] ? {
        hora_inicial: TURNO_HORARIOS[c.turno].hora_inicial,
        hora_final: TURNO_HORARIOS[c.turno].hora_final,
      } : {}),
    }));
    setSuggestions([]);
    setShowSug(false);
    checkMatricula(c.matricula);
    toast.success(`Colaborador ${c.nome} selecionado`);
  };

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const valid = [];
    for (const f of arr) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: maior que 10MB`);
        continue;
      }
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "png", "jpg", "jpeg", "webp"].includes(ext)) {
        toast.error(`${f.name}: formato não aceito`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length) setPendingFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx));

  const totalHoras = useMemo(
    () => calcHoras(form.hora_inicial, form.hora_final),
    [form.hora_inicial, form.hora_final]
  );
  const exceedsLimit = totalHoras > 2;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const lookupMatricula = async () => {
    const m = form.matricula.trim();
    if (!m) return;
    checkMatricula(m);
    try {
      const { data } = await api.get(`/integrations/ponto/colaborador/${encodeURIComponent(m)}`);
      // Auto-fill only empty fields to avoid overriding user edits
      setForm((prev) => ({
        ...prev,
        colaborador: prev.colaborador || data.nome || "",
        setor: prev.setor || data.setor || "",
        turno: prev.turno === "ADM" && data.turno ? data.turno : prev.turno,
        ...(data.turno && TURNO_HORARIOS[data.turno] ? {
          hora_inicial: TURNO_HORARIOS[data.turno].hora_inicial,
          hora_final: TURNO_HORARIOS[data.turno].hora_final,
        } : {}),
      }));
      toast.success(`Colaborador ${data.nome} encontrado`);
    } catch (_) {
      // silent — matrícula desconhecida (ok, o gestor pode digitar manualmente)
    }
  };

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
    if (block24h) {
      toast.error("Colaborador bloqueado por rejeição nas últimas 24h.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/requests", { ...form, total_horas: totalHoras });
      // Upload attachments if any
      if (pendingFiles.length > 0) {
        toast.info(`Enviando ${pendingFiles.length} anexo(s)...`);
        for (const f of pendingFiles) {
          const fd = new FormData();
          fd.append("file", f);
          try {
            await api.post(`/requests/${data.id}/attachments`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (err) {
            toast.error(`Falha ao anexar ${f.name}`);
          }
        }
      }
      toast.success("Solicitação enviada com sucesso!");
      navigate(`${basePath}/minhas`);
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
        <p className="text-slate-500 mt-1">
          {user?.role === "supervisor"
            ? "Sua solicitação segue direto para o OK da Gerência."
            : "Sua solicitação passa pelo Supervisor da área e depois pela Gerência."}
        </p>
      </div>

      {block24h && (
        <div
          data-testid="block-24h-alert"
          className="rounded-lg border-2 border-[#D40511] bg-[#FEE2E2] p-4 flex items-start gap-3"
        >
          <div className="p-2 rounded-md bg-[#D40511] text-white shrink-0"><Clock size={18} /></div>
          <div>
            <div className="font-heading text-base font-bold text-[#7F1D1D]">
              Bloqueio de 24h ativo para esta matrícula
            </div>
            <p className="text-sm text-[#7F1D1D] mt-1">
              A solicitação {block24h.numero} para <b>{block24h.colaborador}</b> foi rejeitada em{" "}
              {new Date(block24h.rejected_at).toLocaleString("pt-BR")}. Uma nova solicitação
              só será permitida a partir de <b>{new Date(block24h.retry_at).toLocaleString("pt-BR")}</b>.
            </p>
          </div>
        </div>
      )}

      {adpAlert && (
        <div
          data-testid="adp-alert"
          className="rounded-lg border-2 border-[#F59E0B] bg-[#FEF3C7] p-4 flex items-start gap-3"
        >
          <div className="p-2 rounded-md bg-[#F59E0B] text-white shrink-0"><AlertTriangle size={18} /></div>
          <div>
            <div className="font-heading text-base font-bold text-[#92400E]">
              Colaborador já está em hora extra agora ({adpAlert.fonte})
            </div>
            <p className="text-sm text-[#92400E] mt-1">
              Segundo o Ponto ADP, a matrícula {adpAlert.matricula} está em hora extra
              {adpAlert.horas_extras_hoje ? ` (${adpAlert.horas_extras_hoje}h hoje)` : ""}. Verifique antes de solicitar mais horas.
            </p>
          </div>
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nome do Colaborador" required>
                <div className="relative">
                  <Input
                    required
                    data-testid="input-colaborador"
                    value={form.colaborador}
                    onChange={(e) => { set("colaborador")(e); searchColab(e.target.value); setShowSug(true); }}
                    onFocus={() => setShowSug(true)}
                    onBlur={() => setTimeout(() => setShowSug(false), 200)}
                    placeholder="Digite nome ou clique em Matrícula →"
                    autoComplete="off"
                  />
                  {showSug && suggestions.length > 0 && (
                    <ul
                      data-testid="colab-suggestions"
                      className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
                    >
                      {suggestions.map((c) => (
                        <li
                          key={c.matricula}
                          onMouseDown={(e) => { e.preventDefault(); applyColab(c); }}
                          className="px-3 py-2 hover:bg-[#FFCC00]/20 cursor-pointer border-b border-slate-100 last:border-0"
                          data-testid={`suggestion-${c.matricula}`}
                        >
                          <div className="text-sm font-semibold text-slate-900">{c.nome}</div>
                          <div className="text-[10px] text-slate-500">
                            Matrícula {c.matricula} · {setorLabel(c.setor)} · Turno {c.turno}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
              <Field label="Matrícula" required>
                <Input required data-testid="input-matricula" value={form.matricula} onChange={(e) => { set("matricula")(e); searchColab(e.target.value); setShowSug(true); }} onBlur={lookupMatricula} placeholder="Ex.: 9817876" />
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
                    <SelectItem value="T1">T1 — 1º Turno</SelectItem>
                    <SelectItem value="T2">T2 — 2º Turno</SelectItem>
                    <SelectItem value="T3">T3 — 3º Turno</SelectItem>
                    <SelectItem value="ADM">ADM — Administrativo</SelectItem>
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

            {/* --- Anexos / Comprovantes --- */}
            <div className="border-t border-slate-100 pt-5">
              <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500 flex items-center gap-1">
                <Paperclip size={12} /> Anexos (opcional)
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Adicione fotos, PDFs ou comprovantes para <b>ajudar a justificar as horas extras</b>.
                Formatos: PDF, PNG, JPG, WEBP · até 10MB por arquivo.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                hidden
                multiple
                onChange={(e) => addFiles(e.target.files)}
                data-testid="nova-file-input"
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => addFiles(e.target.files)}
                data-testid="nova-camera-input"
              />

              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraRef.current?.click()}
                  data-testid="nova-camera-btn"
                >
                  <Camera size={16} className="mr-2" /> Tirar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  data-testid="nova-upload-btn"
                >
                  <Upload size={16} className="mr-2" /> Escolher Arquivo
                </Button>
              </div>

              {pendingFiles.length > 0 && (
                <ul className="mt-3 space-y-2" data-testid="pending-files-list">
                  {pendingFiles.map((f, idx) => {
                    const isImage = f.type.startsWith("image/");
                    return (
                      <li
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200"
                      >
                        {isImage ? <ImageIcon size={16} className="text-slate-500" /> : <FileText size={16} className="text-slate-500" />}
                        <span className="text-sm text-slate-800 flex-1 truncate">{f.name}</span>
                        <span className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-400 hover:text-[#D40511] p-1"
                          aria-label="Remover"
                          data-testid={`remove-file-${idx}`}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} data-testid="cancel-btn">
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || exceedsLimit || !!block24h} className="btn-primary rounded-md font-semibold disabled:opacity-40 disabled:cursor-not-allowed" data-testid="submit-request-btn">
                <Save size={18} className="mr-2" />
                {busy ? "Enviando..." : block24h ? "Bloqueado (24h)" : exceedsLimit ? "Contate o supervisor" : "Enviar Solicitação"}
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
