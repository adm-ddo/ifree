/** Formata o endereço completo de uma Pessoa (rua, número, complemento,
 * bairro, CEP) numa única linha pronta pra exibir — usado no currículo em
 * PDF (src/app/portal/curriculo/pdf/route.ts) e no perfil do candidato
 * visto pela empresa (src/app/vagas/[id]/candidatos/[pessoaId]/page.tsx).
 * Pula qualquer parte que a pessoa não preencheu. */
export function formatarEnderecoCompleto(pessoa: {
  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade?: string | null;
  cep: string | null;
}): string {
  const partes = [
    `${pessoa.endereco}${pessoa.numero ? `, ${pessoa.numero}` : ""}`,
    pessoa.complemento,
    pessoa.bairro,
    pessoa.cidade,
    pessoa.cep ? `CEP ${pessoa.cep}` : null,
  ].filter((p): p is string => !!p);
  return partes.join(" - ");
}

/** Link de rotas do Google Maps com origem e destino já preenchidos,
 * pedindo especificamente transporte público (ônibus/metrô) — usado no
 * quadro de vagas (src/app/portal/vagas/VagaCard.tsx) pra pessoa avaliar
 * o trajeto até a empresa antes de se candidatar. Só texto de endereço,
 * sem geocodificação nossa: o próprio Google resolve os endereços na hora
 * de abrir o link, então nenhum dos dois lados precisa de coordenadas
 * (lat/lon) cadastradas. URL universal documentada pelo Google (funciona
 * em qualquer navegador, sem chave de API, sem o app instalado). */
export function linkGoogleMapsTransit(origem: string, destino: string): string {
  const params = new URLSearchParams({
    api: "1",
    origin: origem,
    destination: destino,
    travelmode: "transit",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
