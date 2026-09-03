import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartTimeIcon } from "@/components/SmartTimeLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setDone(true);
      setDevLink(data.reset_link || "");
    } catch (e2) {
      setError(formatApiErrorDetail(e2.response?.data?.detail) || e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex justify-end p-6"><ThemeToggle /></div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200/80 p-8 shadow-[0_10px_36px_rgba(0,0,0,0.07)]">
          <div className="flex flex-col items-center text-center">
            <SmartTimeIcon size={64} filled />
            <h1 className="mt-4 font-heading text-2xl font-extrabold text-[#333333]">Recuperar senha</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {done
                ? "Verifique seu e-mail."
                : "Informe seu e-mail corporativo e enviaremos um link seguro."}
            </p>
          </div>

          {done ? (
            <div className="mt-7 space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-[#FFF9E6] border border-[#FFCC00]/60 px-4 py-3.5">
                <CheckCircle2 className="text-[#D40511] mt-0.5 shrink-0" size={20} />
                <p className="text-sm text-slate-600">
                  Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.
                </p>
              </div>
              {devLink && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Modo de teste (sem e-mail configurado)
                  </p>
                  <a
                    href={devLink}
                    data-testid="dev-reset-link"
                    className="text-sm font-semibold text-[#D40511] break-all hover:underline"
                  >
                    {devLink}
                  </a>
                </div>
              )}
              <Link
                to="/login"
                data-testid="back-to-login-link"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#D40511] transition-colors"
              >
                <ArrowLeft size={16} /> Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  E-mail Corporativo
                </Label>
                <div className="relative mt-2">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    data-testid="forgot-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-lg border-slate-200 bg-white pl-11 focus-visible:ring-[#FFCC00] focus-visible:border-[#FFCC00]"
                    placeholder="seu.email@empresa.com"
                  />
                </div>
              </div>
              {error && (
                <div data-testid="forgot-error" className="text-sm text-[#B9040F] bg-[#FDF2F2] border border-[#FCA5A5] rounded-lg px-3.5 py-2.5">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                data-testid="forgot-submit-btn"
                disabled={busy}
                className="w-full h-12 rounded-lg bg-[#D40511] hover:bg-[#B9040F] text-white font-bold"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : "Enviar link de recuperação"}
              </Button>
              <Link
                to="/login"
                data-testid="back-to-login-link"
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
