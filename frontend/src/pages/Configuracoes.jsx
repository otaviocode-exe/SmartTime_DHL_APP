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
  CheckCircle2, Loader2, AlertTriangle, Sun, Moon, Smartphone, Tablet, Laptop,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useDevice } from "@/context/DeviceContext";

const OPTIONS = [
  {
    value: "never",
    title: "Nunca apagar",
    hint: "Nenhuma solicitação será removida automaticamente. Ideal para auditoria completa.",
    icon: InfinityIcon,
  },
  {
    value: "auto",
    title: "Apagar automaticamente após 3 meses",
    hint: "Solicitações com mais de 90 dias serão removidas automaticamente pelo sistema.",
    icon: Timer,
  },
  {
    value: "manual",
    title: "Apagar manualmente após 3 meses",
    hint: "Solicitações com mais de 90 dias ficam elegíveis; use o botão abaixo para removê-las.",
    icon: Hand,
  },
];

export default function Configuracoes() {
  const { theme, setTheme } = useTheme();
  const { deviceMode, setDeviceMode } = useDevice();
  const [settings, setSettings] = useState(null);
  const [preview, setPreview] = useState({ eligible: 0, retention_days: 30 });
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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

  const runPurgeAll = async () => {
    if (confirmText !== "EXCLUIR TUDO") {
      toast.error('Digite exatamente "EXCLUIR TUDO" para confirmar');
      return;
    }
    setPurging(true);
    try {
      const { data } = await api.post("/requests/cleanup/all");
      toast.success(`Histórico excluído: ${data.deleted} solicitação(ões) removida(s)`);
      setConfirmText("");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro ao excluir");
    } finally {
      setPurging(false);
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
          Personalize a experiência e gerencie os dados do sistema.
        </p>
      </div>

      {/* --- APARÊNCIA: TEMA --- */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500 mb-1">
            Aparência
          </div>
          <h3 className="font-heading text-xl font-bold text-slate-900 mb-4">Tema</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: "light", title: "Claro", hint: "Fundo branco, texto escuro", icon: Sun },
              { value: "dark", title: "Escuro", hint: "Fundo escuro, ideal para uso noturno", icon: Moon },
            ].map((t) => {
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  data-testid={`theme-${t.value}`}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors ${
                    active ? "border-[#FFCC00] bg-[#FFCC00]/10" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className={`p-2.5 rounded-md ${active ? "bg-[#FFCC00] text-slate-900" : "bg-slate-100 text-slate-500"}`}>
                    <t.icon size={20} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-heading text-base font-bold text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.hint}</div>
                  </div>
                  {active && <CheckCircle2 size={20} className="text-[#15803D]" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* --- DISPOSITIVO --- */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500 mb-1">
            Interface
          </div>
          <h3 className="font-heading text-xl font-bold text-slate-900 mb-1">Layout do dispositivo</h3>
          <p className="text-sm text-slate-500 mb-4">Otimize a interface para o dispositivo que você está usando.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: "celular", title: "Celular", hint: "Menu inferior, layout compacto", icon: Smartphone },
              { value: "tablet", title: "Tablet / iPad", hint: "Sidebar + 2 colunas", icon: Tablet },
              { value: "notebook", title: "Notebook", hint: "Experiência completa", icon: Laptop },
            ].map((d) => {
              const active = deviceMode === d.value;
              return (
                <button
                  key={d.value}
                  onClick={() => setDeviceMode(d.value)}
                  data-testid={`config-device-${d.value}`}
                  className={`flex flex-col items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    active ? "border-[#FFCC00] bg-[#FFCC00]/10" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className={`p-2.5 rounded-md ${active ? "bg-[#FFCC00] text-slate-900" : "bg-slate-100 text-slate-500"}`}>
                    <d.icon size={22} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                      {d.title}
                      {active && <CheckCircle2 size={16} className="text-[#15803D]" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

      {/* Danger Zone */}
      <Card className="border-2 border-[#D40511]/30 shadow-sm bg-[#FEE2E2]/20">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[#D40511] text-white">
              <AlertTriangle size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="uppercase tracking-[0.14em] text-xs font-bold text-[#D40511]">
                Zona de Perigo
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mt-1">
                Excluir todo o histórico agora
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Remove <b>todas</b> as solicitações do sistema — pendentes, aprovadas e rejeitadas — de uma só vez.
                Esta ação é <b>irreversível</b> e afeta todos os usuários.
              </p>
            </div>
          </div>

          <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-[#D40511] text-[#D40511] hover:bg-[#D40511] hover:text-white font-semibold"
                data-testid="purge-all-btn"
              >
                <Trash2 size={18} className="mr-2" />
                Excluir todo o histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="purge-confirm-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading text-2xl text-[#D40511]">
                  Excluir TODO o histórico?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <span className="block">
                    Esta ação removerá <b>permanentemente</b> todas as solicitações
                    (pendentes, aprovadas e rejeitadas) do banco de dados.
                    Não há como desfazer.
                  </span>
                  <span className="block">
                    Para confirmar, digite <b className="text-[#D40511] font-mono">EXCLUIR TUDO</b> abaixo:
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR TUDO"
                data-testid="purge-confirm-input"
                className="w-full border border-slate-300 rounded-md px-4 py-2 font-mono focus:ring-2 focus:ring-[#D40511] focus:border-[#D40511] outline-none"
              />
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="purge-cancel">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={runPurgeAll}
                  disabled={purging || confirmText !== "EXCLUIR TUDO"}
                  data-testid="purge-confirm"
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {purging ? "Excluindo..." : "Confirmar exclusão"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
