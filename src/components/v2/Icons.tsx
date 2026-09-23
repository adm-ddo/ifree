/** Ícones simples (poucos pontos, sem ilustração elaborada) usados na nav
 * da v2 — mesmo espírito do sprite do artifact de design aprovado
 * ("Novo Visual iFREE"), um por item de menu real (ver NAV_ITEMS em
 * src/app/v2/layout.tsx). Componente único parametrizado por `nome` em vez
 * de um componente por ícone — evita 15 arquivos pra 15 desenhos simples. */
export type NomeIconeV2 =
  | "dashboard"
  | "funcoes"
  | "freelancers"
  | "vagas"
  | "mensagens"
  | "funcionarios"
  | "turnos"
  | "relatorios"
  | "pagamentos"
  | "financeiro"
  | "estimativaClt"
  | "totens"
  | "configuracoes"
  | "etica"
  | "ged"
  | "mais"
  | "sair"
  | "pgr";

const CAMINHOS: Record<NomeIconeV2, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </>
  ),
  funcoes: (
    <path
      d="M4 7l5-4 5 4v10l-5 4-5-4V7z M9 3v18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  freelancers: (
    <>
      <circle cx="10" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20c0-3.6 3-6.5 7-6.5s7 2.9 7 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12l2 2 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  vagas: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  mensagens: (
    <path
      d="M4 5h16v11H8l-4 4V5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  funcionarios: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 20c0-2.2-.7-4.1-1.9-5.5 1-.5 2.1-.8 3.4-.5 2 .5 3.5 2.6 3.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  turnos: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  relatorios: (
    <>
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3" width="4" height="17" rx="1" />
    </>
  ),
  // Símbolo oficial do PIX (Banco Central) — path exato do SVG oficial
  // (só a marca, sem a palavra "pix" nem "powered by Banco Central" ao
  // lado, que fazem parte do logotipo completo, não do símbolo sozinho).
  // Cor vem de currentColor (não o teal oficial fixo) pra continuar
  // funcionando branco na barra lateral e cinza quando inativo no
  // celular, igual aos outros ícones deste sprite.
  pagamentos: (
    <>
      <path d="M246.13,264.53A46.07,46.07,0,0,1,213.35,251L166,203.62a9,9,0,0,0-12.44,0l-47.51,47.51A46.09,46.09,0,0,1,73.27,264.7H64l60,60a48,48,0,0,0,67.81,0l60.12-60.13Z" />
      <path d="M73.28,97.09a46.08,46.08,0,0,1,32.78,13.57l47.51,47.52a8.81,8.81,0,0,0,12.44,0l47.34-47.34a46,46,0,0,1,32.78-13.58h5.7L191.71,37.14a47.94,47.94,0,0,0-67.81,0L64,97.09Z" />
      <path d="M301.56,147l-36.33-36.33a7,7,0,0,1-2.58.52H246.13a32.62,32.62,0,0,0-22.93,9.5L175.86,168a22.74,22.74,0,0,1-32.13,0L96.21,120.51A32.62,32.62,0,0,0,73.28,111H53a7.12,7.12,0,0,1-2.44-.49L14,147a48,48,0,0,0,0,67.81l36.48,36.48a6.85,6.85,0,0,1,2.44-.49H73.28a32.63,32.63,0,0,0,22.93-9.51l47.51-47.51c8.59-8.58,23.56-8.58,32.14,0l47.34,47.33a32.62,32.62,0,0,0,22.93,9.5h16.52a6.9,6.9,0,0,1,2.58.52l36.33-36.33a47.94,47.94,0,0,0,0-67.81" />
    </>
  ),
  financeiro: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 12.5h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  estimativaClt: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  totens: (
    <>
      <rect x="4" y="3" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 21h6M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  configuracoes: (
    <>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2.2 3.4" />
    </>
  ),
  etica: (
    <path
      d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  ged: (
    <path
      d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
  sair: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pgr: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12h3l1.5-4 3 8 2-5.5 1.5 1.5H20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

// Só o ícone do PIX usa a arte oficial, que vem numa escala de
// coordenadas diferente (0 0 952.77 338.7 no SVG original, recortado
// aqui só pra área do símbolo). Os demais ícones seguem no grid 24x24
// de sempre.
const VIEWBOX_POR_ICONE: Partial<Record<NomeIconeV2, string>> = {
  pagamentos: "0 0 310 330",
};

export function IconeV2({ nome, className }: { nome: NomeIconeV2; className?: string }) {
  return (
    <svg viewBox={VIEWBOX_POR_ICONE[nome] ?? "0 0 24 24"} fill="currentColor" className={className} aria-hidden="true">
      {CAMINHOS[nome]}
    </svg>
  );
}
