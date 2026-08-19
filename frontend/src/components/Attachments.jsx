import { useEffect, useState, useRef } from "react";
import api, { API, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Attachments({ requestId, readOnly = false }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = () => {
    if (!requestId) return;
    api.get(`/requests/${requestId}/attachments`).then((r) => setItems(r.data)).catch(() => {});
  };
  useEffect(load, [requestId]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/requests/${requestId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Anexo enviado");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = async (att) => {
    try {
      const res = await fetch(`${API}/attachments/${att.id}/download`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.original_filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar anexo");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="uppercase tracking-[0.1em] text-[10px] font-bold text-slate-500 flex items-center gap-1">
          <Paperclip size={12} /> Anexos ({items.length})
        </div>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              hidden
              onChange={upload}
              data-testid="attachment-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              data-testid="upload-attachment-btn"
              className="h-7 text-xs"
            >
              {uploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} className="mr-1" />}
              Anexar
            </Button>
          </>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 italic">Sem anexos</div>
      ) : (
        <ul className="space-y-1">
          {items.map((a) => {
            const isImage = (a.content_type || "").startsWith("image/");
            return (
              <li
                key={a.id}
                onClick={() => download(a)}
                data-testid={`attachment-${a.id}`}
                className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                {isImage ? <ImageIcon size={14} className="text-slate-500" /> : <FileText size={14} className="text-slate-500" />}
                <span className="text-xs text-slate-800 flex-1 truncate">{a.original_filename}</span>
                <span className="text-[10px] text-slate-400">{(a.size / 1024).toFixed(0)} KB</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
