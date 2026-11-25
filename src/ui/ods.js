// Mensagens educativas sobre a ODS 11, mostradas a cada semente coletada.
const FACTS = [
  "ODS 11.7: Áreas verdes públicas reduzem ilhas de calor nas cidades!",
  "ODS 11.6: Menos fumaça industrial melhora a qualidade do ar urbano.",
  "ODS 11.2: Transporte limpo e ciclovias diminuem emissões de CO₂.",
  "ODS 11.6: Gestão correta de resíduos evita enchentes e poluição.",
  "ODS 11.B: Cidades arborizadas são mais resilientes às mudanças climáticas.",
  "ODS 11.3: Urbanização sustentável equilibra moradia e meio ambiente.",
  "ODS 11.A: Preservar parques conecta comunidades e biodiversidade.",
];

export function odsMessage(collected, goal) {
  if (collected >= goal) return "🌳 Meta atingida! A cidade foi reflorestada. Siga até a bandeira!";
  return FACTS[(collected - 1) % FACTS.length];
}
