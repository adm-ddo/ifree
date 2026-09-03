import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Checagem rápida de saúde do sistema — pensada pra ser chamada antes de
 * uma apresentação importante, ou por um monitor externo (UptimeRobot,
 * Better Uptime, etc.) que avise proativamente se o banco parar de
 * responder, em vez de descobrir isso ao vivo numa demonstração. */
export async function GET() {
  const inicio = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      bancoDeDadosMs: Date.now() - inicio,
      verificadoEm: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "erro",
        erro: err instanceof Error ? err.message : "Erro desconhecido.",
        verificadoEm: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
