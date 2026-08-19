import "server-only";
import { prisma } from "@/lib/prisma";
import { put, list, del } from "@vercel/blob";

const RETENCAO_DIAS = 30;

/** Backup "lógico" (dados, não schema): um JSON com o conteúdo de cada
 * tabela de negócio, gerado via Prisma Client — não depende do binário
 * `pg_dump`, que não está disponível no runtime serverless da Vercel.
 * `Sessao` fica de fora de propósito: são tokens efêmeros sem valor de
 * negócio, e não faz sentido guardar credenciais de sessão num backup. */
async function coletarDados() {
  const [empresas, usuarios, usuarioEmpresas, totens, pessoas, vinculos, funcoes, turnos, pagamentos] =
    await Promise.all([
      prisma.empresa.findMany(),
      prisma.usuario.findMany(),
      prisma.usuarioEmpresa.findMany(),
      prisma.totem.findMany(),
      prisma.pessoa.findMany(),
      prisma.vinculoPessoaEmpresa.findMany(),
      prisma.funcao.findMany(),
      prisma.turno.findMany(),
      prisma.pagamento.findMany(),
    ]);

  return {
    versao: 1,
    geradoEm: new Date().toISOString(),
    empresas,
    usuarios,
    usuarioEmpresas,
    totens,
    pessoas,
    vinculos,
    funcoes,
    turnos,
    pagamentos,
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
