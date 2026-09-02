export const homePathFor = (role) => {
  if (role === "coordenador") return "/coordenador";
  if (role === "supervisor") return "/supervisor";
  return "/gerencia";
};

export const roleLabel = (role) => ({
  coordenador: "Coordenador",
  supervisor: "Supervisor",
  gerencia: "Gerência",
  admin: "Admin",
}[role] || role);
