/** Ícone da marca iFREE: um relógio-anel verde com uma asa de pássaro
 * saindo do lado — o "bateu ponto" (relógio) virando "voo livre" (asa) —,
 * ponteiros em formato de check dentro do mostrador branco. Vem do
 * arquivo-fonte oficial (ifree-kit-marca/logo/logo_elemento_ifree.png,
 * fornecido pelo Thiago em 2026-09-28), já com glow/3D embutido —
 * substituiu a recriação em SVG feita à mão antes de existir esse arquivo
 * fonte. Reaproveita o PNG já gerado em public/brand/icones-app/
 * icon-512.png (mesmo arquivo usado no ícone do app/favicon) em vez de
 * duplicar mais um asset só pra isso. Fundo transparente, funciona igual
 * em fundo claro ou escuro — não precisa de variante "claro" própria. */
export function LogoIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/icones-app/icon-512.png"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}

/** Logo completa: ícone + "iFREE", pra cabeçalhos e telas de marca.
 * `claro` troca o "FREE" pra branco — usar em fundos escuros (ex: seções
 * navy da landing page), já que o padrão assume fundo claro. */
export function Logo({
  size = 32,
  className,
  claro = false,
}: {
  size?: number;
  className?: string;
  claro?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoIcon size={size} />
      <span
        className="font-black tracking-tight leading-none"
        style={{ fontSize: size * 0.68 }}
      >
        <span className="text-brand-500">i</span>
        <span className={claro ? "text-white" : "text-navy-900"}>FREE</span>
      </span>
    </span>
  );
}
