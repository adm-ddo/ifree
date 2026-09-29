import "server-only";
import { prisma } from "@/lib/prisma";
import { put, list, del } from "@vercel/blob";

const RETENCAO_DIAS = 30;

/** Backup "lógico" (dados, não schema): um JSON com o conteúdo de cada
 * tabela de negócio, gerado via Prisma Client — não depende do binário
 * `pg_dump`, que não está disponível no runtime serverless da Vercel.
 *
 * Ficam de fora DE PROPÓSITO só as tabelas puramente efêmeras, sem valor
 * de negócio nenhum se perdidas (a própria pessoa gera outra na hora):
 * Sessao, SessaoPessoa (tokens de login), TokenAutenticacao/
 * TokenAutenticacaoPessoa (links de verificação de e-mail/redefinição de
 * senha, todos de curta duração), ConviteEquipe (link de convite pra
 * entrar na equipe, expira sozinho), TentativaConfirmacaoIdentidade
 * (contador de tentativas de 2º fator, só importa em tempo real pro
 * auto-bloqueio) e SessaoDenunciaAnonima (token de acompanhamento de uma
 * denúncia anônima — a denúncia em si, essa entra no backup). Todo o
 * resto do schema entra, porque perder isso silenciosamente só apareceria
 * numa recuperação de desastre real, tarde demais pra consertar.
 *
 * Versão 4 do formato (2026-09-29): auditoria encontrou 18 tabelas de
 * negócio criadas depois da v3 e nunca adicionadas aqui — incluindo o
 * módulo inteiro de Central de Ética (Denuncia e afins), PGR/NR-1 (risco
 * psicossocial, exigido por lei), GED (documentos/contratos assinados),
 * ExtraMarcado ("Free" marcado) e, mais crítico de todos,
 * ContaAsaasEmpresa — sem isso um restore não teria como reconectar o
 * pagamento automático de nenhuma empresa. Corrigido pra somar essas 18.
 * (Ver histórico do arquivo pra v2/v3, com menos tabelas.) */
async function coletarDados() {
  const [
    empresas,
    grupoEconomico,
    cobrancasMensalidade,
    usuarios,
    usuarioEmpresas,
    totens,
    pessoas,
    vinculos,
    restricoesHorarioDia,
    historicoSalarial,
    funcoes,
    turnos,
    avaliacoes,
    registrosPonto,
    pagamentos,
    contasAsaasEmpresa,
    depositosAsaas,
    gruposPagamento,
    vagas,
    candidaturas,
    extrasMarcados,
    vagaMatchPassivo,
    conversas,
    mensagens,
    denuncias,
    mensagensDenuncia,
    etapasDenuncia,
    logsAuditoriaDenuncia,
    documentosGed,
    modelosDocumentoGed,
    modelosPapelGed,
    entradasEpi,
    ciclosPgr,
    respostasPgr,
    acoesPgr,
  ] = await Promise.all([
    prisma.empresa.findMany(),
    prisma.grupoEconomico.findMany(),
    prisma.cobrancaMensalidade.findMany(),
    prisma.usuario.findMany(),
    prisma.usuarioEmpresa.findMany(),
    prisma.totem.findMany(),
    prisma.pessoa.findMany(),
    prisma.vinculoPessoaEmpresa.findMany(),
    prisma.restricaoHorarioDia.findMany(),
    prisma.historicoSalarial.findMany(),
    prisma.funcao.findMany(),
    prisma.turno.findMany(),
    prisma.avaliacao.findMany(),
    prisma.registroPonto.findMany(),
    prisma.pagamento.findMany(),
    prisma.contaAsaasEmpresa.findMany(),
    prisma.depositoAsaas.findMany(),
    prisma.grupoPagamento.findMany(),
    prisma.vaga.findMany(),
    prisma.candidatura.findMany(),
    prisma.extraMarcado.findMany(),
    prisma.vagaMatchPassivo.findMany(),
    prisma.conversa.findMany(),
    prisma.mensagem.findMany(),
    prisma.denuncia.findMany(),
    prisma.mensagemDenuncia.findMany(),
    prisma.etapaDenuncia.findMany(),
    prisma.logAuditoriaDenuncia.findMany(),
    prisma.documentoGed.findMany(),
    prisma.modeloDocumentoGed.findMany(),
    prisma.modeloPapelGed.findMany(),
    prisma.entradaEpi.findMany(),
    prisma.cicloPgr.findMany(),
    prisma.respostaPgr.findMany(),
    prisma.acaoPgr.findMany(),
  ]);

  return {
    versao: 4,
    geradoEm: new Date().toISOString(),
    empresas,
    grupoEconomico,
    cobrancasMensalidade,
    usuarios,
    usuarioEmpresas,
    totens,
    pessoas,
    vinculos,
    restricoesHorarioDia,
    historicoSalarial,
    funcoes,
    turnos,
    avaliacoes,
    registrosPonto,
    pagamentos,
    contasAsaasEmpresa,
    depositosAsaas,
    gruposPagamento,
    vagas,
    candidaturas,
    extrasMarcados,
    vagaMatchPassivo,
    conversas,
    mensagens,
    denuncias,
    mensagensDenuncia,
    etapasDenuncia,
    logsAuditoriaDenuncia,
    documentosGed,
    modelosDocumentoGed,
    modelosPapelGed,
    entradasEpi,
    ciclosPgr,
    respostasPgr,
    acoesPgr,
  };
}

export async function executarBackup(): Promise<{ caminho: string; tamanhoBytes: number }> {
  const dados = await coletarDados();
  const json = JSON.stringify(dados, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const caminho = `backups/backup-${timestamp}.json`;

  const blob = await put(caminho, json, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });

  await podarBackupsAntigos();

  return { caminho: blob.pathname, tamanhoBytes: json.length };
}

async function podarBackupsAntigos(): Promise<void> {
  const limite = Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000;
  const { blobs } = await list({ prefix: "backups/" });

  const antigos = blobs.filter((b) => new Date(b.uploadedAt).getTime() < limite);
  if (antigos.length === 0) return;

  await del(antigos.map((b) => b.url));
}
