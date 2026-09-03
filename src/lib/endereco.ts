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
