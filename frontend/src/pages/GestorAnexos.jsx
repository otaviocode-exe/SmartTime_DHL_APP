import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Paperclip, FilePlus2, Camera } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import Attachments from "@/components/Attachments";

export default function GestorAnexos() {
  const [items, setItems] = useState([]);
  const [attachCounts, setAttachCounts] = useState({});
  const [selected, setSelected] = useState(null);

  const load = () => {
    api.get("/requests/mine").then(async (r) => {
      setItems(r.data);
      // fetch attachment counts in parallel
      const counts = {};
      await Promise.all(
        r.data.map(async (req) => {
          try {
            const { data } = await api.get(`/requests/${req.id}/attachments`);
            counts[req.id] = data.length;
          } catch { counts[req.id] = 0; }
        })
      );
      setAttachCounts(counts);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Comprovantes</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">Anexos</h1>
        <p className="text-slate-500 mt-1">
          Anexe fotos, PDFs ou comprovantes às suas solicitações. Use o botão <b>Foto</b> no
          celular para tirar uma foto na hora ou <b>Galeria</b> para escolher do seu dispositivo.
        </p>
      </div>

      {/* Quick tips card */}
      <Card className="border-[#FFCC00] border-2 bg-[#FFCC00]/10 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-md bg-[#FFCC00] text-[#D40511] shrink-0">
            <Camera size={20} strokeWidth={2.2} />
          </div>
          <div className="text-sm text-slate-800">
            <div className="font-heading font-bold">Dica</div>
            <p className="mt-0.5">
              Anexos ajudam a gerência a decidir mais rápido. Fotos aceitas: <b>PDF, PNG, JPG, WEBP</b> — até 10MB.
              Quando você tocar em <b>Foto</b>, o navegador pedirá permissão para acessar a câmera.
            </p>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center text-slate-500">
            <FilePlus2 size={40} className="mx-auto mb-3 text-slate-300" />
            <div className="font-semibold text-slate-700">Sem solicitações ainda</div>
            <div className="text-sm mt-1">
              <Link to="/gestor/nova" className="text-[#D40511] font-semibold hover:underline">
                Criar minha primeira solicitação →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => (
            <Card
              key={r.id}
              onClick={() => setSelected(r)}
              className="border-slate-200 shadow-sm hover:shadow-md hover:border-[#FFCC00] cursor-pointer transition-all"
              data-testid={`anexo-card-${r.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] text-slate-500">{r.numero}</div>
                    <div className="font-heading text-base font-bold text-slate-900 mt-0.5 truncate">
                      {r.colaborador}
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.data} · {r.total_horas}h · {r.turno || "—"}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Paperclip size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-600 flex-1">
                    {attachCounts[r.id] || 0} anexo(s)
                  </span>
                  <span className="text-[10px] text-[#D40511] font-semibold uppercase tracking-[0.1em]">
                    {r.status === "Pendente" ? "Tocar para anexar →" : "Ver anexos →"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); load(); } }}>
        <DialogContent data-testid="anexo-dialog">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl flex items-center gap-3">
                  {selected.colaborador}
                  <StatusBadge status={selected.status} />
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {selected.numero} · {selected.data} · {selected.total_horas}h
                </DialogDescription>
              </DialogHeader>
              <Attachments
                requestId={selected.id}
                readOnly={selected.status !== "Pendente"}
                showCamera
              />
              {selected.status !== "Pendente" && (
                <div className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2">
                  Somente solicitações <b>Pendentes</b> permitem novos anexos.
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
