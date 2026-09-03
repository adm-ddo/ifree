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
 * Sessao, SessaoPessoa (tokens de login) e TokenAutenticacao/
 * TokenAutenticacaoPessoa (links de verificação de e-mail/redefinição de
 * senha, todos de curta duração). Todo o resto do schema — incluindo
 * cobrança/assinatura, histórico salarial, avaliações e o módulo Conecta
 * (vagas/candidaturas/conversas) — entra, porque perder isso silenciosamente
 * só apareceria numa recuperação de desastre real, tarde demais pra
 * consertar. Versão 3 do formato: soma as 7 tabelas que a versão 2 não
 * cobria (ver histórico do arquivo pra versão 2, só as 10 tabelas
 * originais). */
async function coletarDados() {
  const [
    empresas,
    cobrancasMensalidade,
    usuarios,
    usuarioEmpresas,
    totens,
    pessoas,
    vinculos,
    historicoSalarial,
    funcoes,
    turnos,
    avaliacoes,
    registrosPonto,
    pagamentos,
    vagas,
    candidaturas,
    conversas,
    mensagens,
  ] = await Promise.all([
    prisma.empresa.findMany(),
    prisma.cobrancaMensalidade.findMany(),
    prisma.usuario.findMany(),
    prisma.usuarioEmpresa.findMany(),
    prisma.totem.findMany(),
    prisma.pessoa.findMany(),
    prisma.vinculoPessoaEmpresa.findMany(),
    prisma.historicoSalarial.findMany(),
    prisma.funcao.findMany(),
    prisma.turno.findMany(),
    prisma.avaliacao.findMany(),
    prisma.registroPonto.findMany(),
    prisma.pagamento.findMany(),
    prisma.vaga.findMany(),
    prisma.candidatura.findMany(),
    prisma.conversa.findMany(),
    prisma.mensagem.findMany(),
  ]);

  return {
    versao: 3,
    geradoEm: new Date().toISOString(),
    empresas,
    cobrancasMensalidade,
    usuarios,
    usuarioEmpresas,
    totens,
    pessoas,
    vinculos,
    historicoSalarial,
    funcoes,
    turnos,
    avaliacoes,
    registrosPonto,
    pagamentos,
    vagas,
    candidaturas,
    conversas,
    mensagens,
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
