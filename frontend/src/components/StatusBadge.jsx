export default function StatusBadge({ status }) {
  const map = {
    Pendente: "bg-[#FEF9C3] text-[#A16207] border-[#FDE047]",
    Aprovada: "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]",
    Rejeitada: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]",
    Cancelada: "bg-slate-100 text-slate-600 border-slate-300",
  };
  const cls = map[status] || "bg-slate-100 text-slate-600 border-slate-300";
  return (
    <span
      data-testid={`status-badge-${status?.toLowerCase()}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
    >
      {status}
    </span>
  );
}
