import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "dhl_pwa_dismissed_v1";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari has no beforeinstallprompt — show iOS hint instead
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone;
    if (isIOS && !isStandalone) setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") dismiss();
    setDeferred(null);
  };

  if (!visible) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 fade-in-up"
    >
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-[#FFCC00] text-[#D40511]">
          <Download size={20} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-white text-sm">
            Instalar SmartTime
          </div>
          <div className="text-slate-300 text-xs mt-0.5">
            {isIOS
              ? "Toque em Compartilhar e depois em 'Adicionar à Tela de Início'."
              : "Adicione à tela inicial para acessar como um app."}
          </div>
          {!isIOS && (
            <Button
              size="sm"
              onClick={install}
              data-testid="pwa-install-btn"
              className="mt-3 btn-accent rounded-md font-semibold h-8"
            >
              Instalar agora
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          data-testid="pwa-dismiss-btn"
          aria-label="Fechar"
          className="text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
