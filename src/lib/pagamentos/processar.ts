import "server-only";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/lib/pagamentos";

/** Sem PAYMENT_PROVIDER configurado (padrão hoje, sem credenciais da
 * Stone), o pagamento fica registrado como pendente pro admin resolver na
 * mão — não existe envio automático de PIX ainda. */
function automatizado(): boolean {
  return process.env.PAYMENT_PROVIDER === "mock" || process.env.PAYMENT_PROVIDER === "stone";
}

/** Garante o registro de Pagamento pro turno e, só quando há um
 * PaymentService automatizado configurado, tenta enviar o PIX de verdade.
 * Usada logo após o check-out no totem e no retry manual do admin em
 * /pagamentos — mesmo caminho, mesma lógica de estado. Nunca lança: falha
 * de pagamento é um resultado de negócio (ERRO_PAGAMENTO), não uma exceção
 * que deveria derrubar quem chamou. */
export async function processarPagamentoTurno(turnoId: number): Promise<{ sucesso: boolean }> {
  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: { pessoa: { select: { chavePix: true, tipoChavePix: true } } },
  });

  if (!turno || turno.valorTotal === null || !["CONCLUIDO", "ERRO_PAGAMENTO"].includes(turno.status)) {
    return { sucesso: false };
  }

  // Turno só existe pro caminho EXTRA (CLT usa RegistroPonto, sem
  // pagamento) — chavePix é obrigatória nesse caminho desde o cadastro no
  // totem, então chegar aqui sem ela indica dado corrompido, não um caso
  // de negócio válido.
  const { chavePix, tipoChavePix } = turno.pessoa;
  if (chavePix === null || tipoChavePix === null) {
    throw new Error(`Turno ${turno.id}: pessoa sem chave PIX cadastrada.`);
  }

  const pagamentoExistente = await prisma.pagamento.findUnique({ where: { turnoId: turno.id } });

  if (!automatizado()) {
    // Modo manual: só garante que o registro existe (pra aparecer no
    // painel de pagamentos pendentes) e não mexe no status do turno — ele
    // continua CONCLUIDO até o admin marcar como pago manualmente.
    if (!pagamentoExistente) {
      await prisma.pagamento.create({
        data: {
          turnoId: turno.id,
          valor: turno.valorTotal,
          chavePixDestino: chavePix,
          tipoChavePixDestino: tipoChavePix,
          status: "PENDENTE",
        },
      });
    }
    return { sucesso: false };
  }

  const pagamento = await prisma.pagamento.upsert({
    where: { turnoId: turno.id },
    update: { status: "PROCESSANDO", tentativas: { increment: 1 } },
    create: {
      turnoId: turno.id,
      valor: turno.valorTotal,
      chavePixDestino: chavePix,
      tipoChavePixDestino: tipoChavePix,
      status: "PROCESSANDO",
      tentativas: 1,
    },
  });

  try {
    const resultado = await paymentService().enviarPagamento({
      turnoId: turno.id,
      valor: Number(pagamento.valor),
      chavePixDestino: pagamento.chavePixDestino,
    });

    if (resultado.sucesso) {
      await prisma.$transaction([
        prisma.pagamento.update({
          where: { id: pagamento.id },
          data: {
            status: "CONCLUIDO",
            idTransacaoExterna: resultado.idTransacaoExterna,
            processadoEm: new Date(),
            erro: null,
          },
        }),
        prisma.turno.update({ where: { id: turno.id }, data: { status: "PAGO" } }),
      ]);
      return { sucesso: true };
    }

    await prisma.$transaction([
      prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { status: "FALHOU", erro: resultado.erro },
      }),
      prisma.turno.update({ where: { id: turno.id }, data: { status: "ERRO_PAGAMENTO" } }),
    ]);
    return { sucesso: false };
  } catch (err) {
    const erro = err instanceof Error ? err.message : "Erro desconhecido ao processar pagamento.";
    await prisma.$transaction([
      prisma.pagamento.update({ where: { id: pagamento.id }, data: { status: "FALHOU", erro } }),
      prisma.turno.update({ where: { id: turno.id }, data: { status: "ERRO_PAGAMENTO" } }),
    ]);
    return { sucesso: false };
  }
}
