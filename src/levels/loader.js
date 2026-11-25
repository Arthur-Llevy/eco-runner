// Carrega fases descritas em JSON (ver fase-1.json).
export const LEVELS = ["fase-1"];

export async function loadLevel(id) {
  const url = new URL(`./${id}.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não foi possível carregar a fase ${id}`);
  return res.json();
}
