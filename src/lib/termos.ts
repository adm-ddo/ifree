import type { ModoPausa } from "@/generated/prisma/enums";

/** Texto padrão dos termos do contrato de prestação de serviço eventual —
 * usado quando a empresa ainda não personalizou o texto em /configuracoes.
 * A mesma fonte (padrão ou personalizada) alimenta tanto a tela de aceite
 * do totem quanto o PDF do contrato, pra garantir que a pessoa assina
 * exatamente o que leu na tela. */
export const TERMOS_CONTRATO: string[] = [
  "O(a) Contratado(a) presta este serviço de forma eventual e autônoma ao Contratante, na função e pelo valor/hora informados nesta tela, sem vínculo empregatício, subordinação hierárquica, exclusividade ou horário fixo obrigatório.",
  "Como prestador(a) autônomo(a), o(a) Contratado(a) é responsável por manter conduta profissional adequada durante a prestação do serviço, incluindo zelar pela limpeza e organização dos ambientes que utilizar — inclusive banheiros — como se espera de qualquer profissional em local de trabalho compartilhado.",
  "O(a) Contratado(a) declara estar devidamente trajado(a) e apto(a) para exercer a função contratada, sendo de sua responsabilidade providenciar, por conta própria, os trajes e equipamentos de proteção individual (EPI) adequados e necessários à atividade.",
  "O pagamento será calculado com base no tempo efetivamente trabalhado, arredondado para o bloco de 5 (cinco) minutos mais próximo, e efetuado via PIX na chave cadastrada pelo(a) Contratado(a) em até 24 (vinte e quatro) horas após o término do serviço e emissão do recibo correspondente.",
  "Ao marcar a caixa de aceite e assinar eletronicamente a seguir, o(a) Contratado(a) declara estar ciente e de acordo com as condições acima antes do início do turno.",
];

/** Parágrafos → texto de uma textarea (parágrafos separados por linha em branco). */
export function termosParaTexto(paragrafos: string[]): string {
  return paragrafos.join("\n\n");
}

/** Texto de uma textarea → parágrafos (o inverso de `termosParaTexto`). */
export function textoParaTermos(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export const TERMOS_CONTRATO_PADRAO_TEXTO = termosParaTexto(TERMOS_CONTRATO);

/** Cláusulas de LGPD (Lei nº 13.709/2018) — sempre presentes, independente
 * de a empresa ter personalizado o texto ou não, já que a coleta de dados
 * (nome, documento, foto, assinatura etc.) acontece igual pra todo mundo.
 * Cobrem: quais dados são tratados e com qual finalidade/base legal (art.
 * 7º, V — execução de contrato), e os direitos do titular (art. 18). */
const CLAUSULAS_LGPD: readonly string[] = [
  "Em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018), o(a) Contratado(a) autoriza o Contratante a tratar seus dados pessoais — nome, CPF/CNPJ, telefone, endereço, chave PIX, foto e assinatura digital — exclusivamente para identificação, controle do turno, geração do contrato e do recibo, e realização do pagamento, com base na execução deste contrato (art. 7º, V, da LGPD).",
  "O(a) Contratado(a) pode, a qualquer momento, solicitar ao Contratante acesso, correção ou exclusão desses dados, nos termos do art. 18 da LGPD, ressalvado o que precisar ser mantido por obrigação legal (ex: comprovantes de pagamento).",
];

/// Cláusula de identificação da instituição de pagamento (BaaS), exigida
/// pela Resolução Conjunta BCB/CMN nº 16/2025 — precisa aparecer em todo
/// contrato/comprovante independente de a empresa ter personalizado o
/// próprio texto (mesmo espírito de CLAUSULAS_LGPD acima). Frase
/// condicional de propósito: nem toda empresa usa o pagamento automático
/// via PIX integrado (algumas pagam manualmente por fora), então não dá
/// pra afirmar categoricamente que este pagamento específico passou pela
/// Asaas.
const CLAUSULA_INSTITUICAO_PAGAMENTO: readonly string[] = [
  "Quando o Contratante utiliza o pagamento automático via PIX integrado à plataforma, esse repasse é executado pela Asaas Gestão Financeira S.A., instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil, a partir da conta digital de titularidade do próprio Contratante — o iFREE é a plataforma de tecnologia que intermedeia o serviço, não a instituição que processa o pagamento.",
];

/** Mesmo limiar de LIMIAR_PAUSA_MIN em src/lib/turno.ts (6h) — só existe
 * aqui como texto por extenso pra compor a frase da cláusula. */
const LIMIAR_PAUSA_HORAS_EXTENSO = "6 (seis) horas";

function minutosExtenso(modoPausa: ModoPausa): string {
  return modoPausa === "AUTOMATICA_60" ? "60 (sessenta) minutos" : "30 (trinta) minutos";
}

/** Frase que avisa o(a) freelancer, no próprio termo que assina, quanto de
 * intervalo já está embutido no valor/hora — pra não virar surpresa no
 * recibo. Dia e noite podem ter descontos diferentes (turnos de naipes
 * diferentes costumam ter durações bem diferentes); só menciona o(s)
 * período(s) que de fato têm desconto configurado — sem desconto nenhum
 * (NENHUMA nos dois), não há nada a avisar. */
function clausulaPausa(modoPausaDia: ModoPausa, modoPausaNoite: ModoPausa): string | null {
  if (modoPausaDia === "NENHUMA" && modoPausaNoite === "NENHUMA") return null;

  if (modoPausaDia === modoPausaNoite) {
    return `Em turnos acima de ${LIMIAR_PAUSA_HORAS_EXTENSO}, o valor/hora já contempla um intervalo de ${minutosExtenso(modoPausaDia)}, que fica à disposição do(a) Contratado(a) para usar como preferir (descanso, alimentação, etc.) — esse tempo já está descontado do cálculo do pagamento.`;
  }

  const partes: string[] = [];
  if (modoPausaDia !== "NENHUMA") {
    partes.push(`${minutosExtenso(modoPausaDia)} em turnos do período diurno`);
  }
  if (modoPausaNoite !== "NENHUMA") {
    partes.push(`${minutosExtenso(modoPausaNoite)} em turnos do período noturno`);
  }
  return `Em turnos acima de ${LIMIAR_PAUSA_HORAS_EXTENSO}, o valor/hora já contempla um intervalo — de ${partes.join(", e de ")} — que fica à disposição do(a) Contratado(a) para usar como preferir (descanso, alimentação, etc.) — esse tempo já está descontado do cálculo do pagamento.`;
}

/** Resolve os termos efetivos de uma empresa: o texto personalizado dela
 * (ou o padrão do sistema, caso ainda não tenha editado nada), sempre com
 * as cláusulas de LGPD e — se configurado — a de intervalo inseridas na
 * hora, refletindo o estado atual do sistema. Isso garante que toda
 * empresa tenha o aviso de LGPD no termo assinado mesmo que tenha
 * personalizado o próprio texto e esquecido de incluir, e que a cláusula
 * de pausa nunca desatualize se o dono trocar a configuração depois. */
export function resolverTermos(
  termosContratoEmpresa: string | null,
  modoPausaDia: ModoPausa,
  modoPausaNoite: ModoPausa
): string[] {
  const paragrafos =
    !termosContratoEmpresa || !termosContratoEmpresa.trim()
      ? [...TERMOS_CONTRATO]
      : textoParaTermos(termosContratoEmpresa);

  const clausulaPausaTexto = clausulaPausa(modoPausaDia, modoPausaNoite);
  const extras = [
    ...CLAUSULAS_LGPD,
    ...CLAUSULA_INSTITUICAO_PAGAMENTO,
    ...(clausulaPausaTexto ? [clausulaPausaTexto] : []),
  ];

  if (paragrafos.length <= 1) return [...paragrafos, ...extras];
  const comExtras = [...paragrafos];
  comExtras.splice(comExtras.length - 1, 0, ...extras);
  return comExtras;
}
