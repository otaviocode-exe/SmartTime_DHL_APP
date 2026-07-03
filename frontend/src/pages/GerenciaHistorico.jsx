import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API } from "@/lib/api";
import { RequestDetailDialog } from "@/pages/MinhasSolicitacoes";

export default function GerenciaHistorico() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = `${API}/reports/requests.xlsx${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao exportar");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      link.download = `horas_extras_${ts}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      toast.success("Relatório Excel gerado com sucesso");
    } catch (e) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    api.get("/requests").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((r) => {
        const okStatus = statusFilter === "all" || r.status === statusFilter;
        const okText = [r.numero, r.colaborador, r.matricula, r.gestor_nome]
          .join(" ").toLowerCase().includes(q.toLowerCase());
        return okStatus && okText;
      }),
    [items, q, statusFilter]
  );

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Registro</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">Histórico de Solicitações</h1>
          <p className="text-slate-500 mt-1">Todas as solicitações registradas no sistema.</p>
        </div>
        <Button
          onClick={exportExcel}
          disabled={exporting}
          data-testid="export-excel-btn"
          className="btn-accent rounded-md font-semibold"
        >
          <Download size={18} className="mr-2" />
          {exporting ? "Gerando..." : "Exportar Excel"}
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                data-testid="history-search"
                placeholder="Buscar..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="history-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Aprovada">Aprovada</SelectItem>
                <SelectItem value="Rejeitada">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decisão por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-slate-50"
                    data-testid={`history-row-${r.id}`}
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="font-mono text-xs">{r.numero}</TableCell>
                    <TableCell className="font-medium">{r.colaborador}</TableCell>
                    <TableCell>{r.gestor_nome}</TableCell>
                    <TableCell>{r.data}</TableCell>
                    <TableCell>{r.total_horas}h</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-slate-600">{r.gerente_nome || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RequestDetailDialog request={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
