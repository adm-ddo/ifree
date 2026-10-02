import { NextResponse } from "next/server";
import { autenticarApiExterna } from "@/lib/api-externa/auth";
import { buscarSaldoAsaas } from "@/lib/pagamentos/asaas-deposito";

/** Saldo ATUAL (consulta ao vivo na Asaas, não um valor guardado) da conta
 * Pix da empresa dona da chave usada — pra um sistema financeiro externo
 * puxar sem precisar logar no painel. Ver src/lib/api-externa/auth.ts pra
 * como a chave é gerada/validada. */
export async function GET(request: Request) {
  const auth = await autenticarApiExterna(request, "saldo");
  if ("erro" in auth) {
    return NextResponse.json({ erro: auth.erro }, { status: auth.status });
  }

  const saldo = await buscarSaldoAsaas(auth.empresaId);
  if (saldo === null) {
    return NextResponse.json(
      { erro: "Não foi possível consultar o saldo agora — tente de novo em instantes." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    saldo,
    moeda: "BRL",
    consultadoEm: new Date().toISOString(),
  });
}
