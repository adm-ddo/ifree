import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { redirect } from "next/navigation";
import { textoParaTermos, termosParaTexto } from "@/lib/termos";
import type { Pessoa, VinculoPessoaEmpresa } from "@/generated/prisma/client";

/** Confere se o usuário é responsável pelo GED NESTA empresa — sem
 * redirecionar, pra uso em lugares que só precisam de um boolean (layout
 * raiz, /configuracoes). Master sempre conta como responsável, mesmo
 * espírito de usuarioEhResponsavelEtica em src/lib/etica.ts. */
export async function usuarioEhResponsavelGed(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<boolean> {
  if (isMaster) return true;
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    select: { responsavelGed: true },
  });
  return vinculo?.responsavelGed ?? false;
}

/** Use no topo de toda page/action do GED (/ged/**) — dado sensível de
 * RH, restrito a quem for explicitamente marcado (ver /equipe), mesmo
 * padrão de requireResponsavelEtica. */
export async function requireResponsavelGed() {
  const sessao = await requireTenant();
  const podeAcessar = await usuarioEhResponsavelGed(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster);
  if (!podeAcessar) redirect("/v2/dashboard");
  return sessao;
}

// --- Modelos padrão (fallback em código, mesma filosofia de TERMOS_CONTRATO) ---

export const MODELOS_PADRAO_ADVERTENCIA: readonly { nome: string; corpoTexto: string }[] = [
  {
    nome: "Falta injustificada",
    corpoTexto:
      "Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão de falta injustificada ao serviço, em desacordo com as normas internas e o disposto no contrato de trabalho.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482 da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.",
  },
  {
    nome: "Atraso reiterado",
    corpoTexto:
      "Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão de atrasos reiterados no cumprimento de seu horário de trabalho, em desacordo com as normas internas e o disposto no contrato de trabalho.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482 da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.",
  },
  {
    nome: "Descumprimento de norma interna",
    corpoTexto:
      "Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão do descumprimento de norma interna da empresa, conduta incompatível com as obrigações inerentes à função exercida.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482 da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.",
  },
  {
    nome: "Conduta inadequada",
    corpoTexto:
      "Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão de conduta inadequada no ambiente de trabalho, incompatível com a boa convivência e o padrão de comportamento esperado.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482 da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.",
  },
  {
    nome: "Desídia",
    corpoTexto:
      "Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão de desídia no desempenho de suas funções, caracterizada pela falta de zelo, negligência e desatenção reiteradas no cumprimento de suas atribuições, em desacordo com as normas internas e o disposto no contrato de trabalho.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482, alínea \"e\", da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.",
  },
  {
    nome: "Não uso de EPI",
    corpoTexto:
      "Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão de não estar utilizando/portando os Equipamentos de Proteção Individual (EPI) obrigatórios para o exercício de suas funções, em desacordo com as normas internas de segurança e o disposto no contrato de trabalho.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482 da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.",
  },
];

/// Identificador especial do modeloId pra advertência genérica — nome do
/// motivo é digitado na hora (mesmo espírito da suspensão), o resto do
/// texto é o boilerplate de praxe, igual aos modelos prontos acima.
export const MODELO_ADVERTENCIA_GENERICA_ID = "generica";

/** Monta o corpo da advertência genérica — só o motivo muda, o resto é
 * exatamente o mesmo texto de praxe usado nos modelos prontos (reincidência,
 * art. 482 da CLT, pedido de atenção), pra manter o documento juridicamente
 * consistente mesmo quando o motivo é digitado na hora em vez de escolhido
 * de uma lista. */
export function montarAdvertenciaGenerica(motivo: string): string {
  return `Pelo presente instrumento, a empresa formaliza ADVERTÊNCIA ao(à) colaborador(a) acima identificado(a), em razão de ${motivo}, em desacordo com as normas internas e o disposto no contrato de trabalho.\n\nAlertamos que a reincidência desta ou de outra falta disciplinar poderá acarretar a aplicação de penalidades mais severas, incluindo suspensão e, em caso de reiteração, rescisão contratual por justa causa, nos termos do art. 482 da CLT.\n\nSolicitamos maior atenção e comprometimento no cumprimento das obrigações contratuais.`;
}

/** Suspensão NÃO usa modelo escolhível (diferente de advertência) — é um
 * único documento fixo real, cedido pelo Thiago, onde só o motivo e a
 * quantidade de dias mudam por vez; o resto (nome, empresa, datas) é
 * preenchido automaticamente. Ver GerarDocumentoForm.tsx (campos extras
 * só pra esse tipo) e suspensao-pdf.tsx (layout dedicado, diferente do
 * documento-ged-pdf.tsx genérico usado por advertência/contrato). */
export function calcularDataRetornoSuspensao(periodoInicio: Date, dias: number): Date {
  return new Date(periodoInicio.getTime() + dias * 24 * 60 * 60 * 1000);
}

/** Texto padrão do contrato de trabalho CLT — mesmo espírito de
 * TERMOS_CONTRATO (src/lib/termos.ts), só que pro vínculo CLT em vez do
 * totem EXTRA. Mantém genérico de propósito: cada empresa tem cargo,
 * salário e jornada diferentes, já embutidos no cabeçalho de dados do
 * documento (ver documento-ged-pdf.tsx), não no corpo do texto. */
export const CONTRATO_CLT_TERMOS_PADRAO: string[] = [
  "Pelo presente Contrato Individual de Trabalho, as partes acima identificadas ajustam a admissão do(a) EMPREGADO(A) para exercer a função indicada, sob o regime da Consolidação das Leis do Trabalho (CLT), obrigando-se o(a) EMPREGADO(A) a prestar serviços com zelo, assiduidade e pontualidade.",
  "O(A) EMPREGADO(A) cumprirá a jornada de trabalho e a escala definidas pela empresa, respeitados os intervalos legais para repouso e alimentação, bem como as normas internas de conduta e segurança do trabalho.",
  "A remuneração será paga conforme valor e periodicidade acordados, observadas as obrigações legais de recolhimento de encargos trabalhistas e previdenciários.",
  "O presente contrato poderá ser rescindido a qualquer tempo por qualquer das partes, observadas as disposições da CLT quanto a aviso prévio, verbas rescisórias e demais direitos aplicáveis.",
];

/** Substitui os tokens de dados da empresa num texto — usado tanto no
 * padrão quanto no texto customizado (se a empresa copiou o padrão como
 * base pra editar, os tokens que sobrarem também são resolvidos).
 * `endereco` é opcional (nem todo modelo usa) — token vira "" se a
 * empresa não tiver endereço cadastrado, nunca quebra a geração. */
function substituirDadosEmpresa(
  texto: string,
  empresaNome: string,
  empresaCnpj: string,
  empresaEndereco?: string
): string {
  return texto
    .replaceAll("{{EMPRESA_NOME}}", empresaNome)
    .replaceAll("{{EMPRESA_CNPJ}}", empresaCnpj)
    .replaceAll("{{EMPRESA_ENDERECO}}", empresaEndereco?.trim() || "endereço não cadastrado");
}

/** Biblioteca de "termos de ciência" — documentos informativos/de
 * conformidade que a empresa entrega e o colaborador assina ciente
 * (diferente de advertência/suspensão, que são disciplinares). Cada
 * entrada é um documento pronto, cedido pelo Thiago em PDF/.doc e
 * adaptado aqui — adicionar um novo é só um item a mais neste array
 * (sem migração), igual MODELOS_PADRAO_PAPEL. Texto fixo por lei/norma,
 * não é editável pela empresa (diferente de regulamento/contrato) — só
 * os tokens de empresa são substituídos.
 *
 * Formato: `paragrafos` vira o corpo do documento; a declaração de
 * ciência final (nome/CPF/assinatura/data do colaborador + assinatura
 * do representante da empresa) é sempre desenhada por
 * termo-ciencia-pdf.tsx, não faz parte do array — evita repetir esse
 * bloco em todo termo novo. */
/** Formata um valor numérico como "R$ 1.234,56" — usado nos termos de
 * ciência que precisam mostrar um valor cadastrado (ex.: prêmio de
 * assiduidade), mesmo estilo já usado em ficha-epi-pdf.tsx. */
function formatarReais(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TERMOS_CIENCIA_PADRAO: readonly { slug: string; nome: string; paragrafos: string[] }[] = [
  {
    slug: "campanhas-saude-publica",
    nome: "Termo de Ciência e Divulgação de Campanhas Oficiais de Saúde Pública",
    paragrafos: [
      "A empresa {{EMPRESA_NOME}}, inscrita no CNPJ nº {{EMPRESA_CNPJ}}, com sede em {{EMPRESA_ENDERECO}}, em cumprimento ao disposto na Lei nº 15.377/2026, vem, por meio deste, dar ciência formal aos seus colaboradores acerca das campanhas oficiais de saúde pública promovidas pelo Ministério da Saúde e pela Secretaria Municipal de Saúde de Porto Alegre/RS.",
      "1. DAS CAMPANHAS INFORMADAS",
      "O empregador informa a existência e importância das seguintes campanhas oficiais:",
      "1.1 Vacinação (Calendário Oficial do SUS) — realizada de forma contínua ao longo do ano, com intensificações periódicas, incluindo: vacinação contra HPV (conforme público-alvo definido pelo SUS); Campanha Nacional de Vacinação contra Influenza (período estimado: março a junho, conforme cronograma anual); atualização da caderneta vacinal em todas as faixas etárias.",
      "1.2 Prevenção ao Câncer — Março Lilás (01 a 31 de março): conscientização e prevenção do câncer de colo do útero. Outubro Rosa (01 a 31 de outubro): conscientização e prevenção do câncer de mama. Novembro Azul (01 a 30 de novembro): conscientização e prevenção do câncer de próstata.",
      "2. DO DIREITO DO COLABORADOR (CLT)",
      "Nos termos do art. 473, inciso XII, da Consolidação das Leis do Trabalho (CLT), o colaborador poderá deixar de comparecer ao serviço, sem prejuízo do salário, por até 3 (três) dias ao ano, para a realização de exames preventivos de câncer, mediante a devida comprovação.",
      "3. DAS DATAS E ATUALIZAÇÕES",
      "As campanhas seguem os calendários oficiais do Ministério da Saúde e da Secretaria Municipal de Saúde de Porto Alegre/RS, podendo sofrer alterações conforme determinações dos órgãos competentes. Os colaboradores devem acompanhar as informações por meio de: Unidades Básicas de Saúde (UBS); site da Prefeitura de Porto Alegre; Ministério da Saúde.",
      "4. DA FINALIDADE",
      "O presente termo tem por finalidade: cumprir obrigação legal prevista na Lei nº 15.377/2026; promover a saúde preventiva no ambiente de trabalho; formalizar a ciência do colaborador para fins trabalhistas e de fiscalização.",
      "5. DECLARAÇÃO DE CIÊNCIA",
      "Declaro que recebi, li e compreendi as informações acima, estando ciente das campanhas públicas de saúde e dos meus direitos previstos na legislação trabalhista.",
    ],
  },
  {
    slug: "premio-assiduidade-desempenho",
    nome: "Termo de Ciência – Prêmio de Assiduidade e Desempenho",
    // Os tokens {{VALOR_PREMIO}}/{{VALOR_PREMIO_QUINZENA}} só são
    // resolvidos aqui (não em substituirDadosEmpresa, que é genérico de
    // empresa) — ver resolverTermoCiencia logo abaixo. Vêm do cadastro de
    // benefícios da pessoa (VinculoPessoaEmpresa.valorPremioAssiduidade,
    // configurado em /funcionarios/[id]), não são digitados na hora.
    paragrafos: [
      "A empresa {{EMPRESA_NOME}}, inscrita no CNPJ nº {{EMPRESA_CNPJ}}, com sede em {{EMPRESA_ENDERECO}}, neste ato denominada EMPREGADOR(A), por meio do presente instrumento, dá ciência ao(à) empregado(a) acerca das regras relativas ao Prêmio de Assiduidade e Desempenho.",
      "O(A) empregado(a) declara, para todos os fins de direito, que tem pleno conhecimento de que o referido prêmio é concedido por mera liberalidade do empregador, nos termos do art. 457, §2º da Consolidação das Leis do Trabalho (CLT), possuindo natureza indenizatória e não salarial.",
      "Declara, ainda, estar ciente de que tal parcela não se incorpora ao contrato de trabalho, não constitui base de incidência de quaisquer encargos trabalhistas e previdenciários, e não gera reflexos em verbas como férias, 13º salário, FGTS, aviso prévio ou horas extras.",
      "1. DA NATUREZA JURÍDICA",
      "O referido prêmio não integra a remuneração do(a) empregado(a) para quaisquer efeitos legais, não se incorporando ao contrato de trabalho e não servindo de base de cálculo para encargos trabalhistas e previdenciários, tais como FGTS, INSS, férias, 13º salário, aviso prévio ou horas extras.",
      "2. DA CONCESSÃO",
      "O pagamento do prêmio é de caráter eventual, facultativo e discricionário, podendo ser concedido ou não a cada período, conforme avaliação interna do empregador, não constituindo direito adquirido, podendo portanto variar o valor de pagamento.",
      "3. DOS CRITÉRIOS OBJETIVOS PARA CONCESSÃO DO PRÊMIO",
      "Para eventual concessão do prêmio, poderão ser considerados, de forma cumulativa ou isolada, a critério exclusivo do empregador: assiduidade (ausência de faltas injustificadas); pontualidade; cumprimento integral da jornada de trabalho; desempenho nas atividades exercidas; cumprimento das normas internas da empresa.",
      "I – ASSIDUIDADE\n\nO valor do prêmio sofrerá descontos conforme ocorrências no período de apuração: falta injustificada — desconto de R$ 50,00 por ocorrência.",
      "II – CONDIÇÕES PARA PAGAMENTO\n\nO valor final do prêmio corresponderá ao valor máximo de {{VALOR_PREMIO}}, deduzidos os descontos previstos neste item. Caso o total de descontos ultrapasse o valor do prêmio, nada será devido no período. Faltas justificadas mediante atestado médico válido não gerarão desconto, desde que apresentadas conforme as normas da empresa.",
      "III – REGRAS GERAIS\n\nConsidera-se falta injustificada toda ausência não previamente autorizada ou não comprovada por documento válido. Os critérios acima não afastam a necessidade de cumprimento das normas internas da empresa. O pagamento permanece condicionado à liberalidade do empregador, nos termos deste instrumento.",
      "4. DO VALOR E FORMA DE PAGAMENTO",
      "O valor do prêmio será de até {{VALOR_PREMIO}} mensais, podendo ser pago de forma quinzenal, no valor de {{VALOR_PREMIO_QUINZENA}} por quinzena, em cartão benefício, condicionado ao atendimento dos critérios estabelecidos neste termo.",
      "O pagamento em cartão benefício não possui natureza salarial, não sendo considerado remuneração, não podendo ser convertido em espécie ou incorporado ao salário do(a) empregado(a) para quaisquer efeitos legais.",
      "5. DA NÃO HABITUALIDADE",
      "O(A) empregado(a) declara ciência de que o pagamento do prêmio não possui habitualidade obrigatória, podendo ser suspenso, alterado ou cancelado a qualquer tempo, a critério exclusivo do empregador, sem que isso configure alteração contratual lesiva.",
      "6. DISPOSIÇÕES FINAIS",
      "A assinatura deste termo não garante o recebimento do prêmio, servindo apenas como ciência das condições para sua eventual concessão.",
    ],
  },
  {
    slug: "autorizacao-desconto-folha",
    nome: "Termo de Ciência e Autorização de Desconto em Folha de Pagamento",
    paragrafos: [
      "A empresa {{EMPRESA_NOME}}, inscrita no CNPJ nº {{EMPRESA_CNPJ}}, com sede em {{EMPRESA_ENDERECO}}, dá ciência ao(à) empregado(a) abaixo identificado(a) acerca das normas internas relativas ao consumo e à aquisição de produtos e serviços disponibilizados para uso pessoal no ambiente de trabalho (tais como refeições extras, produtos da loja interna, consumo de copa/cantina, entre outros).",
      "O(A) empregado(a) declara ter plena ciência dessas normas e autoriza expressamente, de livre e espontânea vontade, nos termos do art. 462 da Consolidação das Leis do Trabalho (CLT), o desconto em sua folha de pagamento dos valores correspondentes aos consumos internos por ele(a) realizados e devidamente identificados.",
      "O(A) empregado(a) compromete-se a acompanhar os lançamentos e, em caso de eventuais divergências, reportá-las ao departamento de Recursos Humanos/Departamento Pessoal antes do fechamento da folha do mês vigente.",
      "Esta autorização permanecerá válida por todo o período de vigência do contrato de trabalho, podendo ser revogada, por escrito, a qualquer momento — cessando, a partir de então, o direito de realizar novos consumos internos sob esta modalidade.",
      "Por ser a expressão da verdade, firma-se o presente termo.",
    ],
  },
  {
    // Único termo do catálogo pensado pra quem NÃO é empregado(a) — pra
    // um(a) freelancer (EXTRA) que a empresa ofereceu virar CLT e
    // recusou. A rota que gera isso (/ged/pessoas/[pessoaId]/gerar/[tipo])
    // já não exige CLT pra TERMO_CIENCIA (só CONTRATO_TRABALHO exige, ver
    // gerar/[tipo]/page.tsx) — /ged/pessoas também já tinha um filtro
    // "Extra" na listagem, então isso encaixa sem mudar nada na rota.
    // Baseado num rascunho que o Thiago trouxe (feito com ajuda de IA) —
    // revisado aqui pra ficar de acordo com o resto do catálogo: de
    // propósito NÃO usa linguagem de "renúncia a direitos trabalhistas"
    // (o art. 9º da CLT torna nulo qualquer ato que tente fraudar a
    // aplicação da CLT, e direitos de um vínculo real não desaparecem só
    // por uma declaração — ver conversa registrada com o Thiago em
    // 2026-09-20). O documento só registra que a oferta foi feita e a
    // escolha foi livre — não tenta blindar contra reconhecimento de
    // vínculo se a operação de fato virar rotina fixa/subordinada (isso é
    // função de como a empresa realmente opera, não do texto assinado).
    // Ainda não revisado por advogado trabalhista — mesma ressalva do
    // resto do catálogo. Diferente de todo o resto do catálogo, este
    // termo NÃO termina com uma frase de "declaro que li e compreendi" —
    // essa declaração final é escrita de próprio punho pela pessoa (não
    // impressa), copiada de um molde na página 2 do PDF (pedido do
    // Thiago em 2026-09-21) — ver gerarPdfDeclaracaoOfertaClt em
    // src/lib/declaracao-oferta-clt-pdf.tsx, chamado à parte do
    // renderer genérico gerarPdfTermoCiencia (só esse termo usa isso).
    slug: "opcao-autonomo-apos-oferta-clt",
    nome: "Declaração de Ciência da Oferta de Contratação CLT e Opção pela Prestação de Serviços Autônomos/Eventuais",
    paragrafos: [
      "A empresa {{EMPRESA_NOME}}, inscrita no CNPJ nº {{EMPRESA_CNPJ}}, com sede em {{EMPRESA_ENDERECO}}, declara ter oferecido ao(à) profissional abaixo identificado(a) a possibilidade de contratação formal pelo regime da Consolidação das Leis do Trabalho (CLT), com registro em carteira de trabalho e os direitos trabalhistas correspondentes a essa modalidade.",
      "O(A) profissional, de livre e espontânea vontade, optou por não assumir, neste momento, uma vaga fixa pelo regime CLT, preferindo continuar prestando serviços de forma autônoma e eventual, de acordo com sua própria disponibilidade.",
      "O(A) profissional declara estar ciente de que, nessa modalidade, poderá ser convidado(a) para turnos específicos, podendo aceitar ou recusar livremente cada convite, sem obrigação de disponibilidade permanente e sem qualquer penalidade pela recusa.",
      "Declara também estar ciente de que não há garantia de quantidade mínima de turnos, dias ou serviços a serem oferecidos, sendo cada prestação previamente combinada entre as partes, com contrato específico gerado a cada turno.",
      "Os valores referentes aos serviços efetivamente realizados são pagos por turno, diária ou mediante fechamento semanal, conforme modalidade previamente ajustada entre as partes.",
      "Esta opção resulta de decisão pessoal do(a) profissional, não decorrendo de imposição, ameaça, pressão ou qualquer condição estabelecida pela empresa.",
      "O(A) profissional tem ciência de que poderá manifestar, a qualquer momento, interesse em ser considerado(a) para uma futura contratação pelo regime CLT, ficando eventual contratação sujeita à existência de vaga disponível e a novo acordo entre as partes.",
    ],
  },
];

/** `valorPremioMensal` só é usado pelo termo "premio-assiduidade-
 * desempenho" (ver token {{VALOR_PREMIO}}/{{VALOR_PREMIO_QUINZENA}}
 * acima) — vem do cadastro de benefícios da pessoa, não é digitado na
 * hora de gerar. Null/ausente mostra um aviso em vez de quebrar a
 * geração (pessoa ainda sem o valor configurado em /funcionarios). */
export function resolverTermoCiencia(
  slug: string,
  empresaNome: string,
  empresaCnpj: string,
  empresaEndereco: string | null,
  valorPremioMensal?: number | null
): { nome: string; paragrafos: string[] } | null {
  const termo = TERMOS_CIENCIA_PADRAO.find((t) => t.slug === slug);
  if (!termo) return null;
  const valorPremio =
    valorPremioMensal != null ? formatarReais(valorPremioMensal) : "[valor do prêmio não configurado no cadastro]";
  const valorPremioQuinzena =
    valorPremioMensal != null
      ? formatarReais(valorPremioMensal / 2)
      : "[valor do prêmio não configurado no cadastro]";
  return {
    nome: termo.nome,
    paragrafos: termo.paragrafos.map((p) =>
      substituirDadosEmpresa(p, empresaNome, empresaCnpj, empresaEndereco ?? undefined)
        .replaceAll("{{VALOR_PREMIO_QUINZENA}}", valorPremioQuinzena)
        .replaceAll("{{VALOR_PREMIO}}", valorPremio)
    ),
  };
}

/** Texto padrão do regulamento interno — modelo real fornecido pelo
 * Thiago (usado pela DAM Comércio de Alimentos, versão completa com o
 * prêmio de assiduidade), genericizado com {{EMPRESA_NOME}}/
 * {{EMPRESA_CNPJ}} pra servir de base a qualquer empresa nova. Igual a
 * TERMOS_CONTRATO: é só o ponto de partida — a empresa edita livremente
 * a partir daqui em /ged/regulamento (inclusive os valores do prêmio de
 * assiduidade, que são só um exemplo de política, não uma regra fixa do
 * sistema). Sem o Sumário do documento original: os números de página
 * não fariam sentido num PDF gerado dinamicamente. */
export const REGULAMENTO_INTERNO_PADRAO: string[] = [
  "Este Regulamento Interno é uma ferramenta oficial de integração, orientação e padronização de condutas dentro da {{EMPRESA_NOME}}. Ele estabelece regras claras de funcionamento, comportamento, direitos, deveres e responsabilidades, garantindo um ambiente de trabalho organizado, seguro, produtivo e juridicamente protegido.",
  "Todas as normas aqui descritas fazem parte integrante do Contrato Individual de Trabalho, nos termos da CLT. O desconhecimento deste Regulamento Interno não poderá ser alegado como justificativa para descumprimento de regras.",
  "1. CULTURA E PRINCÍPIOS DA EMPRESA",
  "Nossa empresa atua no ramo de alimentação e delivery, onde qualidade, higiene, disciplina, agilidade e responsabilidade não são diferenciais — são obrigações. Esperamos que cada empregado(a): cuide da empresa como se fosse sua; respeite processos, hierarquia e normas; tenha postura profissional, ética e responsável; busque soluções, nunca problemas. Iniciativa é valorizada, desde que alinhada e autorizada pelo superior imediato.",
  "2. OS 10 MANDAMENTOS DA EMPRESA",
  "Todos os empregados devem saber de cor e seguir rigorosamente: 1. Cuidarás da empresa como se fosse tua, protegendo bens, marcas, receitas e processos. 2. Cumprirás horários, escalas e ordens, sem atrasos, improvisos ou desculpas. 3. Respeitarás as normas de higiene e segurança alimentar, sem exceções. 4. Jamais consumirás produtos da empresa, salvo autorização expressa e documentada. 5. Não utilizarás celular, fones ou aparelhos sonoros durante o expediente. 6. Usarás uniforme completo, limpo e adequado, sempre que fornecido. 7. Respeitarás colegas, líderes e clientes, mantendo postura ética e profissional. 8. Não portarás adornos, joias ou acessórios em áreas operacionais. 9. Manterás sigilo absoluto sobre informações internas da empresa. 10. Cumprirás este regulamento integralmente, ciente de que o descumprimento gera sanções.",
  "3. REGISTRO E CONTRATO DE TRABALHO",
  "Todo empregado admitido passará por contrato de experiência de 30 dias, podendo ser renovado por mais 60 dias, conforme CLT. É obrigação do empregado manter seus dados atualizados, comunicando imediatamente alterações de: endereço; estado civil; dependentes; telefones e contatos.",
  "4. JORNADA DE TRABALHO E ESCALA",
  "Turno da Manhã: Segunda a Domingo, 09h00 às 17h20, intervalo de 1 (uma) hora, 1 folga semanal conforme escala. Turno da Noite: Segunda a Domingo, 14h50 às 23h10, intervalo de 1 (uma) hora, 1 folga semanal conforme escala. Todos os empregados têm direito a 1 (um) domingo de folga por mês, conforme legislação.",
  "A jornada poderá ser prorrogada sempre que solicitada pela empresa, em situações excepcionais, necessidade operacional ou força maior, devendo ser cumprida pelo empregado.",
  "5. HORAS EXTRAS E ADICIONAL NOTURNO",
  "Hora extra: toda hora trabalhada além de 7h20 diárias, podendo ocorrer em situações excepcionais ou força maior. Adicional noturno: horas trabalhadas entre 22h e 5h, conforme legislação.",
  "6. UNIFORME E APRESENTAÇÃO PESSOAL",
  "Uso de Uniforme — Quando fornecido, o uniforme é de uso obrigatório e exclusivo para o trabalho. Deve estar limpo, conservado e adequado durante toda a jornada. Sempre que estiver rasgado, manchado ou danificado, deverá ser devolvido à empresa para solicitação de substituição. Na rescisão do contrato de trabalho, o empregado é obrigado a devolver todo o uniforme recebido — a não devolução autoriza a empresa a realizar descontos legais na rescisão, conforme CLT.",
  "7. PROIBIÇÕES",
  "É expressamente proibido, sem qualquer exceção: uso de anéis, alianças, brincos, pulseiras, colares, relógios, bijuterias, piercings ou quaisquer adornos; unhas grandes, pintadas, postiças ou de gel; barba sem proteção adequada; maquiagem excessiva; qualquer item que comprometa a higiene, segurança alimentar ou imagem profissional; furto de qualquer dinheiro, utensílio, insumos e produtos da loja — a pessoa será responsabilizada criminalmente e responderá por justa causa trabalhista. O descumprimento desta cláusula configura falta grave, sujeita a demissão por justa causa.",
  "8. HIGIENE E SEGURANÇA ALIMENTAR",
  "Por se tratar de manipulação de alimentos: lavar as mãos ao iniciar o trabalho e no mínimo duas vezes por hora; nunca trabalhar com ferimentos sem proteção; uso de luvas quando necessário; cumprir todas as normas sanitárias vigentes. O descumprimento destas regras é considerado falta grave.",
  "9. CELULAR, FONES E APARELHOS ELETRÔNICOS – FALTA GRAVE",
  "É terminantemente proibido durante o expediente: uso de telefone celular; uso de fones de ouvido; uso de aparelhos sonoros; qualquer distração eletrônica nas áreas operacionais. O celular poderá ser utilizado exclusivamente nos intervalos ou fora do ambiente de trabalho e para atendimentos telefônicos de emergência. O descumprimento acarretará sanções disciplinares progressivas, podendo chegar à demissão por justa causa.",
  "10. CONSUMO DE PRODUTOS DA EMPRESA – PROIBIÇÃO ABSOLUTA",
  "É vedado o consumo de produtos sem registro prévio e autorização conforme política interna, sendo permitido apenas nas condições formalmente estabelecidas pela empresa, incluindo alimentos, bebidas, insumos e sobras de produção. Qualquer consumo sem autorização expressa, formal e documentada será caracterizado como falta grave, passível de demissão por justa causa.",
  "11. CONSUMO DE PRODUTOS E BEBIDAS POR EMPREGADOS",
  "Todo empregado da {{EMPRESA_NOME}} possui o direito de consumir produtos e bebidas comercializados pela empresa, desde que respeitadas rigorosamente as regras abaixo, criadas para garantir organização, controle, transparência e justiça com todos. O empregado tem direito a 15% de desconto sobre qualquer produto ou bebida consumida, desde que todas as regras sejam cumpridas.",
  "Formas de pagamento — Pagamento imediato: o empregado pode pagar no ato da compra, utilizando o sistema normal de vendas, já com o desconto de 15% aplicado. Desconto em folha: é obrigatório anotar o consumo no caderno de controle ou no Sistema de Controle de Consumo, e informar imediatamente os responsáveis, patrões ou gerentes sobre o consumo realizado. É expressamente proibido consumir qualquer produto sem anotação e sem aviso prévio aos responsáveis.",
  "A empresa possui câmeras de monitoramento e conta também com o apoio da própria equipe. Informações sobre consumo irregular podem ser identificadas por imagens, controles internos ou comunicadas por colegas de trabalho. Caso seja constatado o consumo de qualquer produto sem a devida anotação e comunicação, ficam estabelecidas as seguintes consequências: perda imediata do desconto de 15%, sendo cobrado o valor integral do produto; aplicação de advertências e penalidades internas, conforme este regulamento; possibilidade de adoção de medidas jurídicas cabíveis, uma vez que tal conduta poderá ser caracterizada como apropriação indébita, nos termos da legislação vigente. O descumprimento destas regras será tratado como falta grave, não sendo aceita a alegação de desconhecimento, uma vez que este regulamento é lido, explicado e assinado pelo empregado.",
  "12. ÁLCOOL, DROGAS, ARMAS E FUMO",
  "É proibido comparecer ou permanecer no trabalho sob efeito de álcool ou entorpecentes; portar, consumir ou comercializar bebidas alcoólicas; portar armas de qualquer espécie. Fumantes: a empresa desencoraja fortemente saídas frequentes para fumar — cada saída gera perda média de 10 minutos, impactando diretamente o desempenho da equipe e sobrecarregando colegas que não fumam, o que é considerado injusto e antiético. Não fume durante o horário de trabalho; utilize exclusivamente o intervalo para fumar, se necessário; leve em consideração o impacto direto no time e na operação.",
  "13. SIGILO E CONFIDENCIALIDADE",
  "É obrigação do empregado manter sigilo absoluto sobre receitas, processos, valores, estratégias e informações internas.",
  "14. MONITORAMENTO POR CÂMERAS (VÍDEO E ÁUDIO)",
  "Todas as dependências da empresa são monitoradas por câmeras que gravam vídeo e voz, de forma contínua. O empregado declara estar plenamente ciente e autoriza expressamente que as gravações sejam utilizadas pela empresa sempre que julgar necessário, inclusive para apuração de faltas, medidas disciplinares, processos internos e defesa jurídica da empresa. O monitoramento ocorre conforme a Lei nº 13.709/2018 (LGPD).",
  "15. COLEGUISMO, RESPEITO E TRABALHO EM EQUIPE",
  "É obrigação de todos manter um ambiente de respeito, cooperação e profissionalismo. São inadmissíveis brigas, discussões por ego e conflitos entre turnos. Cada empregado deve zelar pela empresa como um todo, ajudando colegas, mantendo o ambiente limpo e organizado, sem apontar dedos. A cozinha é uma só e a operação funciona como equipe integrada — em momentos de maior demanda, urgência ou aperto operacional, é esperado que todos colaborem em atividades compatíveis com a rotina do restaurante, ajudando colegas e setores. O respeito mútuo é princípio inegociável.",
  "16. MEDIDAS DISCIPLINARES",
  "O descumprimento das normas acarretará: 1. Advertência verbal; 2. Advertência escrita; 3. Suspensão; 4. Demissão por justa causa.",
  "17. DO PRÊMIO DE ASSIDUIDADE E DESEMPENHO",
  "O referido prêmio não integra a remuneração do(a) empregado(a) para quaisquer efeitos legais, não se incorporando ao contrato de trabalho e não servindo de base de cálculo para encargos trabalhistas e previdenciários, tais como FGTS, INSS, férias, 13º salário, aviso prévio ou horas extras. O pagamento do prêmio é de caráter eventual, facultativo e discricionário, podendo ser concedido ou não a cada período, conforme avaliação interna do empregador, não constituindo direito adquirido, ainda que pago em períodos anteriores.",
  "Para eventual concessão do prêmio, poderão ser considerados, de forma cumulativa ou isolada, a critério exclusivo do empregador: assiduidade (ausência de faltas injustificadas); pontualidade; cumprimento integral da jornada de trabalho; desempenho nas atividades exercidas; cumprimento das normas internas da empresa.",
  "Dos critérios objetivos para concessão do prêmio — o Prêmio de Assiduidade e Desempenho terá como base o valor máximo de R$ 300,00 (trezentos reais) mensais. I – Assiduidade: o valor do prêmio sofrerá descontos conforme ocorrências no período de apuração — falta injustificada: desconto de R$ 50,00 por ocorrência. II – Condições para pagamento: o valor do prêmio será de até R$ 300,00 (trezentos reais) mensais, pago de forma quinzenal, no valor de R$ 150,00 (cento e cinquenta reais), em cartão benefício, condicionado ao atendimento dos critérios estabelecidos neste termo — faltas justificadas mediante atestado médico válido não gerarão desconto, desde que apresentadas conforme as normas da empresa. III – Regras gerais: considera-se falta injustificada toda ausência não previamente autorizada ou não comprovada por documento válido; os critérios acima não afastam a necessidade de cumprimento das normas internas da empresa.",
  "O pagamento permanece condicionado à liberalidade do empregador, nos termos deste instrumento. O pagamento em cartão benefício não possui natureza salarial, não sendo considerado remuneração, não podendo ser convertido em espécie ou incorporado ao salário do(a) empregado(a) para quaisquer efeitos legais. O(A) empregado(a) declara ciência de que o pagamento do prêmio não possui habitualidade obrigatória, podendo ser suspenso, alterado ou cancelado a qualquer tempo, a critério exclusivo do empregador, sem que isso configure alteração contratual lesiva.",
  "DISPOSIÇÕES FINAIS",
  "Este Regulamento Interno poderá ser alterado a qualquer momento, conforme necessidade da empresa. Ao assinar o termo de ciência, o empregado declara: que recebeu o Regulamento Interno; leu integralmente; compreendeu; concorda; compromete-se a cumprir todas as normas.",
  "OBSERVAÇÃO FINAL – MUITO IMPORTANTE — a {{EMPRESA_NOME}} adota padrões rigorosos de conduta, disciplina e cumprimento de normas, essenciais para o adequado funcionamento da operação e manutenção da qualidade dos serviços. Este Regulamento Interno estabelece, de forma clara e objetiva, as regras, deveres e responsabilidades dos empregados, integrando o contrato de trabalho — seu conteúdo é apresentado, explicado e formalmente aceito no momento da admissão.",
  "O cumprimento das normas aqui previstas é obrigatório, sendo esperado de todos os empregados comportamento compatível com os padrões da empresa. O desconhecimento das regras não será aceito como justificativa para seu descumprimento. A aplicação de medidas disciplinares será realizada com base em critérios objetivos, análise da situação concreta, gravidade da conduta e eventuais circunstâncias envolvidas, sempre em conformidade com a legislação vigente.",
  "O descumprimento das normas poderá resultar na aplicação de medidas disciplinares progressivas, tais como advertência verbal, advertência escrita, suspensão e, nos casos mais graves, rescisão do contrato de trabalho por justa causa, conforme previsto na legislação trabalhista. Ao permanecer vinculado à empresa, o empregado declara estar ciente das regras estabelecidas e compromete-se a cumpri-las, reconhecendo que o respeito a este Regulamento Interno é fundamental para a manutenção de um ambiente de trabalho organizado, seguro e profissional.",
  "DECLARAÇÃO DE CIÊNCIA E CONCORDÂNCIA\n\nEu, ______________________________________, declaro que recebi, li e concordo integralmente com o Regulamento Interno da {{EMPRESA_NOME}}, comprometendo-me a cumprir todas as normas aqui estabelecidas.\n\n______________________, ____ de _______________ de ______.\n\n\nNOME COMPLETO                                    ASSINATURA DO EMPREGADO",
];

export const REGULAMENTO_INTERNO_PADRAO_TEXTO = termosParaTexto(REGULAMENTO_INTERNO_PADRAO);

/** Resolve o texto efetivo do regulamento interno de uma empresa —
 * custom-ou-padrão (mesmo formato de resolverTermos/resolverContratoCltTermos),
 * com os tokens de nome/CNPJ sempre substituídos pelos dados reais da
 * empresa, tanto no padrão quanto no texto customizado. */
export function resolverRegulamentoInterno(
  regulamentoInternoEmpresa: string | null,
  empresaNome: string,
  empresaCnpj: string
): string[] {
  const paragrafos =
    !regulamentoInternoEmpresa || !regulamentoInternoEmpresa.trim()
      ? [...REGULAMENTO_INTERNO_PADRAO]
      : textoParaTermos(regulamentoInternoEmpresa);
  return paragrafos.map((p) => substituirDadosEmpresa(p, empresaNome, empresaCnpj));
}

/** Resolve o texto efetivo do contrato CLT de uma empresa — custom-ou-
 * padrão, mesmo formato de resolverTermos. Sem cláusula de LGPD embutida
 * aqui: diferente do contrato EXTRA (que coleta dados na hora, pelo
 * totem), o vínculo CLT já tem seus dados tratados sob a base legal de
 * obrigação legal/execução de contrato de trabalho, não precisa do
 * mesmo aviso de consentimento do fluxo eventual. */
export function resolverContratoCltTermos(contratoCltTermosEmpresa: string | null): string[] {
  if (!contratoCltTermosEmpresa || !contratoCltTermosEmpresa.trim()) {
    return [...CONTRATO_CLT_TERMOS_PADRAO];
  }
  return textoParaTermos(contratoCltTermosEmpresa);
}

/** Modelos de papel padrão do sistema — PDF em branco pra imprimir e
 * preencher à mão (confirmado com o Thiago: não é preenchimento digital
 * no app). Adicionar um novo modelo padrão depois é só um item a mais
 * neste array, sem migração. */
export const MODELOS_PADRAO_PAPEL: readonly { slug: string; nome: string; colunas: string[] }[] = [
  {
    slug: "caixa-gordura",
    nome: "Controle de limpeza de caixa de gordura",
    colunas: ["Data", "Horário", "Responsável", "Assinatura"],
  },
  {
    slug: "troca-oleo-fritadeira",
    nome: "Planilha de controle de filtro/troca de óleo",
    // `colunas` fica só de referência aqui — esse modelo tem layout
    // próprio (marcadores de Manhã/Noite, Filtrado/Trocado já impressos
    // em cada linha), renderizado por gerarPdfControleTrocaOleo, não pelo
    // gerador genérico de colunas livres. Ver o dispatch por slug em
    // /ged/modelos/papel/[slug]/pdf/route.ts.
    colunas: ["Data", "Turno", "Filtrado", "Trocado", "Litros adicionados", "Responsável"],
  },
  {
    slug: "limpeza-banheiro",
    nome: "Controle de limpeza de banheiro",
    colunas: ["Data", "Horário", "Responsável", "Assinatura"],
  },
  {
    slug: "temperatura-geladeira",
    nome: "Controle de temperatura de geladeiras/freezers",
    colunas: ["Data", "Horário", "Equipamento", "Temperatura (°C)", "Responsável"],
  },
];

/** Monta o snapshot de dados congelado em DocumentoGed.snapshotDados —
 * um lugar só pra essa lista de campos, evita repetir em cada tela de
 * geração (advertência/suspensão/contrato). Congela também os dados da
 * empresa: se ela trocar nome/CNPJ depois, o histórico não deveria
 * mudar retroativamente. */
export function montarSnapshotPessoa(
  pessoa: Pick<Pessoa, "nome" | "documento" | "tipoDocumento" | "ctpsNumero" | "ctpsSerieUf" | "pisPasepNit">,
  vinculo: Pick<VinculoPessoaEmpresa, "cargo" | "matriculaInterna" | "dataAdmissao">,
  empresa: { nome: string; cnpj: string }
) {
  return {
    pessoaNome: pessoa.nome,
    pessoaDocumento: pessoa.documento,
    pessoaTipoDocumento: pessoa.tipoDocumento,
    ctpsNumero: pessoa.ctpsNumero,
    ctpsSerieUf: pessoa.ctpsSerieUf,
    pisPasepNit: pessoa.pisPasepNit,
    cargo: vinculo.cargo,
    matriculaInterna: vinculo.matriculaInterna,
    dataAdmissao: vinculo.dataAdmissao,
    empresaNome: empresa.nome,
    empresaCnpj: empresa.cnpj,
  };
}

export type SnapshotDadosGed = ReturnType<typeof montarSnapshotPessoa>;

/// Identificadores do modeloSuspensao escolhido no formulário — mesmo
/// espírito de MODELO_ADVERTENCIA_GENERICA_ID, usados tanto no client
/// (GerarDocumentoForm) quanto na action e congelados em
/// SnapshotSuspensaoGed.modelo pra a rota de PDF saber qual layout usar
/// ao reabrir um documento antigo (nunca recalcula: sem "modelo" no
/// snapshot = documento antigo, cai no layout "motivo-livre" de sempre).
export const MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID = "falta-injustificada";
export const MODELO_SUSPENSAO_MOTIVO_LIVRE_ID = "motivo-livre";

/// Item do histórico disciplinar (advertências/suspensões anteriores)
/// congelado dentro do snapshot da suspensão por falta injustificada —
/// ver montarHistoricoDisciplinar em src/app/ged/actions.ts. Congelado na
/// geração (mesma filosofia de corpoTexto): reabrir um PDF antigo mostra
/// o histórico de QUANDO foi gerado, mesmo que documentos novos sejam
/// criados depois.
export type HistoricoDisciplinarItem = { tipo: "ADVERTENCIA" | "SUSPENSAO"; data: string; motivo: string };

/// Suspensão guarda campos extras no mesmo snapshotDados (motivo, dias,
/// período) — armazenados congelados junto do resto, já que são
/// específicos de cada suspensão gerada, não da pessoa em si.
export type SnapshotSuspensaoGed = SnapshotDadosGed & {
  modelo: typeof MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID | typeof MODELO_SUSPENSAO_MOTIVO_LIVRE_ID;
  motivo: string;
  diasSuspensao: number;
  periodoInicio: string;
  dataRetorno: string;
  dataFalta?: string;
  periodoTurno?: string;
  historico?: HistoricoDisciplinarItem[];
};

/** Resume um DocumentoGed (advertência ou suspensão) anterior numa frase
 * curta pra entrar na lista de histórico disciplinar ("referente a ___")
 * do novo modelo de suspensão por falta injustificada. Prioriza o nome
 * do modelo usado (já é uma frase curta: "Falta injustificada", "Atraso
 * reiterado"...); só quando foi motivo livre é que precisa extrair o
 * motivo digitado de dentro do texto de praxe (ver montarAdvertenciaGenerica) —
 * se a extração falhar (texto customizado/antigo em formato diferente),
 * cai pro corpoTexto inteiro truncado, nunca quebra a geração. */
export function montarMotivoResumoDocumentoGed(doc: { modeloNome: string; corpoTexto: string }): string {
  let texto: string;
  if (doc.modeloNome === "Motivo livre") {
    const m = doc.corpoTexto.match(/em razão de ([\s\S]+?), em desacordo/);
    texto = m ? m[1].trim() : doc.corpoTexto.trim();
  } else if (doc.modeloNome && doc.modeloNome !== "Suspensão") {
    texto = doc.modeloNome;
  } else {
    texto = doc.corpoTexto.trim();
  }
  texto = texto.length > 160 ? `${texto.slice(0, 160).trim()}…` : texto;
  return texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : texto;
}

/// Termo de ciência guarda qual termo do catálogo foi usado — corpoTexto
/// já vem com os parágrafos congelados (join("\n\n")), então o PDF nem
/// precisa reconsultar TERMOS_CIENCIA_PADRAO pra reabrir um antigo.
export type SnapshotTermoCienciaGed = SnapshotDadosGed & {
  termoSlug: string;
  termoNome: string;
};

/** Confere que um DocumentoGed pertence a esta empresa — molde de
 * vagaDaEmpresa (src/app/vagas/actions.ts). Lança erro se não achar ou se
 * for de outra empresa, nunca devolve dado de empresa errada. */
export async function documentoGedDaEmpresa(documentoId: number, empresaId: number) {
  const documento = await prisma.documentoGed.findUnique({ where: { id: documentoId } });
  if (!documento || documento.empresaId !== empresaId) {
    throw new Error("Esse documento não pertence a esta empresa.");
  }
  return documento;
}
