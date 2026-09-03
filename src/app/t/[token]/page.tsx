import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverTotemAtivo } from "@/lib/totem";
import { resolverTermos } from "@/lib/termos";
import { garantirTokenDenuncia } from "@/lib/etica";
import TotemFlow from "./TotemFlow";

// Trava o zoom por pinça — o totem é um kiosk de toque único, dar zoom só
// atrapalha e some com botões da tela.
// interactiveWidget: "resizes-content" faz o navegador encolher a área da
// página quando o teclado virtual abre (em vez de só sobrepor a tela por
// cima), pra layout centralizado tipo o do totem recalcular e o campo em
// foco continuar visível acima do teclado.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return { manifest: `/t/${token}/manifest.webmanifest` };
}

export default async function TotemPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const totem = await resolverTotemAtivo(token);
  if (!totem) notFound();

  const [funcoes, empresa, tokenDenuncia] = await Promise.all([
    prisma.funcao.findMany({
      where: { empresaId: totem.empresaId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, valorHoraPadrao: true },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: totem.empresaId },
      select: { termosContrato: true, modoPausaDia: true, modoPausaNoite: true },
    }),
    garantirTokenDenuncia(totem.empresaId),
  ]);

  return (
    <TotemFlow
      token={token}
      empresaNome={totem.empresaNome}
      funcoes={funcoes.map((f) => ({ ...f, valorHoraPadrao: Number(f.valorHoraPadrao) }))}
      termos={resolverTermos(empresa.termosContrato, empresa.modoPausaDia, empresa.modoPausaNoite)}
      tokenDenuncia={tokenDenuncia}
    />
  );
}
