import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDevice } from "@/context/DeviceContext";
import { homePathFor } from "@/lib/roles";
import { Smartphone, Tablet, Laptop, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  {
    mode: "celular",
    title: "Celular",
    subtitle: "Otimizado para telas até 6''",
    icon: Smartphone,
    hint: "Layout compacto · menu inferior · toques generosos",
    testid: "device-celular",
  },
  {
    mode: "tablet",
    title: "Tablet / iPad",
    subtitle: "Ideal para telas de 8'' a 13''",
    icon: Tablet,
    hint: "Sidebar com ícones · 2 colunas · leitura confortável",
    testid: "device-tablet",
  },
  {
    mode: "notebook",
    title: "Notebook",
    subtitle: "Experiência completa em telas grandes",
    icon: Laptop,
    hint: "Sidebar completa · dashboards amplos · máxima produtividade",
    testid: "device-notebook",
  },
];

export default function DeviceSelector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setDeviceMode } = useDevice();

  const choose = (mode) => {
    setDeviceMode(mode);
    const to = homePathFor(user?.role);
    navigate(to, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="h-1.5 bg-[#FFCC00]" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-5xl">
          <div className="dhl-logo mb-8 justify-center flex">
            <span className="dhl-logo-mark">DHL</span>
            <span className="text-slate-900 font-bold">SmartTime</span>
          </div>

          <div className="text-center mb-10">
            <div className="uppercase tracking-[0.2em] text-xs font-bold text-slate-500">
              Configuração inicial
            </div>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-slate-900 mt-2">
              De qual <span className="text-[#D40511]">dispositivo</span><br className="md:hidden"/> você vai acessar?
            </h1>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Escolha para personalizar a interface. Você pode trocar depois no menu lateral.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {OPTIONS.map((o) => (
              <button
                key={o.mode}
                data-testid={o.testid}
                onClick={() => choose(o.mode)}
                className="group text-left bg-white rounded-2xl border-2 border-slate-200 hover:border-[#FFCC00] hover:shadow-lg transition-all p-6 md:p-7"
              >
                <div className="w-14 h-14 rounded-xl bg-[#FFCC00] text-[#D40511] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <o.icon size={28} strokeWidth={2.2} />
                </div>
                <div className="font-heading text-2xl font-bold text-slate-900">{o.title}</div>
                <div className="text-sm text-slate-500 mt-1">{o.subtitle}</div>
                <div className="mt-4 text-xs text-slate-600 border-t border-slate-100 pt-4 leading-relaxed">
                  {o.hint}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="uppercase tracking-[0.14em] text-[10px] font-bold text-slate-400">
                    Selecionar
                  </span>
                  <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#D40511] group-hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => choose("notebook")}
              className="text-slate-500 text-xs"
              data-testid="device-skip"
            >
              Pular por agora (usa layout automático)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
