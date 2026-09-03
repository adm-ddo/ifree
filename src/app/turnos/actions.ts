"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import { calcularValorTotal, calcularMinutosArredondados, calcularValorTurno, classificarTurno } from "@/lib/turno";
import { processarPagamentoTurno } from "@/lib/pagamentos/processar";
import { notaValida, tagsValidadas } from "@/lib/avaliacao";

export type CorrigirFuncaoState = { erro?: string; sucesso?: boolean } | undefined;

/** O dono corrige a função escolhida por engano na hora de bater o ponto
 * (ex.: extra selecionou o cargo errado no totem) — recalcula o valor do
 * turno pela função certa e deixa um rastro visível de que foi corrigido
 * por um administrador. Função só afeta o valor quando o modo de pagamento
 * aplicado é HORA; em DIARIA o valor é fixo e não muda (ver
 * calcularValorTurno em src/lib/turno.ts). */
export async function corrigirFuncaoTurno(
  _prev: CorrigirFuncaoState,
  formData: FormData
): Promise<CorrigirFuncaoState> {
  const sessao = await requireTenant();

  const turnoId = Number(formData.get("turnoId"));
  const novaFuncaoId = Number(formData.get("funcaoId"));
  if (!Number.isInteger(turnoId)) return { erro: "Turno inválido." };
  if (!Number.isInteger(novaFuncaoId)) return { erro: "Selecione uma função." };

  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: { funcao: true, pagamento: true },
  });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse turno não pertence a esta empresa." };
  }
  if (turno.status === "PAGO") {
    return { erro: "Esse turno já foi pago — não dá pra corrigir a função depois do pagamento." };
  }
  if (turno.pagamento?.status === "PROCESSANDO") {
    return { erro: "O pagamento desse turno está em processamento — aguarde terminar antes de corrigir." };
  }
  if (turno.funcaoId === novaFuncaoId) {
    return { erro: "Selecione uma função diferente da atual." };
  }

  const novaFuncao = await prisma.funcao.findUnique({ where: { id: novaFuncaoId } });
  if (!novaFuncao || novaFuncao.empresaId !== sessao.empresaEfetivoId || !novaFuncao.ativo) {
    return { erro: "Função inválida." };
  }

  let novoValorHora: number = Number(turno.valorHoraAplicado);
  let novoValorTotal: number | null = turno.valorTotal !== null ? Number(turno.valorTotal) : null;
  if (turno.modoPagamentoAplicado === "HORA") {
    novoValorHora = Number(novaFuncao.valorHoraPadrao);
    if (turno.minutosArredondados !== null) {
      novoValorTotal = calcularValorTotal(turno.minutosArredondados, novoValorHora);
    }
  }

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      funcaoId: novaFuncao.id,
      valorHoraAplicado: novoValorHora,
      valorTotal: novoValorTotal,
      funcaoOriginalNome: turno.funcaoOriginalNome ?? turno.funcao.nome,
      valorHoraOriginalAplicado: turno.valorHoraOriginalAplicado ?? turno.valorHoraAplicado,
      correcaoFuncaoEm: new Date(),
      correcaoFuncaoPorEmail: sessao.email,
    },
  });

  if (turno.pagamento && ["PENDENTE", "FALHOU"].includes(turno.pagamento.status) && novoValorTotal !== null) {
    await prisma.pagamento.update({
      where: { id: turno.pagamento.id },
      data: { valor: novoValorTotal },
    });
  }

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { sucesso: true };
}

export type CorrigirSaidaState = { erro?: string; sucesso?: boolean } | undefined;

/** O dono corrige o horário de saída de um turno já encerrado — só quando
 * a PRÓPRIA PESSOA não bateu a saída de verdade (turno fechado sozinho
 * pelo cron às 01h, `fechamentoAutomatico`, ou já corrigido antes por essa
 * mesma via) — nunca quando há foto/assinatura de saída reais, que são a
 * fonte de verdade do que aconteceu. Cobre problema técnico no totem,
 * esquecimento, etc.: recalcula horas e valor com o horário certo e deixa
 * rastro visível (correcaoSaidaEm/PorEmail, sempre a correção mais
 * recente; horaSaidaOriginal preserva o valor ANTES da primeira correção,
 * pra mostrar o que o sistema tinha calculado sozinho vs. o real — mesmo
 * espírito de auditoria de corrigirFuncaoTurno acima).
 *
 * Funciona mesmo em turnos já PAGOS — de propósito: o fechamento automático
 * errado pode ter acontecido há meses, bem antes de existir esta correção,
 * e o dono nem sempre lembra se já marcou como pago ou não (não tem envio
 * automático de PIX, é tudo manual). Corrige o registro de horas E o valor
 * (do turno e do Pagamento vinculado, mesmo se já CONCLUIDO) — decisão
 * explícita do dono: quer ver o valor certo primeiro, pra decidir depois
 * se precisa ajustar alguma diferença por fora do sistema, em vez de a
 * tela ficar mostrando um valor que ele sabe estar errado. */
export async function corrigirSaidaTurno(
  _prev: CorrigirSaidaState,
  formData: FormData
): Promise<CorrigirSaidaState> {
  const sessao = await requireTenant();

  const turnoId = Number(formData.get("turnoId"));
  const horaSaidaBruta = String(formData.get("horaSaida") ?? "");
  if (!Number.isInteger(turnoId)) return { erro: "Turno inválido." };

  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: {
      pagamento: true,
      empresa: {
        select: {
          horarioInicioDiaMin: true,
          horarioInicioNoiteMin: true,
          modoPausaDia: true,
          modoPausaNoite: true,
          diariaLimiarMeiaMin: true,
          diariaLimiarCompletaMin: true,
        },
      },
    },
  });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse turno não pertence a esta empresa." };
  }
  if (turno.status === "ABERTO") {
    return { erro: "Esse turno ainda está aberto — aguarde encerrar ou use o fechamento por conflito." };
  }
  if (turno.pagamento?.status === "PROCESSANDO") {
    return { erro: "O pagamento desse turno está em processamento — aguarde terminar antes de corrigir." };
  }
  if (!turno.fechamentoAutomatico && !turno.correcaoSaidaEm) {
    return {
      erro: "Esse turno foi encerrado pela própria pessoa (com foto/assinatura) — não é possível corrigir.",
    };
  }

  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(horaSaidaBruta);
  if (!m) return { erro: "Informe uma data e hora de saída válidas." };
  const horaSaida = instanteBrasil(m[1], Number(m[2]) * 60 + Number(m[3]));
  if (horaSaida <= turno.horaEntrada) {
    return { erro: "A saída precisa ser depois da entrada." };
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId: turno.pessoaId, empresaId: turno.empresaId } },
    select: { turnoPredefinido: true },
  });
  const modoPausaAplicavel = turno.turnoDobrado
    ? turno.empresa.modoPausaNoite
    : classificarTurno(
          turno.horaEntrada,
          vinculo?.turnoPredefinido ?? "LIVRE",
          turno.empresa.horarioInicioDiaMin,
          turno.empresa.horarioInicioNoiteMin
        ) === "DIA"
      ? turno.empresa.modoPausaDia
      : turno.empresa.modoPausaNoite;

  const elapsedMs = horaSaida.getTime() - turno.horaEntrada.getTime();
  const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } = calcularMinutosArredondados(
    elapsedMs,
    modoPausaAplicavel,
    turno.turnoDobrado ? 2 : 1
  );
  const valorTotal = calcularValorTurno({
    modoPagamento: turno.modoPagamentoAplicado,
    minutosArredondados,
    valorHoraAplicado: Number(turno.valorHoraAplicado),
    valorDiariaAplicada: turno.valorDiariaAplicada !== null ? Number(turno.valorDiariaAplicada) : null,
    diariaLimiarMeiaMin: turno.empresa.diariaLimiarMeiaMin,
    diariaLimiarCompletaMin: turno.empresa.diariaLimiarCompletaMin,
  });

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      horaSaida,
      minutosTrabalhados,
      minutosDescontadosPausa,
      minutosArredondados,
      valorTotal,
      horaSaidaOriginal: turno.horaSaidaOriginal ?? turno.horaSaida,
      correcaoSaidaEm: new Date(),
      correcaoSaidaPorEmail: sessao.email,
    },
  });

  // Atualiza o valor do pagamento mesmo se já estiver CONCLUIDO — o dono
  // pediu explicitamente pra corrigir o valor de referência mesmo em
  // turnos que não lembra se já pagou ou não, e decidir depois (com o
  // valor certo em mãos) se precisa ajustar alguma diferença por fora do
  // sistema. Só não mexe com um pagamento em PROCESSANDO (transferência em
  // andamento nesse instante).
  if (turno.pagamento) {
    await prisma.pagamento.update({ where: { id: turno.pagamento.id }, data: { valor: valorTotal } });
  }

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { sucesso: true };
}

export type MarcarDobradoState = { erro: string } | undefined;

/** O dono marca que a pessoa dobrou o turno (fez dia e noite seguidos) e
 * também esqueceu de bater saída — muda o corte pro limite da noite e
 * dobra o desconto de pausa (jornada bem mais longa precisa de mais
 * intervalo). Se o turno já tinha sido fechado pelo próprio sistema
 * (fechamentoAutomatico) com o corte errado, recalcula tudo agora — mesmo
 * padrão de corrigirFuncaoTurno acima. Se foi fechado manualmente (hora
 * real batida) ou ainda está aberto, só grava a flag: não há hora
 * fabricada errada pra corrigir num caso, e no outro o fechamento
 * automático ainda vai rodar e já vai usar a flag. Funciona mesmo já PAGO
 * (mesmo espírito de corrigirSaidaTurno acima) — só não atualiza
 * Pagamento.valor nesse caso, o valor de fato enviado não muda
 * retroativamente. Retorna { erro } em vez de lançar exceção — chamada
 * direto pelo botão, sem <form action> (ver o mesmo comentário em
 * converterParaClt sobre mensagens de throw
 * ficarem redacted em produção nesse tipo de chamada). */
export async function marcarTurnoDobrado(turnoId: number): Promise<MarcarDobradoState> {
  const sessao = await requireTenant();

  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: {
      pagamento: true,
      empresa: {
        select: {
          horarioFechamentoNoiteMin: true,
          modoPausaNoite: true,
          diariaLimiarMeiaMin: true,
          diariaLimiarCompletaMin: true,
        },
      },
    },
  });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse turno não pertence a esta empresa." };
  }
  if (turno.pagamento?.status === "PROCESSANDO") {
    return { erro: "O pagamento desse turno está em processamento — aguarde terminar." };
  }
  if (turno.turnoDobrado) {
    return { erro: "Esse turno já está marcado como dobrado." };
  }

  if (turno.status === "ABERTO" || !turno.fechamentoAutomatico) {
    await prisma.turno.update({ where: { id: turno.id }, data: { turnoDobrado: true } });
    revalidatePath(`/turnos/${turno.id}`);
    return undefined;
  }

  const dataEntradaISO = dataISOBrasil(turno.horaEntrada);
  let novaHoraSaida = instanteBrasil(dataEntradaISO, turno.empresa.horarioFechamentoNoiteMin);
  if (novaHoraSaida <= turno.horaEntrada) {
    novaHoraSaida = new Date(novaHoraSaida.getTime() + 24 * 60 * 60_000);
  }

  const elapsedMs = novaHoraSaida.getTime() - turno.horaEntrada.getTime();
  const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } = calcularMinutosArredondados(
    elapsedMs,
    turno.empresa.modoPausaNoite,
    2
  );
  const valorTotal = calcularValorTurno({
    modoPagamento: turno.modoPagamentoAplicado,
    minutosArredondados,
    valorHoraAplicado: Number(turno.valorHoraAplicado),
    valorDiariaAplicada: turno.valorDiariaAplicada !== null ? Number(turno.valorDiariaAplicada) : null,
    diariaLimiarMeiaMin: turno.empresa.diariaLimiarMeiaMin,
    diariaLimiarCompletaMin: turno.empresa.diariaLimiarCompletaMin,
  });

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      turnoDobrado: true,
      horaSaida: novaHoraSaida,
      minutosTrabalhados,
      minutosDescontadosPausa,
      minutosArredondados,
      valorTotal,
    },
  });

  // Mesma decisão de corrigirSaidaTurno acima: atualiza o valor do
  // pagamento mesmo já CONCLUIDO, pro dono ver o valor certo antes de
  // decidir o que fazer com a diferença.
  if (turno.pagamento) {
    await prisma.pagamento.update({ where: { id: turno.pagamento.id }, data: { valor: valorTotal } });
  }

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return undefined;
}

export type ConfirmarSaidaConflitoState = { erro?: string } | undefined;

/** Encerra manualmente um turno que ficou aberto porque a pessoa apareceu
 * com turno/ponto aberto em OUTRA empresa (ver buscarConflitoOutroLocal em
 * src/app/t/[token]/actions.ts) e nunca voltou pra bater a saída aqui. O
 * dono confirma o horário real de saída — normalmente o horário em que a
 * pessoa foi vista começando em outro lugar, sugerido pelo painel — em vez
 * de deixar o fechamento automático inventar um horário errado no corte
 * padrão do dia/noite. Sem foto/assinatura de saída (a pessoa não está
 * mais aqui pra isso), por isso grava auditoria própria
 * (correcaoSaidaEm/PorEmail) em vez de fingir que foi um encerramento
 * normal pelo totem. */
export async function confirmarSaidaConflito(
  turnoId: number,
  horaSaidaBruta: string
): Promise<ConfirmarSaidaConflitoState> {
  const sessao = await requireTenant();

  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: {
      pagamento: true,
      empresa: {
        select: {
          horarioInicioDiaMin: true,
          horarioInicioNoiteMin: true,
          modoPausaDia: true,
          modoPausaNoite: true,
          diariaLimiarMeiaMin: true,
          diariaLimiarCompletaMin: true,
        },
      },
    },
  });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse turno não pertence a esta empresa." };
  }
  if (turno.status !== "ABERTO") {
    return { erro: "Esse turno já foi encerrado." };
  }

  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(horaSaidaBruta);
  if (!m) return { erro: "Informe uma data e hora de saída válidas." };
  const horaSaida = instanteBrasil(m[1], Number(m[2]) * 60 + Number(m[3]));
  if (horaSaida <= turno.horaEntrada) {
    return { erro: "A saída precisa ser depois da entrada." };
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId: turno.pessoaId, empresaId: turno.empresaId } },
    select: { turnoPredefinido: true },
  });
  const modoPausaAplicavel = turno.turnoDobrado
    ? turno.empresa.modoPausaNoite
    : classificarTurno(
          turno.horaEntrada,
          vinculo?.turnoPredefinido ?? "LIVRE",
          turno.empresa.horarioInicioDiaMin,
          turno.empresa.horarioInicioNoiteMin
        ) === "DIA"
      ? turno.empresa.modoPausaDia
      : turno.empresa.modoPausaNoite;

  const elapsedMs = horaSaida.getTime() - turno.horaEntrada.getTime();
  const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } = calcularMinutosArredondados(
    elapsedMs,
    modoPausaAplicavel,
    turno.turnoDobrado ? 2 : 1
  );
  const valorTotal = calcularValorTurno({
    modoPagamento: turno.modoPagamentoAplicado,
    minutosArredondados,
    valorHoraAplicado: Number(turno.valorHoraAplicado),
    valorDiariaAplicada: turno.valorDiariaAplicada !== null ? Number(turno.valorDiariaAplicada) : null,
    diariaLimiarMeiaMin: turno.empresa.diariaLimiarMeiaMin,
    diariaLimiarCompletaMin: turno.empresa.diariaLimiarCompletaMin,
  });

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      horaSaida,
      minutosTrabalhados,
      minutosDescontadosPausa,
      minutosArredondados,
      valorTotal,
      status: "CONCLUIDO",
      correcaoSaidaEm: new Date(),
      correcaoSaidaPorEmail: sessao.email,
    },
  });

  await processarPagamentoTurno(turno.id);

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return undefined;
}

export type AvaliarExtraState = { erro?: string } | undefined;

/** Avaliação da empresa sobre o extra, ao rever o turno — lado simétrico
 * de avaliarEmpresaPeloExtra (src/app/t/[token]/actions.ts). Base da
 * reputação que atravessa empresas (ver /freelancers/[id] e /conecta). */
export async function avaliarExtraPelaEmpresa(
  turnoId: number,
  notaBruta: number,
  tagsBrutas: string[]
): Promise<AvaliarExtraState> {
  const sessao = await requireTenant();

  if (!notaValida(notaBruta)) return { erro: "Nota inválida." };

  const turno = await prisma.turno.findUnique({ where: { id: turnoId }, select: { empresaId: true, status: true } });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse turno não pertence a esta empresa." };
  }
  if (turno.status === "ABERTO") {
    return { erro: "Encerre o turno antes de avaliar." };
  }

  const tags = tagsValidadas(tagsBrutas, "EMPRESA");

  await prisma.avaliacao.upsert({
    where: { turnoId_autor: { turnoId, autor: "EMPRESA" } },
    update: { nota: notaBruta, tags },
    create: { turnoId, autor: "EMPRESA", nota: notaBruta, tags },
  });

  revalidatePath(`/turnos/${turnoId}`);
  return undefined;
}
