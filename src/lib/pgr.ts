import "server-only";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import {
  PERGUNTAS_PGR,
  ORDEM_DIMENSOES_PGR,
  classificarRiscoPgr,
  MINIMO_RESPOSTAS_RECORTE_PGR,
  type DimensaoPgr,
  type NivelRiscoPgr,
} from "@/lib/pgr-questionario";

/** Garante que a empresa tem um token de pesquisa pública, gerando um se
 * ainda não existir — mesmo idioma de garantirTokenDenuncia
 * (src/lib/etica.ts). */
export async function garantirTokenPgr(empresaId: number): Promise<string> {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { tokenPgr: true },
  });
  if (empresa.tokenPgr) return empresa.tokenPgr;

  const token = randomBytes(24).toString("base64url");
  await prisma.empresa.update({ where: { id: empresaId }, data: { tokenPgr: token } });
  return token;
}

export async function resolverEmpresaPorTokenPgr(token: string) {
  return prisma.empresa.findUnique({ where: { tokenPgr: token }, select: { id: true, nome: true } });
}

/** Confere se o usuário é responsável pelo PGR NESTA empresa — mesmo
 * padrão de usuarioEhResponsavelEtica/Ged (src/lib/etica.ts,
 * src/lib/ged.ts). Master sempre conta como responsável. */
export async function usuarioEhResponsavelPgr(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<boolean> {
  if (isMaster) return true;
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    select: { responsavelPgr: true },
  });
  return vinculo?.responsavelPgr ?? false;
}

export async function requireResponsavelPgr() {
  const sessao = await requireTenant();
  const podeAcessar = await usuarioEhResponsavelPgr(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster);
  if (!podeAcessar) redirect("/v2/dashboard");
  return sessao;
}

export async function buscarCicloAbertoPgr(empresaId: number) {
  return prisma.cicloPgr.findFirst({ where: { empresaId, status: "ABERTO" } });
}

export async function buscarUltimoCicloEncerradoPgr(empresaId: number) {
  return prisma.cicloPgr.findFirst({
    where: { empresaId, status: "ENCERRADO" },
    orderBy: { encerradoEm: "desc" },
  });
}

export async function abrirCicloPgr(empresaId: number) {
  const jaAberto = await buscarCicloAbertoPgr(empresaId);
  if (jaAberto) return jaAberto;
  return prisma.cicloPgr.create({ data: { empresaId } });
}

export async function encerrarCicloPgr(cicloId: number) {
  return prisma.cicloPgr.update({
    where: { id: cicloId },
    data: { status: "ENCERRADO", encerradoEm: new Date() },
  });
}

type RespostaBruta = { cargo: string | null; respostas: unknown };

/// Um valor de risco (já invertido quando a pergunta era positiva) por
/// dimensão, dentro de UMA resposta — usado tanto pro agregado geral
/// quanto pelo recorte por cargo.
function valoresPorDimensao(resposta: RespostaBruta): Map<DimensaoPgr, number[]> {
  const mapa = new Map<DimensaoPgr, number[]>();
  const respostasObj =
    resposta.respostas && typeof resposta.respostas === "object" ? (resposta.respostas as Record<string, number>) : {};
  for (const pergunta of PERGUNTAS_PGR) {
    const bruto = respostasObj[pergunta.id];
    if (typeof bruto !== "number" || bruto < 1 || bruto > 5) continue;
    const valor = pergunta.invertido ? 6 - bruto : bruto;
    const atual = mapa.get(pergunta.dimensao) ?? [];
    atual.push(valor);
    mapa.set(pergunta.dimensao, atual);
  }
  return mapa;
}

function mediaPorDimensao(respostas: RespostaBruta[]): { dimensao: DimensaoPgr; media: number; nivel: NivelRiscoPgr }[] {
  const somaPorDimensao = new Map<DimensaoPgr, { soma: number; qtd: number }>();
  for (const resposta of respostas) {
    for (const [dimensao, valores] of valoresPorDimensao(resposta)) {
      const atual = somaPorDimensao.get(dimensao) ?? { soma: 0, qtd: 0 };
      atual.soma += valores.reduce((a, b) => a + b, 0);
      atual.qtd += valores.length;
      somaPorDimensao.set(dimensao, atual);
    }
  }
  return ORDEM_DIMENSOES_PGR.map((dimensao) => {
    const acumulado = somaPorDimensao.get(dimensao);
    const media = acumulado && acumulado.qtd > 0 ? acumulado.soma / acumulado.qtd : 0;
    return { dimensao, media, nivel: classificarRiscoPgr(media) };
  });
}

export type MatrizPgr = {
  totalRespostas: number;
  geral: { dimensao: DimensaoPgr; media: number; nivel: NivelRiscoPgr }[];
  porCargo: { cargo: string; totalRespostas: number; linhas: { dimensao: DimensaoPgr; media: number; nivel: NivelRiscoPgr }[] }[];
};

/** Agrega as respostas de um ciclo em uma matriz de risco por dimensão —
 * geral (sempre aparece, mesmo com poucas respostas — só some se não
 * tiver nenhuma) e por cargo (só aparece separado quando esse cargo tem
 * MINIMO_RESPOSTAS_RECORTE_PGR respostas ou mais, pra não arriscar
 * reidentificar alguém numa empresa pequena com um único funcionário
 * naquele cargo). */
export async function calcularMatrizPgr(cicloId: number): Promise<MatrizPgr> {
  const respostas = await prisma.respostaPgr.findMany({
    where: { cicloId },
    select: { cargo: true, respostas: true },
  });

  const porCargoBruto = new Map<string, RespostaBruta[]>();
  for (const r of respostas) {
    const chave = r.cargo?.trim() || "Não informado";
    const atual = porCargoBruto.get(chave) ?? [];
    atual.push(r);
    porCargoBruto.set(chave, atual);
  }

  const porCargo = [...porCargoBruto.entries()]
    .filter(([, lista]) => lista.length >= MINIMO_RESPOSTAS_RECORTE_PGR)
    .map(([cargo, lista]) => ({
      cargo,
      totalRespostas: lista.length,
      linhas: mediaPorDimensao(lista),
    }))
    .sort((a, b) => a.cargo.localeCompare(b.cargo));

  return {
    totalRespostas: respostas.length,
    geral: mediaPorDimensao(respostas),
    porCargo,
  };
}

/** Cria uma resposta anônima — sem nenhum vínculo com pessoa/usuário
 * (mesmo espírito de criarDenunciaComProtocolo, só que aqui nem
 * protocolo tem: não existe "acompanhar resposta" depois, é
 * genuinamente descartável). Valida que existe ciclo ABERTO pra essa
 * empresa antes de aceitar. */
export async function criarRespostaPgrPublica(
  empresaId: number,
  cargo: string | null,
  respostas: Record<string, number>
): Promise<{ erro: string } | { sucesso: true }> {
  const ciclo = await buscarCicloAbertoPgr(empresaId);
  if (!ciclo) return { erro: "Não há nenhuma pesquisa aberta no momento pra essa empresa." };

  await prisma.respostaPgr.create({
    data: { cicloId: ciclo.id, cargo: cargo?.trim() || null, respostas },
  });
  return { sucesso: true };
}
