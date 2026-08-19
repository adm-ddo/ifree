/** Ícone da marca iFREE: um relógio-anel verde com uma asa de pássaro
 * saindo do lado — o "bateu ponto" (relógio) virando "voo livre" (asa) —,
 * ponteiros em formato de check dentro do mostrador branco. Recriado em
 * SVG a partir da identidade visual fornecida pelo usuário (não há
 * arquivo fonte vetorial original disponível). O mostrador é sempre
 * branco e os ponteiros sempre escuros, então o ícone funciona igual em
 * fundo claro ou escuro — não precisa de variante "claro" própria. */
export function LogoIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 100) / 120}
      viewBox="0 0 120 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* asa, em três penas sobrepostas */}
      <path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill="#009E77" />
      <path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill="#00B285" />
      <path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill="#00C896" />
      {/* anel do relógio */}
      <circle cx="44" cy="50" r="32" fill="none" stroke="#00C896" strokeWidth="11" />
      {/* mostrador */}
      <circle cx="44" cy="50" r="26.5" fill="#FFFFFF" />
      {/* marcações do relógio */}
      <rect x="41" y="25" width="6" height="13" rx="3" fill="#14171A" />
      <rect x="41" y="62" width="6" height="13" rx="3" fill="#14171A" />
      <rect x="19" y="47" width="13" height="6" rx="3" fill="#14171A" />
      <rect x="56" y="47" width="13" height="6" rx="3" fill="#14171A" />
      {/* ponteiros em forma de check */}
      <path
        d="M 28 49 L 40 58 L 60 30"
        fill="none"
        stroke="#14171A"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
