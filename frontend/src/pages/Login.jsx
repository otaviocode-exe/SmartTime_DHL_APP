import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";

export default function Login() {
  const { user, login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && user !== false) {
      const to = user.role === "gestor" ? "/gestor" : "/gerencia";
      navigate(to, { replace: true });
    }
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await login(email.trim(), password);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 bg-[#FFCC00] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 24px)"
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="dhl-logo">
            <span className="dhl-logo-mark">DHL</span>
            <span className="text-slate-900 font-bold">Horas Extras</span>
          </div>
          <div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.05]">
              Aprovação de<br/>Horas <span className="text-[#D40511]">Extras.</span>
            </h1>
            <p className="mt-6 text-slate-800 text-lg max-w-md">
              Centralize solicitações, aprove com transparência e mantenha
              histórico completo para auditoria.
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-800 font-semibold">
            Sistema Interno · DHL Brasil
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md border-slate-200 shadow-sm">
          <CardContent className="p-8">
            <div className="lg:hidden mb-6 flex justify-center">
              <div className="dhl-logo">
                <span className="dhl-logo-mark">DHL</span>
                <span className="text-slate-900 font-bold">Horas Extras</span>
              </div>
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">
              Entrar
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Acesse com suas credenciais corporativas
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email" className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  data-testid="login-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  placeholder="seu.email@dhl.com"
                />
              </div>
              <div>
                <Label htmlFor="password" className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div
                  data-testid="login-error"
                  className="text-sm text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5] rounded-md px-3 py-2"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                data-testid="login-submit-btn"
                disabled={busy}
                className="w-full btn-primary font-semibold py-6 rounded-md"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} className="mr-2"/>Entrar</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
