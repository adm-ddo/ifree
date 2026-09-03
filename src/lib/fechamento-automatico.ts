import "server-only";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, inicioDoDiaBrasil, instanteBrasil } from "@/lib/data";
import { calcularMinutosArredondados, calcularValorTurno, classificarTurno } from "@/lib/turno";
import { processarPagamentoTurno } from "@/lib/pagamentos/processar";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

/** Encerra turnos que ninguém bateu saída — chamada uma vez por dia (ver
 * vercel.json) às 01:00 de Brasília. Só pega turnos abertos desde antes de
 * hoje: um turno que começou depois da meia-noite de hoje (madrugada)
 * ainda não passou pelo corte de amanhã, então fica de fora dessa rodada.
 *
 * O horaSaida usado depende de qual turno (dia ou noite) a pessoa faz —
 * ver classificarTurno em src/lib/turno.ts — exceto quando o turno está
 * marcado como turnoDobrado (dia+noite seguidos), caso em que sempre usa
 * o corte da noite e dobra o desconto de pausa. Se o corte calculado cair
 * antes da entrada (alguém bateu entrada depois do horário de fechamento
 * configurado), empurra pro mesmo horário do dia seguinte — não existe
 * turno com duração negativa. */
export async function fecharTurnosAtrasados(
  agora: Date = new Date()
): Promise<{ fechados: number }> {
  const corte = inicioDoDiaBrasil(agora);

  const turnosAbertos = await prisma.turno.findMany({
    where: { status: "ABERTO", horaEntrada: { lt: corte } },
    include: {
      empresa: {
        select: {
          horarioInicioDiaMin: true,
          horarioInicioNoiteMin: true,
          horarioFechamentoDiaMin: true,
          horarioFechamentoNoiteMin: true,
          modoPausaDia: true,
          modoPausaNoite: true,
          diariaLimiarMeiaMin: true,
          diariaLimiarCompletaMin: true,
        },
      },
    },
  });

  // Turno não tem relação direta com VinculoPessoaEmpresa (é uma chave
  // composta pessoaId+empresaId) — busca em lote pra não fazer 1 query por
  // turno. LIVRE (padrão) quando a pessoa não tem vínculo ativo achado por
  // algum motivo, mesmo default do schema.
  const pares = turnosAbertos.map((t) => ({ pessoaId: t.pessoaId, empresaId: t.empresaId }));
  const vinculos = pares.length
    ? await prisma.vinculoPessoaEmpresa.findMany({
        where: { OR: pares },
        select: { pessoaId: true, empresaId: true, turnoPredefinido: true },
      })
    : [];
  const turnoPredefinidoPorChave = new Map<string, TurnoPredefinido>(
    vinculos.map((v) => [`${v.pessoaId}-${v.empresaId}`, v.turnoPredefinido])
  );

  let fechados = 0;
  for (const turno of turnosAbertos) {
    let cutoffMin: number;
    let multiplicadorPausa: number;
    let modoPausaAplicavel: (typeof turno.empresa)["modoPausaDia"];
    if (turno.turnoDobrado) {
      cutoffMin = turno.empresa.horarioFechamentoNoiteMin;
      multiplicadorPausa = 2;
      modoPausaAplicavel = turno.empresa.modoPausaNoite;
    } else {
      const turnoPredefinido =
        turnoPredefinidoPorChave.get(`${turno.pessoaId}-${turno.empresaId}`) ?? "LIVRE";
      const tipo = classificarTurno(
        turno.horaEntrada,
        turnoPredefinido,
        turno.empresa.horarioInicioDiaMin,
        turno.empresa.horarioInicioNoiteMin
      );
      cutoffMin = tipo === "DIA" ? turno.empresa.horarioFechamentoDiaMin : turno.empresa.horarioFechamentoNoiteMin;
      multiplicadorPausa = 1;
      modoPausaAplicavel = tipo === "DIA" ? turno.empresa.modoPausaDia : turno.empresa.modoPausaNoite;
    }

    const dataEntradaISO = dataISOBrasil(turno.horaEntrada);
    let horaSaida = instanteBrasil(dataEntradaISO, cutoffMin);
    if (horaSaida <= turno.horaEntrada) {
      horaSaida = new Date(horaSaida.getTime() + 24 * 60 * 60_000);
    }

    const elapsedMs = horaSaida.getTime() - turno.horaEntrada.getTime();
    const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } =
      calcularMinutosArredondados(elapsedMs, modoPausaAplicavel, multiplicadorPausa);
    const valorTotal = calcularValorTurno({
      modoPagamento: turno.modoPagamentoAplicado,
      minutosArredondados,
      valorHoraAplicado: Number(turno.valorHoraAplicado),
      valorDiariaAplicada:
        turno.valorDiariaAplicada !== null ? Number(turno.valorDiariaAplicada) : null,
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
        fechamentoAutomatico: true,
      },
    });

    await processarPagamentoTurno(turno.id);
    fechados++;
  }

  return { fechados };
}

/** Sinaliza (não fecha!) os RegistroPonto de funcionário CLT que ninguém
 * bateu a saída até o corte do dia. Diferente de fecharTurnosAtrasados, não
 * inventa um horaSaida nem calcula minutos — só marca PENDENTE_CORRECAO
 * pro dono resolver na mão em /funcionarios/[id]. Decisão deliberada: um
 * registro de jornada (mesmo sendo controle interno) não deveria ter um
 * horário fabricado pelo sistema sem confirmação de ninguém — diferente do
 * turno do extra, aqui não tem pressão de pagamento forçando uma resolução
 * automática. */
export async function sinalizarRegistrosPontoPendentes(
  agora: Date = new Date()
): Promise<{ sinalizados: number }> {
  const corte = inicioDoDiaBrasil(agora);

  const resultado = await prisma.registroPonto.updateMany({
    where: { status: "ABERTO", horaEntrada: { lt: corte } },
    data: { status: "PENDENTE_CORRECAO" },
  });

  return { sinalizados: resultado.count };
}
