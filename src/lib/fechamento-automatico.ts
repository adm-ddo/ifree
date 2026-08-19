import "server-only";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, inicioDoDiaBrasil, instanteBrasil } from "@/lib/data";
import { calcularMinutosArredondados, calcularValorTurno } from "@/lib/turno";
import { processarPagamentoTurno } from "@/lib/pagamentos/processar";

/** Encerra turnos que ninguém bateu saída — chamada uma vez por dia (ver
 * vercel.json) às 01:00 de Brasília, o corte que o dono definiu como "se
 * ainda não saiu até essa hora, considera que saiu no horário de
 * fechamento". Só pega turnos abertos desde antes de hoje: um turno que
 * começou depois da meia-noite de hoje (madrugada) ainda não passou pelo
 * corte de amanhã, então fica de fora dessa rodada.
 *
 * O horaSaida usado é o horário de fechamento configurado pela empresa
 * (Empresa.horarioFechamentoMin), aplicado no dia em que o turno começou.
 * Se isso cair antes da entrada (alguém bateu entrada depois do horário de
 * fechamento configurado), empurra pro mesmo horário do dia seguinte —
 * não existe turno com duração negativa. */
export async function fecharTurnosAtrasados(
  agora: Date = new Date()
): Promise<{ fechados: number }> {
  const corte = inicioDoDiaBrasil(agora);

  const turnosAbertos = await prisma.turno.findMany({
    where: { status: "ABERTO", horaEntrada: { lt: corte } },
    include: {
      empresa: {
        select: {
          horarioFechamentoMin: true,
          modoPausa: true,
          diariaLimiarMeiaMin: true,
          diariaLimiarCompletaMin: true,
        },
      },
    },
  });

  let fechados = 0;
  for (const turno of turnosAbertos) {
    const dataEntradaISO = dataISOBrasil(turno.horaEntrada);
    let horaSaida = instanteBrasil(dataEntradaISO, turno.empresa.horarioFechamentoMin);
    if (horaSaida <= turno.horaEntrada) {
      horaSaida = new Date(horaSaida.getTime() + 24 * 60 * 60_000);
    }

    const elapsedMs = horaSaida.getTime() - turno.horaEntrada.getTime();
    const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } =
      calcularMinutosArredondados(elapsedMs, turno.empresa.modoPausa);
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
