import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homePathFor } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartTimeIcon } from "@/components/SmartTimeLogo";
import DhlLogo from "@/components/DhlLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Globe, ChevronDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const MicrosoftIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 23 23" aria-hidden="true">
    <rect width="10" height="10" x="1" y="1" fill="#F25022" />
    <rect width="10" height="10" x="12" y="1" fill="#7FBA00" />
    <rect width="10" height="10" x="1" y="12" fill="#00A4EF" />
    <rect width="10" height="10" x="12" y="12" fill="#FFB900" />
  </svg>
);

export default function Login() {
  const { user, login, error, setError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [area, setArea] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && user !== false) {
      navigate(homePathFor(user.role), { replace: true });
    }
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!area) {
      setError("Selecione sua área (I2M ou PKCG) para entrar.");
      return;
    }
    setBusy(true);
    await login(email.trim(), password, area);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ---------- Left: SmartTime hero image ---------- */}
      <div className="relative hidden lg:block lg:w-1/2 bg-[#FFCC00]">
        <img
          src="/login-hero.png"
          alt="SmartTime — Gestão de Horas Extras DHL"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </div>

      {/* ---------- Right: auth panel ---------- */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 lg:justify-end">
          <div className="lg:hidden">
            <span className="inline-flex items-center rounded-lg bg-[#FFCC00] px-3 py-1.5">
              <DhlLogo height={20} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              data-testid="login-language-btn"
              onClick={() => toast.info("Outros idiomas em breve.")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Globe size={16} className="text-slate-400" />
              Português
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-10">
          <form onSubmit={submit} className="w-full max-w-md">
            {/* Brand header */}
            <div className="flex flex-col items-center text-center">
              <SmartTimeIcon size={88} />
              <div className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-[#333333]">
                Smart<span className="text-[#D40511]">Time!</span>
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="h-px w-8 bg-[#D40511]/40" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Gestão de Horas Extras
                </span>
                <span className="h-px w-8 bg-[#D40511]/40" />
              </div>
            </div>

            <div className="mt-9 space-y-5">
              {/* Area selector — minimalist segmented control */}
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Área de operação <span className="text-[#D40511]">*</span>
                </Label>
                <div className="mt-2 flex items-center rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    data-testid="area-i2m-btn"
                    onClick={() => setArea("I2M")}
                    className={`flex-1 h-9 rounded-md text-sm font-semibold transition-all ${
                      area === "I2M" ? "bg-white text-[#D40511] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    I2M
                  </button>
                  <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
                  <button
                    type="button"
                    data-testid="area-pkcg-btn"
                    onClick={() => setArea("PKCG")}
                    className={`flex-1 h-9 rounded-md text-sm font-semibold transition-all ${
                      area === "PKCG" ? "bg-white text-[#D40511] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    PKCG
                  </button>
                </div>
              </div>

              {/* Email */}
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
                    autoComplete="email"
                    data-testid="login-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-lg border-slate-200 bg-white pl-11 focus-visible:ring-[#FFCC00] focus-visible:border-[#FFCC00] transition-colors"
                    placeholder="seu.email@empresa.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Senha
                </Label>
                <div className="relative mt-2">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    data-testid="login-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg border-slate-200 bg-white pl-11 pr-11 focus-visible:ring-[#FFCC00] focus-visible:border-[#FFCC00] transition-colors"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    data-testid="toggle-password-btn"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid="forgot-password-btn"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm font-semibold text-[#D40511] hover:text-[#B9040F] transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {error && (
                <div
                  data-testid="login-error"
                  className="text-sm text-[#B9040F] bg-[#FDF2F2] border border-[#FCA5A5] rounded-lg px-3.5 py-2.5"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                data-testid="login-submit-btn"
                disabled={busy}
                className="w-full h-12 rounded-lg bg-[#D40511] hover:bg-[#B9040F] text-white font-bold text-base shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">ou</span>
                </div>
              </div>

              <button
                type="button"
                data-testid="login-microsoft-sso-btn"
                onClick={() => toast.info("SSO Microsoft será habilitado pela TI em breve.")}
                className="w-full h-12 rounded-lg bg-white border-2 border-[#D40511] text-[#333333] font-semibold flex items-center justify-center gap-2.5 hover:bg-[#FDF2F2] transition-colors duration-200"
              >
                <MicrosoftIcon />
                Entrar com Microsoft
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 px-6 pb-7 text-center">
          <ShieldCheck size={16} className="text-[#D40511]" />
          <span className="text-xs text-slate-400 leading-tight">
            Sua conta está protegida por autenticação segura
          </span>
        </div>
      </div>
    </div>
  );
}
