import "server-only";
import { prisma } from "@/lib/prisma";
import { calcularMatch } from "@/lib/match";
import { enviarEmailVagaCompativel, enviarEmailCandidatoCompativel } from "@/lib/email";
import { processarEmLotes } from "@/lib/lote";

/** Quantos e-mails desta leva mandar em paralelo por vez — alto o
 * bastante pra não fazer uma leva de milhares de matches (empresa
 * grande, vaga genérica) demorar uma eternidade, baixo o bastante pra
 * não estourar limite de requisições/segundo da Resend. */
const CONCORRENCIA_ENVIO = 5;

/** Teto de quantos e-mails uma única chamada (dentro do after() da
 * action, ou uma passada do cron) tenta mandar de uma vez. O resto fica
 * com notificadoEm=null pro cron /api/cron/enviar-notificacoes-pendentes
 * pegar na passada seguinte — existe pra nunca deixar uma leva gigante
 * de matches rodando por tempo indefinido dentro do limite de duração
 * da função serverless. */
const TETO_ENVIO_POR_CHAMADA = 300;

/** Roda logo depois de criarVaga (src/app/vagas/actions.ts) — acha toda
 * Pessoa disponível cujo perfil combina com esta vaga RECÉM-publicada
 * (mesma regra de calcularMatch já usada na candidatura) e registra
 * VagaMatchPassivo pra cada uma (createMany + skipDuplicates faz o
 * dedupe sem N idas ao banco). NÃO manda e-mail aqui — só grava quem
 * está pendente; ver processarNotificacoesPendentesVagaNova pro envio de
 * verdade. Rápido mesmo com milhares de pessoas cadastradas (é só um
 * findMany leve + um INSERT em lote), por isso pode ficar síncrono
 * dentro da action sem travar a resposta pra empresa. */
export async function registrarMatchesVagaNova(vagaId: number): Promise<{ pendentes: number }> {
  const vaga = await prisma.vaga.findUnique({
    where: { id: vagaId },
    select: { habilidadesProcuradas: true },
  });
  if (!vaga) return { pendentes: 0 };

  const pessoas = await prisma.pessoa.findMany({
    where: { disponivelParaOportunidades: true, contaDesativadaEm: null, contaExcluidaEm: null },
    select: { id: true, habilidades: true },
  });

  const idsCompativeis = pessoas
    .filter((p) => calcularMatch(vaga.habilidadesProcuradas, p.habilidades))
    .map((p) => p.id);

  if (idsCompativeis.length === 0) return { pendentes: 0 };

  await prisma.vagaMatchPassivo.createMany({
    data: idsCompativeis.map((pessoaId) => ({ vagaId, pessoaId, origem: "VAGA_NOVA" as const })),
    skipDuplicates: true,
  });

  const pendentes = await prisma.vagaMatchPassivo.count({
    where: { vagaId, origem: "VAGA_NOVA", notificadoEm: null },
  });
  return { pendentes };
}

/** Manda de fato os e-mails de "vaga nova compatível" que ainda estão
 * pendentes (notificadoEm=null) — chamada dentro de after() logo depois
 * de registrarMatchesVagaNova (não bloqueia a resposta pra empresa) e
 * de novo pelo cron de varredura, que pega qualquer sobra (ex.: a leva
 * era grande demais pra caber no tempo do after(), ou a instância caiu
 * no meio). Cada item só marca notificadoEm depois do envio confirmado
 * — se falhar, fica pendente e uma passada futura tenta de novo. */
export async function processarNotificacoesPendentesVagaNova(
  limite = TETO_ENVIO_POR_CHAMADA
): Promise<{ enviados: number }> {
  const pendentes = await prisma.vagaMatchPassivo.findMany({
    where: { origem: "VAGA_NOVA", notificadoEm: null },
    take: limite,
    select: {
      id: true,
      vagaId: true,
      pessoaId: true,
      pessoa: { select: { nome: true, email: true, selo: true } },
      vaga: {
        select: { cargo: true, nomeFantasia: true, empresa: { select: { nome: true } } },
      },
    },
  });
  if (pendentes.length === 0) return { enviados: 0 };

  let enviados = 0;
  await processarEmLotes(pendentes, CONCORRENCIA_ENVIO, async (match) => {
    // Alerta por e-mail de vaga compatível é benefício de selo Prata/Ouro
    // (ver src/lib/selo-freelancer.ts) — Bronze não recebe, mas marca
    // notificadoEm igual pra não ficar reprocessando pra sempre o mesmo
    // match de quem nunca vai virar Prata/Ouro. Só falha de ENVIO de
    // verdade (abaixo) continua deixando notificadoEm null pra retry.
    if (match.pessoa.selo === "BRONZE") {
      await prisma.vagaMatchPassivo.update({ where: { id: match.id }, data: { notificadoEm: new Date() } });
      return;
    }
    if (match.pessoa.email) {
      const { sucesso } = await enviarEmailVagaCompativel(
        match.pessoa.email,
        match.pessoa.nome,
        match.vaga.cargo,
        match.vaga.nomeFantasia || match.vaga.empresa.nome
      );
      if (!sucesso) {
        console.error(`Falha ao notificar pessoa ${match.pessoaId} sobre vaga ${match.vagaId} — fica pendente.`);
        return;
      }
    }
    await prisma.vagaMatchPassivo.update({ where: { id: match.id }, data: { notificadoEm: new Date() } });
    enviados++;
  });
  return { enviados };
}

/** Roda logo depois de atualizarPerfilProfissional (src/app/portal/actions.ts)
 * — acha toda Vaga ABERTA cujas habilidadesProcuradas combinam com o
 * perfil RECÉM-atualizado desta pessoa e registra VagaMatchPassivo pra
 * cada uma. Mesma divisão de registrarMatchesVagaNova: só grava quem
 * está pendente, não manda e-mail aqui (ver
 * processarNotificacoesPendentesPerfil). */
export async function registrarMatchesNovoPerfil(pessoaId: number): Promise<{ pendentes: number }> {
  const pessoa = await prisma.pessoa.findUnique({
    where: { id: pessoaId },
    select: {
      habilidades: true,
      disponivelParaOportunidades: true,
      contaDesativadaEm: true,
      contaExcluidaEm: true,
    },
  });
  if (!pessoa || !pessoa.disponivelParaOportunidades || pessoa.contaDesativadaEm || pessoa.contaExcluidaEm) {
    return { pendentes: 0 };
  }

  const vagas = await prisma.vaga.findMany({
    where: { status: "ABERTA" },
    select: { id: true, habilidadesProcuradas: true },
  });

  const idsCompativeis = vagas
    .filter((v) => calcularMatch(v.habilidadesProcuradas, pessoa.habilidades))
    .map((v) => v.id);

  if (idsCompativeis.length === 0) return { pendentes: 0 };

  await prisma.vagaMatchPassivo.createMany({
    data: idsCompativeis.map((vagaId) => ({ vagaId, pessoaId, origem: "PERFIL_ATUALIZADO" as const })),
    skipDuplicates: true,
  });

  const pendentes = await prisma.vagaMatchPassivo.count({
    where: { pessoaId, origem: "PERFIL_ATUALIZADO", notificadoEm: null },
  });
  return { pendentes };
}

/** Manda de fato os e-mails de "candidato compatível" pendentes — mesmo
 * espírito de processarNotificacoesPendentesVagaNova, só que aqui cada
 * match avisa TODO usuário com acesso à empresa dona da vaga (empresas
 * costumam ter poucos usuários, então esse loop interno não precisa de
 * lote/concorrência — o gargalo de escala é sempre o número de matches,
 * não de usuários por empresa). */
export async function processarNotificacoesPendentesPerfil(
  limite = TETO_ENVIO_POR_CHAMADA
): Promise<{ enviados: number }> {
  const pendentes = await prisma.vagaMatchPassivo.findMany({
    where: { origem: "PERFIL_ATUALIZADO", notificadoEm: null },
    take: limite,
    select: {
      id: true,
      vagaId: true,
      pessoaId: true,
      vaga: {
        select: {
          cargo: true,
          nomeFantasia: true,
          empresa: {
            select: { nome: true, usuarios: { select: { usuario: { select: { email: true } } } } },
          },
        },
      },
    },
  });
  if (pendentes.length === 0) return { enviados: 0 };

  let enviados = 0;
  await processarEmLotes(pendentes, CONCORRENCIA_ENVIO, async (match) => {
    const empresaNome = match.vaga.nomeFantasia || match.vaga.empresa.nome;
    const resultados = await Promise.all(
      match.vaga.empresa.usuarios.map(({ usuario }) =>
        enviarEmailCandidatoCompativel(usuario.email, empresaNome, match.vaga.cargo)
      )
    );
    // Só marca enviado se pelo menos um usuário da empresa recebeu o aviso
    // — empresa sem usuário nenhum (não deveria acontecer) ou com falha em
    // todos os envios fica pendente pra tentar de novo depois.
    if (resultados.length === 0 || !resultados.some((r) => r.sucesso)) {
      console.error(`Falha ao notificar empresa sobre match no perfil ${match.pessoaId} / vaga ${match.vagaId} — fica pendente.`);
      return;
    }
    await prisma.vagaMatchPassivo.update({ where: { id: match.id }, data: { notificadoEm: new Date() } });
    enviados++;
  });
  return { enviados };
}
