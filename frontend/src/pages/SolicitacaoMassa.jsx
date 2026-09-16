import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { setorLabel } from "@/lib/format";
import { homePathFor } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, UsersRound, Search, CheckCircle2, XCircle } from "lucide-react";

function TickBox({ on }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 h-4 w-4 rounded-[4px] border-2 flex items-center justify-center transition-colors ${
        on ? "bg-[#D40511] border-[#D40511] text-white" : "bg-white border-slate-300"
      }`}
    >
      {on && <Check size={11} strokeWidth={3.5} />}
    </span>
  );
}

export default function SolicitacaoMassa() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = homePathFor(user?.role);

  const [colabs, setColabs] = useState([]);
  const [setores, setSetores] = useState([]);
  const [setorFilter, setSetorFilter] = useState("all");
  const [turnoFilter, setTurnoFilter] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const [shared, setShared] = useState({
    data: new Date().toISOString().slice(0, 10),
    duracao_horas: 2,
    motivo: "",
    observacoes: "",
  });

  useEffect(() => {
    api.get("/colaboradores/setores").then((r) => setSetores(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (setorFilter !== "all") params.setor = setorFilter;
    if (turnoFilter !== "all") params.turno = turnoFilter;
    api.get("/colaboradores", { params }).then((r) => setColabs(r.data)).catch(() => {});
  }, [setorFilter, turnoFilter]);

  const filtered = useMemo(
    () => colabs.filter((c) =>
      !q || c.nome.toUpperCase().includes(q.toUpperCase()) || c.matricula.includes(q)
    ),
    [colabs, q]
  );

  const totalHoras = shared.duracao_horas;

  const toggle = (mat) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(mat)) s.delete(mat); else s.add(mat);
      return s;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.matricula)));
  };

  const set = (k) => (e) => setShared({ ...shared, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (selected.size === 0) { toast.error("Selecione pelo menos um colaborador."); return; }
    if (!shared.motivo || shared.motivo.trim().length < 3) { toast.error("Descreva o motivo da hora extra."); return; }
    setBusy(true);
    setResults(null);
    try {
      const chosen = colabs.filter((c) => selected.has(c.matricula));
      const { data } = await api.post("/requests/bulk-create", {
        colaboradores: chosen.map((c) => ({
          colaborador: c.nome, matricula: c.matricula, setor: c.setor, turno: c.turno,
        })),
        data: shared.data,
        duracao_horas: shared.duracao_horas,
        motivo: shared.motivo,
        observacoes: shared.observacoes,
      });
      setResults(data);
      const ok = data.created.length, fail = data.failed.length;
      if (ok > 0) toast.success(`${ok} solicitação(ões) criada(s)${fail ? ` · ${fail} falhou(aram)` : ""}`);
      else toast.error("Nenhuma solicitação criada. Verifique os erros abaixo.");
      if (fail === 0) setSelected(new Set());
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Erro ao enviar em massa");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3"
          data-testid="back-btn"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Solicitação em Massa</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
          <UsersRound className="inline mr-2 mb-1" size={30} />
          Horas Extras para Vários Colaboradores
        </h1>
        <p className="text-slate-500 mt-1">
          Filtre por setor/turno da área {user?.area !== "ALL" ? user?.area : ""}, selecione os colaboradores e envie de uma vez.
          A hora extra de cada colaborador <b>começa no horário de saída da escala dele</b> (após bater o ponto) e dura o tempo escolhido (máx. 2h).
        </p>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Seleção de colaboradores */}
        <Card className="border-slate-200 shadow-sm lg:col-span-3">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  data-testid="massa-search"
                  className="pl-9"
                  placeholder="Buscar nome ou matrícula..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={setorFilter} onValueChange={setSetorFilter}>
                <SelectTrigger className="w-full md:w-56" data-testid="massa-setor-filter">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setores.map((s) => <SelectItem key={s} value={s}>{s.replace("UNILEVER VINHEDO - ", "")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={turnoFilter} onValueChange={setTurnoFilter}>
                <SelectTrigger className="w-full md:w-36" data-testid="massa-turno-filter">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos turnos</SelectItem>
                  <SelectItem value="T1">T1</SelectItem>
                  <SelectItem value="T2">T2</SelectItem>
                  <SelectItem value="T3">T3</SelectItem>
                  <SelectItem value="ADM">ADM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={toggleAll}
                data-testid="massa-select-all"
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-[#D40511] transition-colors"
              >
                <TickBox on={filtered.length > 0 && selected.size === filtered.length} />
                Selecionar todos ({filtered.length})
              </button>
              <span className="text-sm font-bold text-[#D40511]" data-testid="massa-selected-count">
                {selected.size} selecionado(s)
              </span>
            </div>

            <ul className="mt-2 max-h-[420px] overflow-y-auto divide-y divide-slate-50" data-testid="massa-colab-list">
              {filtered.length === 0 && (
                <li className="py-8 text-center text-sm text-slate-400">Nenhum colaborador encontrado.</li>
              )}
              {filtered.map((c) => (
                <li
                  key={c.matricula}
                  className={`flex items-center gap-3 px-1 py-2 cursor-pointer rounded hover:bg-[#FFCC00]/10 ${selected.has(c.matricula) ? "bg-[#FFCC00]/20" : ""}`}
                  onClick={() => toggle(c.matricula)}
                  data-testid={`massa-colab-${c.matricula}`}
                >
                  <TickBox on={selected.has(c.matricula)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">{c.nome}</div>
                    <div className="text-[10px] text-slate-500">
                      {c.matricula} · {setorLabel(c.setor).replace("UNILEVER VINHEDO - ", "")} · Turno {c.turno}
                      {c.turma_hora_final ? <> · Sai <b>{c.turma_hora_final}</b></> : <> · <span className="text-[#B91C1C]">sem escala</span></>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Dados compartilhados */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2 h-fit">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-slate-900">Dados da Solicitação</h2>
            <div>
              <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Data *</Label>
              <Input required type="date" className="mt-1.5" value={shared.data} onChange={set("data")} data-testid="massa-data" />
            </div>
            <div>
              <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Duração da HE (após a saída) *</Label>
              <Select
                value={String(shared.duracao_horas)}
                onValueChange={(v) => setShared({ ...shared, duracao_horas: parseFloat(v) })}
              >
                <SelectTrigger className="mt-1.5" data-testid="massa-duracao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">30 minutos</SelectItem>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="1.5">1h30</SelectItem>
                  <SelectItem value="2">2 horas (máximo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div
              data-testid="massa-total-horas"
              className="px-4 py-2 rounded-md border border-slate-300 bg-[#FFCC00]/20 text-slate-900 font-semibold text-sm leading-relaxed"
            >
              Cada colaborador receberá <b>{totalHoras.toFixed(1).replace(".0", "")}h</b> de HE iniciando no
              horário de <b>saída da escala dele</b>. Ex.: sai 16:50 → HE {""}
              16:50–{(() => { const t = (16 * 60 + 50 + Math.round(totalHoras * 60)) % 1440; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })()}.
            </div>
            <div>
              <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Motivo *</Label>
              <Textarea required rows={3} className="mt-1.5" value={shared.motivo} onChange={set("motivo")} placeholder="Motivo aplicado a todos..." data-testid="massa-motivo" />
            </div>
            <div>
              <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Observações</Label>
              <Textarea rows={2} className="mt-1.5" value={shared.observacoes} onChange={set("observacoes")} placeholder="Opcional" data-testid="massa-observacoes" />
            </div>
            <Button
              type="submit"
              disabled={busy || selected.size === 0}
              className="w-full btn-primary rounded-md font-semibold disabled:opacity-40"
              data-testid="massa-submit-btn"
            >
              <Send size={16} className="mr-2" />
              {busy ? "Enviando..." : `Enviar ${selected.size} solicitação(ões)`}
            </Button>

            {results && (
              <div className="space-y-2 pt-2 border-t border-slate-100" data-testid="massa-results">
                {results.created.map((r) => (
                  <div key={r.numero} className="flex items-center gap-2 text-xs text-[#15803D]">
                    <CheckCircle2 size={13} /> {r.colaborador} — {r.numero}
                    {r.hora_inicial && <span className="text-slate-500">({r.hora_inicial}–{r.hora_final})</span>}
                  </div>
                ))}
                {results.failed.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#B91C1C]">
                    <XCircle size={13} className="mt-0.5 shrink-0" /> {r.colaborador}: {r.error}
                  </div>
                ))}
                {results.created.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => navigate(`${basePath}/minhas`)}>
                    Ver minhas solicitações →
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
