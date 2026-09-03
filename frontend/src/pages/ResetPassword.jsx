import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartTimeIcon } from "@/components/SmartTimeLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { Loader2, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pw.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
    if (pw !== pw2) { setError("As senhas não coincidem."); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password: pw });
      toast.success("Senha redefinida com sucesso! Faça login.");
      navigate("/login", { replace: true });
    } catch (e2) {
      setError(formatApiErrorDetail(e2.response?.data?.detail) || e2.message);
    } finally {
      setBusy(false);
    }
  };

  const pwField = (id, value, setValue, label, testid) => (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</Label>
      <div className="relative mt-2">
        <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          required
          data-testid={testid}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 rounded-lg border-slate-200 bg-white pl-11 pr-11 focus-visible:ring-[#FFCC00] focus-visible:border-[#FFCC00]"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex justify-end p-6"><ThemeToggle /></div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200/80 p-8 shadow-[0_10px_36px_rgba(0,0,0,0.07)]">
          <div className="flex flex-col items-center text-center">
            <SmartTimeIcon size={64} />
            <h1 className="mt-4 font-heading text-2xl font-extrabold text-[#333333]">Definir nova senha</h1>
            <p className="mt-1.5 text-sm text-slate-500">Crie uma nova senha para sua conta SmartTime.</p>
          </div>

          {!token ? (
            <div className="mt-7 space-y-4 text-center">
              <div className="text-sm text-[#B9040F] bg-[#FDF2F2] border border-[#FCA5A5] rounded-lg px-3.5 py-3">
                Link inválido. Solicite uma nova recuperação de senha.
              </div>
              <Link to="/forgot-password" data-testid="request-new-link" className="text-sm font-semibold text-[#D40511] hover:underline">
                Recuperar senha
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              {pwField("pw", pw, setPw, "Nova senha", "reset-password-input")}
              {pwField("pw2", pw2, setPw2, "Confirmar nova senha", "reset-password-confirm-input")}
              {error && (
                <div data-testid="reset-error" className="text-sm text-[#B9040F] bg-[#FDF2F2] border border-[#FCA5A5] rounded-lg px-3.5 py-2.5">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                data-testid="reset-submit-btn"
                disabled={busy}
                className="w-full h-12 rounded-lg bg-[#D40511] hover:bg-[#B9040F] text-white font-bold"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : "Redefinir senha"}
              </Button>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#D40511] transition-colors"
              >
                <ArrowLeft size={16} /> Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
