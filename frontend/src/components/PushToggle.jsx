import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushToggle() {
  const [status, setStatus] = useState("checking"); // 'unsupported' | 'denied' | 'off' | 'on' | 'busy'
  const supported = typeof window !== "undefined" &&
    "serviceWorker" in navigator && "PushManager" in window &&
    window.location.protocol === "https:";

  const refresh = async () => {
    if (!supported) return setStatus("unsupported");
    if (Notification.permission === "denied") return setStatus("denied");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    } catch { setStatus("off"); }
  };

  useEffect(() => { refresh(); }, []);

  const enable = async () => {
    setStatus("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }
      const { data } = await api.get("/push/vapid-public");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key),
      });
      await api.post("/push/subscribe", { subscription: sub.toJSON() });
      toast.success("Notificações push ativadas");
      setStatus("on");
    } catch (e) {
      toast.error("Não foi possível ativar as notificações");
      setStatus("off");
    }
  };

  const disable = async () => {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post("/push/unsubscribe", { subscription: sub.toJSON() });
        await sub.unsubscribe();
      }
      toast.success("Notificações push desativadas");
      setStatus("off");
    } catch (e) {
      toast.error("Erro ao desativar");
      refresh();
    }
  };

  if (status === "unsupported") {
    return (
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
        Push notifications requerem HTTPS + PWA instalado. Ative no seu app publicado (produção).
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="text-xs text-slate-600 bg-[#FEE2E2] border border-[#FCA5A5] rounded-md p-3">
        Permissão de notificação bloqueada. Habilite manualmente nas configurações do navegador.
      </div>
    );
  }

  const active = status === "on";
  return (
    <Button
      onClick={active ? disable : enable}
      disabled={status === "busy" || status === "checking"}
      data-testid="push-toggle"
      variant={active ? "outline" : "default"}
      className={active ? "" : "btn-primary font-semibold"}
    >
      {status === "busy" ? (
        <Loader2 size={16} className="animate-spin mr-2" />
      ) : active ? (
        <BellOff size={16} className="mr-2" />
      ) : (
        <Bell size={16} className="mr-2" />
      )}
      {active ? "Desativar notificações" : "Ativar notificações push"}
    </Button>
  );
}
