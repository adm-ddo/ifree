import "server-only";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/lib/pagamentos";
import type { FrequenciaPagamento } from "@/generated/prisma/enums";

/** Sem PAYMENT_PROVIDER configurado (padrão hoje, sem credenciais de
 * nenhum provedor real), o pagamento fica registrado como pendente pro
 * admin resolver na mão — não existe envio automático de PIX ainda.
 *
 * PAYMENT_PROVIDER=asaas é um interruptor GLOBAL (uma env var só, não dá
 * pra configurar por empresa), mas cada empresa cliente só é automatizada
 * de verdade depois de conectar a PRÓPRIA subconta (ver conectarContaAsaas
 * em src/app/configuracoes/actions.ts) — por isso checa
 * ContaAsaasEmpresa por dentro em vez de confiar só na env var: ligar
 * PAYMENT_PROVIDER=asaas em produção não pode virar ERRO_PAGAMENTO pra
 * toda empresa que ainda não conectou nada — essas continuam exatamente
 * no fluxo manual de sempre, sem perceber diferença nenhuma.
 *
 * Além disso, só quem recebe DIARIA é elegível pra automação — SEMANAL
 * continua sempre manual (decisão do Thiago em 2026-09-07: dá mais controle
 * enquanto não existe um botão de "pagar todo mundo semanal no dia certo").
 * Isso vale mesmo pra empresa com conta Asaas conectada e provider ligado. */
async function automatizado(empresaId: number, frequenciaPagamentoAplicada: FrequenciaPagamento): Promise<boolean> {
  if (frequenciaPagamentoAplicada !== "DIARIA") return false;
  const provider = process.env.PAYMENT_PROVIDER;
  if (provider === "mock" || provider === "stone") return true;
  if (provider === "asaas") {
    // pixLiberado (não só a conta existir) — a Asaas exige uma verificação
    // de identidade separada da aprovação geral da conta antes de liberar
    // Pix; sem isso a subconta nem recebe nem envia (ver
    // src/lib/pagamentos/asaas-conta-status.ts). Empresa recém-conectada
    // mas ainda sem essa verificação cai no fluxo manual de sempre, igual
    // quem nunca conectou nada. desconectadoEm cobre o caso do dono desligar
    // a automação de propósito (ver desconectarContaAsaas) — a conexão
    // continua existindo, só a automação para.
    const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({
      where: { empresaId },
      select: { pixLiberado: true, desconectadoEm: true },
    });
    return contaAsaas?.pixLiberado === true && contaAsaas.desconectadoEm === null;
  }
  return false;
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

  if (!(await automatizado(turno.empresaId, turno.frequenciaPagamentoAplicada))) {
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
    update: { status: "PROCESSANDO", tentativas: { increment: 1 }, pagoAutomaticamente: true },
    create: {
      turnoId: turno.id,
      valor: turno.valorTotal,
      chavePixDestino: chavePix,
      tipoChavePixDestino: tipoChavePix,
      status: "PROCESSANDO",
      tentativas: 1,
      pagoAutomaticamente: true,
    },
  });

  try {
    const resultado = await paymentService().enviarPagamento({
      turnoId: turno.id,
      empresaId: turno.empresaId,
      valor: Number(pagamento.valor),
      chavePixDestino: pagamento.chavePixDestino,
      tipoChavePixDestino: pagamento.tipoChavePixDestino,
    });

    if (resultado.sucesso) {
      if (resultado.final) {
        // Provedor síncrono (mock) — já sabemos o resultado definitivo
        // nesta mesma chamada.
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

      // Provedor assíncrono (ex.: Asaas) — só aceitou pra processar. Fica
      // em PROCESSANDO (já é o status atual) só guardando o id externo;
      // quem confirma de verdade é o webhook de status da transferência
      // (ou o cron de conferência, se o webhook não chegar) — ver
      // finalizarTransferenciaAsaas em src/lib/pagamentos/asaas-status.ts.
      // Turno volta pra CONCLUIDO (não PAGO ainda, só até a confirmação
      // real) — precisa do update explícito porque esta chamada pode ser
      // um RETRY depois de um ERRO_PAGAMENTO (ver tentarPagamentoNovamente
      // em src/app/pagamentos/actions.ts): sem isso, uma tentativa aceita
      // com sucesso pela Asaas ficava com o Pagamento em PROCESSANDO mas o
      // Turno preso em ERRO_PAGAMENTO, mostrando erro pro admin mesmo com
      // o pagamento andando normal (visto na prática com a Carboni e Dier,
      // 2026-09-09).
      await prisma.$transaction([
        prisma.pagamento.update({
          where: { id: pagamento.id },
          data: { idTransacaoExterna: resultado.idTransacaoExterna, erro: null },
        }),
        prisma.turno.update({ where: { id: turno.id }, data: { status: "CONCLUIDO" } }),
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
