import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autenticarApiExterna } from "@/lib/api-externa/auth";

/** Pix efetivamente pagos (status CONCLUIDO, nunca PENDENTE/FALHOU) num
 * período, da empresa dona da chave usada — `?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`,
 * os dois obrigatórios, interpretados em horário de Brasília (igual todo
 * o resto do sistema, ver src/lib/data.ts). Filtra por `processadoEm`
 * (quando o Pix foi confirmado de verdade — ver finalizarTransferenciaAsaas
 * em src/lib/pagamentos/asaas-status.ts), não por `criadoEm` (quando o
 * registro de pagamento foi só criado, ainda pendente). */
export async function GET(request: Request) {
  const auth = await autenticarApiExterna(request, "pagamentos");
  if ("erro" in auth) {
    return NextResponse.json({ erro: auth.erro }, { status: auth.status });
  }

  const url = new URL(request.url);
  const inicioStr = url.searchParams.get("inicio");
  const fimStr = url.searchParams.get("fim");
  if (!inicioStr || !fimStr) {
    return NextResponse.json(
      { erro: "Informe os parâmetros inicio e fim, no formato YYYY-MM-DD (ex.: ?inicio=2026-09-01&fim=2026-09-30)." },
      { status: 400 }
    );
  }

  const inicio = new Date(`${inicioStr}T00:00:00-03:00`);
  const fim = new Date(`${fimStr}T23:59:59-03:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return NextResponse.json({ erro: "Datas inválidas — use o formato YYYY-MM-DD." }, { status: 400 });
  }
  if (inicio > fim) {
    return NextResponse.json({ erro: "\"inicio\" não pode ser depois de \"fim\"." }, { status: 400 });
  }

  const pagamentos = await prisma.pagamento.findMany({
    where: {
      status: "CONCLUIDO",
      processadoEm: { gte: inicio, lte: fim },
      turno: { empresaId: auth.empresaId },
    },
    select: {
      id: true,
      valor: true,
      processadoEm: true,
      chavePixDestino: true,
      tipoChavePixDestino: true,
      idTransacaoExterna: true,
      turno: { select: { id: true, pessoa: { select: { nome: true } } } },
    },
    orderBy: { processadoEm: "asc" },
  });

  const valorTotal = pagamentos.reduce((soma, p) => soma + Number(p.valor), 0);

  return NextResponse.json({
    periodo: { inicio: inicioStr, fim: fimStr },
    total: pagamentos.length,
    valorTotal,
    pagamentos: pagamentos.map((p) => ({
      id: p.id,
      turnoId: p.turno.id,
      pessoaNome: p.turno.pessoa.nome,
      valor: Number(p.valor),
      chavePixDestino: p.chavePixDestino,
      tipoChavePixDestino: p.tipoChavePixDestino,
      idTransacaoExterna: p.idTransacaoExterna,
      processadoEm: p.processadoEm,
    })),
  });
}
