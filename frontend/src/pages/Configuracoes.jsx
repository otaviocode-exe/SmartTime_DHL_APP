import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Infinity as InfinityIcon, Timer, Hand, Trash2, ShieldAlert,
  CheckCircle2, Loader2,
} from "lucide-react";

const OPTIONS = [
  {
    value: "never",
    title: "Nunca apagar",
    hint: "Nenhuma solicitação será removida automaticamente. Ideal para auditoria completa.",
    icon: InfinityIcon,
  },
  {
    value: "auto",
    title: "Apagar automaticamente após 1 mês",
    hint: "Solicitações com mais de 30 dias serão removidas automaticamente pelo sistema.",
    icon: Timer,
  },
  {
    value: "manual",
    title: "Apagar manualmente após 1 mês",
    hint: "Solicitações com mais de 30 dias ficam elegíveis; use o botão abaixo para removê-las.",
    icon: Hand,
  },
];

export default function Configuracoes() {
  const [settings, setSettings] = useState(null);
  const [preview, setPreview] = useState({ eligible: 0, retention_days: 30 });
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        api.get("/settings"),
        api.get("/requests/cleanup/preview"),
      ]);
      setSettings(s.data);
      setPreview(p.data);
    } catch (_) {}
  };

  useEffect(() => { load(); }, []);

  const changePolicy = async (value) => {
    setSaving(true);
    try {
      const { data } = await api.put("/settings", { retention_policy: value });
      setSettings(data);
      toast.success("Política de retenção atualizada");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro");
    } finally {
      setSaving(false);
    }
  };

  const runCleanup = async () => {
    setCleaning(true);
    try {
      const { data } = await api.post("/requests/cleanup");
      toast.success(`${data.deleted} solicitação(ões) removida(s)`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro na limpeza");
    } finally {
      setCleaning(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6 fade-in-up max-w-4xl">
      <div>
        <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Administração</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">
          Configurações
        </h1>
        <p className="text-slate-500 mt-1">
          Defina a política de retenção de dados das solicitações.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500 mb-4">
            Política de Retenção
          </div>

          <RadioGroup
            value={settings.retention_policy}
            onValueChange={changePolicy}
            className="space-y-3"
          >
            {OPTIONS.map((o) => {
              const active = settings.retention_policy === o.value;
              return (
                <label
                  key={o.value}
                  htmlFor={`policy-${o.value}`}
                  data-testid={`policy-option-${o.value}`}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    active
                      ? "border-[#FFCC00] bg-[#FFCC00]/10"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <RadioGroupItem
                    value={o.value}
                    id={`policy-${o.value}`}
                    className="mt-1"
                  />
                  <div className={`p-2 rounded-md ${active ? "bg-[#FFCC00]" : "bg-slate-100"}`}>
                    <o.icon size={18} className={active ? "text-slate-900" : "text-slate-500"} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-base font-bold text-slate-900">{o.title}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{o.hint}</div>
                  </div>
                  {active && <CheckCircle2 size={20} className="text-[#15803D] mt-1" />}
                </label>
              );
            })}
          </RadioGroup>

          {saving && (
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Salvando...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">
                Limpeza Manual
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mt-1">
                Remover solicitações antigas
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Solicitações com mais de <b>{preview.retention_days} dias</b> serão
                permanentemente excluídas do banco de dados.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-sm">
                <ShieldAlert size={16} className="text-[#A16207]" />
                <span className="font-semibold text-slate-900" data-testid="preview-eligible">
                  {preview.eligible}
                </span>
                <span className="text-slate-600">solicitação(ões) elegível(is)</span>
              </div>
              {settings.last_cleanup && (
                <div className="mt-2 text-xs text-slate-500">
                  Última limpeza: {new Date(settings.last_cleanup).toLocaleString("pt-BR")}
                </div>
              )}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={cleaning || preview.eligible === 0}
                  className="btn-primary rounded-md font-semibold self-start md:self-center"
                  data-testid="cleanup-btn"
                >
                  <Trash2 size={18} className="mr-2" />
                  {cleaning ? "Removendo..." : "Executar Limpeza"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="cleanup-confirm-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading text-2xl">
                    Confirmar limpeza
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá <b>excluir permanentemente</b> {preview.eligible}
                    {" "}solicitação(ões) com mais de {preview.retention_days} dias.
                    Esta operação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="cleanup-cancel">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={runCleanup}
                    data-testid="cleanup-confirm"
                    className="btn-primary"
                  >
                    Sim, remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
