import "server-only";
import { randomBytes, randomInt, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant, verificarSenha } from "@/lib/auth";
import type { CategoriaDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

// Constantes puras (categorias/status/labels) moradas em etica-constantes.ts
// — sem "server-only", pra poderem ser importadas direto por componentes
// cliente sem puxar Prisma/pg pro bundle do browser. Re-exportadas aqui
// pra todo código server-side continuar importando só de "@/lib/etica".
export {
  CATEGORIAS_DENUNCIA,
  LABEL_CATEGORIA_DENUNCIA,
  STATUS_DENUNCIA_ORDEM,
  LABEL_STATUS_DENUNCIA,
} from "@/lib/etica-constantes";

const ALFABETO_SENHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O/1/I/L, evita confusão na digitação

/** Protocolo de 10 dígitos, formatado em blocos pra digitação fácil no
 * formulário de acompanhamento (ex.: "1234-567890"). Único no sistema
 * inteiro (não escopado por empresa) — quem acompanha só digita
 * protocolo+senha, sem precisar informar de qual empresa é. */
export function formatarProtocolo(protocolo: string): string {
  return `${protocolo.slice(0, 4)}-${protocolo.slice(4)}`;
}

function gerarProtocoloBruto(): string {
  return String(randomInt(0, 10_000_000_000)).padStart(10, "0");
}

/** Senha de 8 caracteres alfanuméricos sem ambíguos, mostrada uma única
 * vez na hora da criação — nunca fica salva em texto puro (ver
 * hashSenha/verificarSenha em src/lib/auth.ts), então não tem como
 * recuperar depois. Mesmo espírito de canal de ética de mercado (Contorno
 * Ético, Vale etc.): perder a senha significa perder o acesso àquele
 * protocolo especificamente. */
export function gerarSenhaDenuncia(): string {
  const bytes = randomBytes(8);
  let senha = "";
  for (const b of bytes) senha += ALFABETO_SENHA[b % ALFABETO_SENHA.length];
  return senha;
}

export type DadosNovaDenuncia = {
  empresaId: number;
  senhaHash: string | null;
  identificado: boolean;
  pessoaId: number | null;
  categoria: CategoriaDenuncia;
  descricao: string;
  prazoSlaEm: Date;
};

/** Cria a denúncia com um protocolo garantidamente único, tentando de
 * novo em caso de colisão (praticamente nunca acontece com 10 dígitos,
 * mas sai mais barato que confiar cego como o token do Totem). Também já
 * grava a primeira linha da linha do tempo (RECEBIDO, automática) e o log
 * de auditoria de criação. */
export async function criarDenunciaComProtocolo(dados: DadosNovaDenuncia) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const protocolo = gerarProtocoloBruto();
    try {
      const denuncia = await prisma.denuncia.create({
        data: {
          ...dados,
          protocolo,
          etapas: { create: { status: "RECEBIDO" } },
          logs: { create: { acao: "denuncia_criada", detalhe: dados.categoria } },
        },
      });
      return denuncia;
    } catch (err) {
      const codigo = (err as { code?: string } | null)?.code;
      if (codigo !== "P2002") throw err;
      // Colisão de protocolo — tenta de novo com um número novo.
    }
  }
  throw new Error("Não foi possível gerar um protocolo único. Tente de novo.");
}

/** Garante que a empresa tem um token de canal público, gerando um se
 * ainda não existir — mesmo idioma de gerarTokenTotem (aleatório,
 * base64url). Sem checagem de auth de propósito: chamada tanto da
 * Central de Ética (dono já autenticado) quanto da resolução do totem
 * (kiosk público, autenticado só pelo próprio token do totem) — os dois
 * lugares já sabem o empresaId de fontes confiáveis antes de chegar
 * aqui. */
export async function garantirTokenDenuncia(empresaId: number): Promise<string> {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { tokenDenuncia: true },
  });
  if (empresa.tokenDenuncia) return empresa.tokenDenuncia;

  const token = randomBytes(24).toString("base64url");
  await prisma.empresa.update({ where: { id: empresaId }, data: { tokenDenuncia: token } });
  return token;
}

export function calcularPrazoSla(slaDias: number, criadoEm: Date): Date {
  return new Date(criadoEm.getTime() + slaDias * 24 * 60 * 60 * 1000);
}

export function slaVencido(denuncia: { status: StatusDenuncia; prazoSlaEm: Date }): boolean {
  return denuncia.status !== "FINALIZADO" && denuncia.prazoSlaEm < new Date();
}

/** Confere se o usuário é responsável pela Central de Ética NESTA empresa
 * — sem redirecionar, pra uso em lugares que só precisam de um boolean
 * (layout raiz, /configuracoes). Master sempre conta como responsável
 * (precisa poder ajudar mesmo sem UsuarioEmpresa na empresa impersonada). */
export async function usuarioEhResponsavelEtica(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<boolean> {
  if (isMaster) return true;
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    select: { responsavelEtica: true },
  });
  return vinculo?.responsavelEtica ?? false;
}

/** Use no topo de toda page/action da Central de Ética (/etica/**) — a
 * área mais confidencial do sistema, por isso restrita a quem for
 * explicitamente marcado (ver /equipe), diferente do resto do painel
 * onde requireTenant() já basta. */
export async function requireResponsavelEtica() {
  const sessao = await requireTenant();
  const podeAcessar = await usuarioEhResponsavelEtica(
    sessao.usuarioId,
    sessao.empresaEfetivoId,
    sessao.isMaster
  );
  if (!podeAcessar) redirect("/v2/dashboard");
  return sessao;
}

/** Helper único de log de auditoria — toda action que muda algo numa
 * denúncia passa por aqui, pra nunca esquecer de registrar (comprovação
 * de conformidade depende de ter o rastro completo). */
export async function registrarLogAuditoria(
  denunciaId: number,
  acao: string,
  detalhe?: string,
  autorEmail?: string
): Promise<void> {
  await prisma.logAuditoriaDenuncia.create({
    data: { denunciaId, acao, detalhe: detalhe ?? null, autorEmail: autorEmail ?? null },
  });
}

/** Resolve a empresa dona do canal público de denúncia pelo token
 * (/denuncia/[token]/**) — mesmo idioma de resolverTotemAtivo
 * (src/lib/totem.ts): token aleatório, não sequencial, funciona como
 * senha de acesso ao canal daquela empresa. */
export async function resolverEmpresaPorTokenDenuncia(token: string) {
  return prisma.empresa.findUnique({
    where: { tokenDenuncia: token },
    select: { id: true, nome: true, slaDenunciaDias: true },
  });
}

const QR_DENUNCIA_TTL_SEGUNDOS = 5 * 60;

/// Assina a expiração usando o próprio tokenDenuncia como chave — ele já é
/// um segredo aleatório de 24 bytes (mesmo idioma do token do Totem), então
/// não precisa de nenhum segredo novo (nem variável de ambiente) só pra
/// isso. Sem persistir nada no banco: a validade é só matemática (HMAC +
/// timestamp), então gerar um QR novo é uma função pura, sem round-trip.
function assinarExpiracaoQr(tokenDenuncia: string, exp: number): string {
  return createHmac("sha256", tokenDenuncia).update(String(exp)).digest("base64url").slice(0, 16);
}

/** Link de denúncia com validade curta, pensado pro QR code exibido no
 * totem — quem escaneia cai na mesma landing pública de sempre
 * (/denuncia/[token]), só que com um `exp`+`sig` na URL que expira sozinho
 * depois de QR_DENUNCIA_TTL_SEGUNDOS. O link "evergreen" (sem esses
 * parâmetros, o mesmo copiado em /etica) continua funcionando pra sempre —
 * a expiração só vale pra quem passou pelo QR do totem. */
export function gerarLinkQrDenuncia(tokenDenuncia: string, baseUrl: string): { url: string; expiraEm: Date } {
  const exp = Math.floor(Date.now() / 1000) + QR_DENUNCIA_TTL_SEGUNDOS;
  const assinatura = assinarExpiracaoQr(tokenDenuncia, exp);
  return {
    url: `${baseUrl}/denuncia/${tokenDenuncia}?exp=${exp}&sig=${assinatura}`,
    expiraEm: new Date(exp * 1000),
  };
}

/** true se a URL tem parâmetros de QR (exp+sig) E eles são inválidos ou já
 * venceram — false tanto pro link evergreen normal (sem esses parâmetros)
 * quanto pra um QR ainda dentro da validade. */
export function qrDenunciaExpirado(tokenDenuncia: string, exp: string | null, sig: string | null): boolean {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isInteger(expNum)) return true;
  if (expNum * 1000 < Date.now()) return true;
  return assinarExpiracaoQr(tokenDenuncia, expNum) !== sig;
}

/** Núcleo de verificação de protocolo+senha — só lê e confere, NÃO cria
 * sessão (quem chama decide isso depois de qualquer checagem extra, como
 * o escopo por empresa do canal público/totem). Compartilhado entre o
 * fluxo público (src/app/denuncia/[token]/acompanhar/actions.ts, que
 * ainda confere se a denúncia é desta empresa) e o do Portal
 * (src/app/portal/denuncias/acompanhar/actions.ts, que não escopa por
 * empresa — a pessoa já provou identidade logando no Portal, então pode
 * acompanhar qualquer protocolo seu, de qualquer empresa). */
export async function verificarProtocoloSenha(
  protocoloDigitado: string,
  senhaDigitada: string
): Promise<{ erro: string } | { denunciaId: number; empresaId: number }> {
  const protocolo = protocoloDigitado.replace(/\D/g, "");
  const senha = senhaDigitada.trim().toUpperCase();
  if (!protocolo || !senha) return { erro: "Informe o protocolo e a senha." };

  const denuncia = await prisma.denuncia.findUnique({
    where: { protocolo },
    select: { id: true, empresaId: true, senhaHash: true, identificado: true },
  });
  if (!denuncia || denuncia.identificado || !denuncia.senhaHash) {
    return { erro: "Protocolo ou senha inválidos." };
  }

  const senhaOk = await verificarSenha(senha, denuncia.senhaHash);
  if (!senhaOk) return { erro: "Protocolo ou senha inválidos." };

  return { denunciaId: denuncia.id, empresaId: denuncia.empresaId };
}

export const SESSAO_DENUNCIA_COOKIE = "sessao_denuncia_token";
const SESSAO_DENUNCIA_TTL_HORAS = 24;

/** Sessão leve criada depois de conferir protocolo+senha — só pra deixar
 * o polling do chat funcionar sem pedir a senha de novo a cada request
 * (ver SessaoDenunciaAnonima no schema). Vida curta (24h) de propósito:
 * não é um login de verdade, é só "prova que você acabou de confirmar a
 * senha desta denúncia". */
export async function criarSessaoDenunciaAnonima(denunciaId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSAO_DENUNCIA_TTL_HORAS * 60 * 60 * 1000);
  await prisma.sessaoDenunciaAnonima.create({ data: { token, denunciaId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(SESSAO_DENUNCIA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
}

/** Devolve o id da denúncia autorizada pela sessão anônima atual (cookie),
 * ou null se não houver sessão válida — quem chama decide o que fazer
 * (redirecionar pro formulário de protocolo+senha). */
export async function getDenunciaIdDaSessaoAnonima(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_DENUNCIA_COOKIE)?.value;
  if (!token) return null;

  const sessao = await prisma.sessaoDenunciaAnonima.findUnique({
    where: { token },
    select: { denunciaId: true, expiraEm: true },
  });
  if (!sessao || sessao.expiraEm < new Date()) return null;
  return sessao.denunciaId;
}
