import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", name: "", role: "gestor", setor: "", matricula: "",
  });
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get("/users").then((r) => setUsers(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target?.value ?? e });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/users", form);
      toast.success("Usuário criado com sucesso");
      setOpen(false);
      setForm({ email: "", password: "", name: "", role: "gestor", setor: "", matricula: "" });
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erro");
    } finally {
      setBusy(false);
    }
  };

  const roleLabel = { gestor: "Gestor", gerencia: "Gerência", admin: "Admin" };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="uppercase tracking-[0.14em] text-xs font-bold text-slate-500">Administração</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-1">Usuários</h1>
          <p className="text-slate-500 mt-1">Cadastre gestores e gerentes do sistema.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary rounded-md font-semibold" data-testid="new-user-btn">
              <UserPlus size={18} className="mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="new-user-dialog">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Nome</Label>
                  <Input required value={form.name} onChange={set("name")} className="mt-1.5" data-testid="user-name-input" />
                </div>
                <div>
                  <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Email</Label>
                  <Input required type="email" value={form.email} onChange={set("email")} className="mt-1.5" data-testid="user-email-input" />
                </div>
                <div>
                  <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Senha</Label>
                  <Input required type="password" minLength={6} value={form.password} onChange={set("password")} className="mt-1.5" data-testid="user-password-input" />
                </div>
                <div>
                  <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Cargo</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1.5" data-testid="user-role-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="gerencia">Gerência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Setor</Label>
                  <Input value={form.setor} onChange={set("setor")} className="mt-1.5" data-testid="user-setor-input" />
                </div>
                <div>
                  <Label className="uppercase tracking-[0.1em] text-xs font-bold text-slate-500">Matrícula</Label>
                  <Input value={form.matricula} onChange={set("matricula")} className="mt-1.5" data-testid="user-matricula-input" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={busy} className="btn-primary rounded-md font-semibold" data-testid="user-submit-btn">
                  {busy ? "Salvando..." : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Matrícula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        u.role === "gerencia" ? "bg-[#FFCC00]/30 text-slate-900 border-[#FFCC00]" :
                        u.role === "admin" ? "bg-slate-200 text-slate-800 border-slate-300" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {roleLabel[u.role] || u.role}
                      </span>
                    </TableCell>
                    <TableCell>{u.setor || "—"}</TableCell>
                    <TableCell>{u.matricula || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
