// Rótulos de apresentação: o Excel legado usa "SONIC", a área hoje chama-se PKCG.
export function setorLabel(setor) {
  if (!setor) return "—";
  return setor.replace(/SONIC/gi, "PKCG");
}
