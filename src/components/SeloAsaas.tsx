/// Selo oficial "Serviços financeiros Asaas", exigido pela Resolução
/// Conjunta BCB/CMN nº 16/2025 em toda tela/fluxo que envolva
/// movimentação ou gestão de valores no modelo BaaS. URLs homologadas
/// enviadas pelo time Asaas (CDN deles, id da nossa conta) — nunca trocar
/// por uma imagem local, pois eles atualizam o selo centralizadamente
/// nesse mesmo link. Ver playbook: não alterar cor/proporção/tipografia,
/// não esconder em rodapé ilegível.
const URL_POR_VARIANTE = {
  positivo: "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Positivo.svg?id=812007cd-b502-4c5d-b8c9-c6e337029b6f",
  "negativo-preto": "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Preto.svg?id=812007cd-b502-4c5d-b8c9-c6e337029b6f",
  "negativo-branco": "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=812007cd-b502-4c5d-b8c9-c6e337029b6f",
} as const;

const TAMANHO_POR_PORTE = {
  padrao: { width: 160, height: 48 },
  pequeno: { width: 120, height: 36 },
} as const;

export default function SeloAsaas({
  variante = "positivo",
  porte = "padrao",
  className,
}: {
  variante?: keyof typeof URL_POR_VARIANTE;
  porte?: keyof typeof TAMANHO_POR_PORTE;
  className?: string;
}) {
  const { width, height } = TAMANHO_POR_PORTE[porte];
  return (
    <a
      href="https://asaas.com"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label="Serviços financeiros prestados pela Asaas — saiba mais"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG externo homologado pela Asaas, servido pela CDN deles */}
      <img
        src={URL_POR_VARIANTE[variante]}
        alt="Serviços financeiros Asaas"
        width={width}
        height={height}
        style={{ display: "inline-block" }}
      />
    </a>
  );
}
