"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { revalidatePath } from "next/cache";
import { criarDepositoAsaas } from "@/lib/pagamentos/asaas-deposito";
import { processarPagamentoTurno } from "@/lib/pagamentos/processar";

/** Confirma que o admin já fez o PIX manualmente pelo banco (fora deste
 * sistema, já que ainda não há integração automática com a Stone) — marca
 * o pagamento como concluído e o turno como pago. */
export async function marcarPagamentoPagoManualmente(turnoId: number) {
  const sessao = await requireModulo("pagamentos");

  const turno = await prisma.turno.findUnique({ where: { id: turnoId } });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Esse turno não pertence a esta empresa.");
  }

  await prisma.$transaction([
    prisma.pagamento.update({
      where: { turnoId },
      data: { status: "CONCLUIDO", processadoEm: new Date(), erro: null, pagoAutomaticamente: false },
    }),
    prisma.turno.update({ where: { id: turnoId }, data: { status: "PAGO" } }),
  ]);

  revalidatePath("/pagamentos");
  revalidatePath("/turnos");
  revalidatePath(`/turnos/${turnoId}`);
  revalidatePath(`/freelancers/${turno.pessoaId}`);
  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  revalidatePath("/financeiro");
}

/** Repete a tentativa de PIX automático de um turno em ERRO_PAGAMENTO — só
 * faz sentido chamar depois que a causa da falha original foi corrigida
 * (ex.: chave de API sem permissão de transferência, ver
 * atualizarChaveAsaas em src/app/configuracoes/actions.ts), já que
 * processarPagamentoTurno vai tentar exatamente o mesmo caminho de novo.
 * Mesma função usada no primeiro check-out — não existe lógica de retry
 * separada, é literalmente rodar o fluxo normal outra vez. */
export async function tentarPagamentoNovamente(turnoId: number): Promise<{ sucesso: boolean }> {
  const sessao = await requireModulo("pagamentos");

  const turno = await prisma.turno.findUnique({ where: { id: turnoId } });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Esse turno não pertence a esta empresa.");
  }

  const resultado = await processarPagamentoTurno(turnoId);

  revalidatePath("/pagamentos");
  revalidatePath(`/turnos/${turnoId}`);
  return resultado;
}

export type MarcarVariosState = { erro: string } | { pagos: number };

/** Versão em lote de marcarPagamentoPagoManualmente — mesma lógica, só que
 * validando todos os turnoIds de uma vez (filtra os que não pertencem a
 * esta empresa, mesmo padrão de src/app/equipe/actions.ts) e atualizando
 * todo mundo numa única transação com updateMany. Retorna { erro } em vez
 * de lançar exceção — chamada direto pelo botão, sem <form action> (ver o
 * mesmo comentário em converterParaClt sobre mensagens de throw ficarem
 * redacted em produção nesse tipo de chamada). */
export async function marcarVariosPagosManualmente(turnoIds: number[]): Promise<MarcarVariosState> {
  const sessao = await requireModulo("pagamentos");

  const validos = await prisma.turno.findMany({
    where: { id: { in: turnoIds }, empresaId: sessao.empresaEfetivoId },
    select: { id: true, pessoaId: true },
  });
  if (validos.length === 0) {
    return { erro: "Nenhum pagamento válido selecionado." };
  }
  const ids = validos.map((t) => t.id);

  await prisma.$transaction([
    prisma.pagamento.updateMany({
      where: { turnoId: { in: ids } },
      data: { status: "CONCLUIDO", processadoEm: new Date(), erro: null, pagoAutomaticamente: false },
    }),
    prisma.turno.updateMany({ where: { id: { in: ids } }, data: { status: "PAGO" } }),
  ]);

  revalidatePath("/pagamentos");
  revalidatePath("/turnos");
  for (const id of ids) revalidatePath(`/turnos/${id}`);
  for (const pessoaId of new Set(validos.map((t) => t.pessoaId))) revalidatePath(`/freelancers/${pessoaId}`);
  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  revalidatePath("/financeiro");

  return { pagos: ids.length };
}

export type AgruparEMarcarState = { erro: string } | { grupoId: number };

/** Agrupa vários turnos da MESMA pessoa numa única transferência PIX —
 * pensado pra quem recebe por semana (evita ter que somar os turnos na mão
 * antes de mandar um PIX só). Cria um GrupoPagamento com o valor somado,
 * liga cada Pagamento a ele (habilita a cor/selo compartilhado na tela e o
 * recibo consolidado em /pagamentos/grupo/[id]/recibo/pdf) e já marca todos
 * como pagos, igual marcarVariosPagosManualmente — cada recibo individual
 * continua disponível normalmente (o agrupamento não substitui nada). */
export async function agruparEMarcarPagos(turnoIds: number[]): Promise<AgruparEMarcarState> {
  const sessao = await requireModulo("pagamentos");

  if (turnoIds.length < 2) {
    return { erro: "Selecione pelo menos 2 turnos da mesma pessoa pra agrupar." };
  }

  const turnos = await prisma.turno.findMany({
    where: { id: { in: turnoIds }, empresaId: sessao.empresaEfetivoId },
    select: { id: true, pessoaId: true, valorTotal: true },
  });
  if (turnos.length < 2) {
    return { erro: "Selecione pelo menos 2 turnos válidos da mesma pessoa pra agrupar." };
  }
  const pessoaIds = new Set(turnos.map((t) => t.pessoaId));
  if (pessoaIds.size > 1) {
    return { erro: "Só é possível agrupar turnos da mesma pessoa." };
  }

  const ids = turnos.map((t) => t.id);
  const valorTotal = turnos.reduce(
    (soma, t) => soma + (t.valorTotal !== null ? Number(t.valorTotal) : 0),
    0
  );

  const grupo = await prisma.$transaction(async (tx) => {
    const criado = await tx.grupoPagamento.create({
      data: {
        empresaId: sessao.empresaEfetivoId,
        pessoaId: turnos[0].pessoaId,
        valorTotal,
        criadoPorEmail: sessao.email,
      },
    });
    await tx.pagamento.updateMany({
      where: { turnoId: { in: ids } },
      data: {
        status: "CONCLUIDO",
        processadoEm: new Date(),
        erro: null,
        pagoAutomaticamente: false,
        grupoPagamentoId: criado.id,
      },
    });
    await tx.turno.updateMany({ where: { id: { in: ids } }, data: { status: "PAGO" } });
    return criado;
  });

  revalidatePath("/pagamentos");
  revalidatePath("/turnos");
  for (const id of ids) revalidatePath(`/turnos/${id}`);
  revalidatePath(`/freelancers/${turnos[0].pessoaId}`);
  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  revalidatePath("/financeiro");

  return { grupoId: grupo.id };
}

export type DepositoAsaasState =
  | { erro: string; id?: undefined; qrCode?: undefined; qrCodeImagemUrl?: undefined }
  | { erro?: undefined; id: number; qrCode: string; qrCodeImagemUrl: string }
  | undefined;

/** Gera o PIX de depósito na subconta Asaas da empresa (o "crédito" usado
 * depois pra pagar os extras — ver src/lib/pagamentos/asaas-deposito.ts).
 * Aberto a qualquer usuário com acesso à empresa, mesmo motivo de
 * conectarContaAsaas em src/app/configuracoes/actions.ts. */
export async function solicitarDepositoAsaas(
  _prev: DepositoAsaasState,
  formData: FormData
): Promise<DepositoAsaasState> {
  const sessao = await requireModulo("pagamentos");
  if (!sessao.empresaEfetivoId) return { erro: "Selecione uma empresa primeiro." };

  const valor = Number(String(formData.get("valor") ?? "").replace(",", "."));
  if (!Number.isFinite(valor) || valor <= 0) return { erro: "Informe um valor válido." };

  const resultado = await criarDepositoAsaas(sessao.empresaEfetivoId, valor);
  if (!resultado.sucesso) return { erro: resultado.erro };

  revalidatePath("/pagamentos");
  return { id: resultado.id, qrCode: resultado.qrCode, qrCodeImagemUrl: resultado.qrCodeImagemUrl };
}
