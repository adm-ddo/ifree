/** Checklist de completude do perfil no Portal — usado tanto pro cartão
 * "Complete seu perfil" (src/app/portal/page.tsx) quanto pro gate de
 * geração do currículo (src/app/portal/curriculo/pdf/route.ts): mesma
 * lógica nos dois lugares, pra nunca destoar o que o checklist promete do
 * que o gate realmente exige. 8 itens, >= 4 preenchidos = 50%. */
export const BIOGRAFIA_MINIMO_CARACTERES = 50;

export type PessoaParaCompletude = {
  fotoPerfilUrl: string | null;
  biografia: string | null;
  habilidades: string[];
  vagasDesejadas: string[];
  chavePix: string | null;
  rg: string | null;
  dataNascimento: Date | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  contatoEmergenciaNome: string | null;
  contatoEmergenciaTelefone: string | null;
};

type ItemCompletude = { label: string; preenchido: boolean };

const LIMIAR_CURRICULO = 0.5;

function itensCompletude(pessoa: PessoaParaCompletude): ItemCompletude[] {
  return [
    { label: "Foto de perfil", preenchido: !!pessoa.fotoPerfilUrl },
    {
      label: `Biografia (mín. ${BIOGRAFIA_MINIMO_CARACTERES} caracteres)`,
      preenchido: (pessoa.biografia?.trim().length ?? 0) >= BIOGRAFIA_MINIMO_CARACTERES,
    },
    { label: "Ao menos 1 habilidade", preenchido: pessoa.habilidades.length > 0 },
    { label: "Ao menos 1 vaga desejada", preenchido: pessoa.vagasDesejadas.length > 0 },
    { label: "Chave PIX", preenchido: !!pessoa.chavePix },
    { label: "RG", preenchido: !!pessoa.rg },
    { label: "Data de nascimento", preenchido: !!pessoa.dataNascimento },
    {
      label: "Endereço completo (bairro e CEP)",
      preenchido: !!pessoa.bairro && !!pessoa.cep && !!pessoa.cidade,
    },
    {
      label: "Contato de emergência",
      preenchido: !!pessoa.contatoEmergenciaNome && !!pessoa.contatoEmergenciaTelefone,
    },
  ];
}

/** Requisitos mínimos pra se candidatar a uma vaga — mais restrito que o
 * checklist de completude acima (que também conta itens "bônus" como RG e
 * contato de emergência, e libera o currículo com só metade preenchida).
 * A ideia aqui é: toda candidatura carrega dados suficientes pra empresa
 * decidir com confiança quem está do outro lado. */
export function pessoaProntaParaCandidatura(
  pessoa: Pick<
    PessoaParaCompletude,
    "fotoPerfilUrl" | "biografia" | "chavePix" | "dataNascimento" | "bairro" | "cep" | "cidade"
  > & { endereco: string; numero: string | null }
): { pronta: boolean; faltando: string[] } {
  const faltando: string[] = [];
  if (!pessoa.fotoPerfilUrl) faltando.push("foto de perfil");
  if ((pessoa.biografia?.trim().length ?? 0) < BIOGRAFIA_MINIMO_CARACTERES) {
    faltando.push(`biografia (mín. ${BIOGRAFIA_MINIMO_CARACTERES} caracteres)`);
  }
  if (!pessoa.chavePix) faltando.push("chave PIX");
  if (!pessoa.dataNascimento) faltando.push("data de nascimento");
  if (!pessoa.endereco || !pessoa.numero || !pessoa.bairro || !pessoa.cep || !pessoa.cidade) {
    faltando.push("endereço completo (rua, número, bairro, cidade e CEP)");
  }
  return { pronta: faltando.length === 0, faltando };
}

export function calcularCompletude(pessoa: PessoaParaCompletude): {
  percentual: number;
  itens: ItemCompletude[];
  faltando: string[];
  liberaCurriculo: boolean;
} {
  const itens = itensCompletude(pessoa);
  const preenchidos = itens.filter((i) => i.preenchido).length;
  const percentual = Math.round((preenchidos / itens.length) * 100);

  return {
    percentual,
    itens,
    faltando: itens.filter((i) => !i.preenchido).map((i) => i.label),
    liberaCurriculo: preenchidos / itens.length >= LIMIAR_CURRICULO,
  };
}
