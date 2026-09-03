/** Soma meses a uma data-calendário (sem hora/fuso, mesma representação do
 * @db.Date do Prisma — sempre meia-noite UTC), preservando o dia do mês
 * quando possível e arredondando pro último dia do mês de destino quando
 * não (ex.: admissão dia 31 de janeiro + 1 mês = 28/29 de fevereiro). */
function adicionarMeses(data: Date, meses: number): Date {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth();
  const dia = data.getUTCDate();
  const mesTotal = mes + meses;
  const novoAno = ano + Math.floor(mesTotal / 12);
  const novoMes = ((mesTotal % 12) + 12) % 12;
  const ultimoDiaNovoMes = new Date(Date.UTC(novoAno, novoMes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(novoAno, novoMes, Math.min(dia, ultimoDiaNovoMes)));
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function adicionarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * UM_DIA_MS);
}

export type FeriasEmAndamento = { inicio: Date; retorno: Date; diasRestantes: number };

/** Enquanto a pessoa está de fato fora (hoje entre o início registrado e a
 * data de retorno = início + quantidade de dias) — usado pro aviso "deve
 * retornar em..." no card de férias. Null antes de começar ou depois que
 * já retornou, mesmo que ultimasFeriasGozadasEm/feriasQuantidadeDias ainda
 * estejam preenchidos (é só o registro histórico da última vez). */
export function calcularFeriasEmAndamento(
  ultimasFeriasGozadasEm: Date | null,
  feriasQuantidadeDias: number | null,
  hoje: Date
): FeriasEmAndamento | null {
  if (!ultimasFeriasGozadasEm || !feriasQuantidadeDias) return null;
  const retorno = adicionarDias(ultimasFeriasGozadasEm, feriasQuantidadeDias);
  if (hoje < ultimasFeriasGozadasEm || hoje >= retorno) return null;
  const diasRestantes = Math.ceil((retorno.getTime() - hoje.getTime()) / UM_DIA_MS);
  return { inicio: ultimasFeriasGozadasEm, retorno, diasRestantes };
}

export type StatusFerias =
  | { fase: "AQUISITIVO"; direitoEm: Date }
  | { fase: "CONCESSIVO"; venceEm: Date; diasRestantes: number }
  | { fase: "VENCIDA"; venceuEm: Date; diasEmAtraso: number };

/** Período aquisitivo (12 meses trabalhados pra ganhar o direito) seguido
 * do período concessivo (mais 12 meses de prazo legal pra empresa
 * efetivamente conceder as férias) — regra padrão da CLT. A referência do
 * ciclo é a última vez que a pessoa tirou férias, ou a admissão se ainda
 * nunca tirou. */
export function calcularStatusFerias(
  dataAdmissao: Date,
  ultimasFeriasGozadasEm: Date | null,
  hoje: Date
): StatusFerias {
  const referencia = ultimasFeriasGozadasEm ?? dataAdmissao;
  const direitoEm = adicionarMeses(referencia, 12);
  if (hoje < direitoEm) {
    return { fase: "AQUISITIVO", direitoEm };
  }

  const venceEm = adicionarMeses(direitoEm, 12);
  if (hoje < venceEm) {
    const diasRestantes = Math.ceil((venceEm.getTime() - hoje.getTime()) / UM_DIA_MS);
    return { fase: "CONCESSIVO", venceEm, diasRestantes };
  }

  const diasEmAtraso = Math.floor((hoje.getTime() - venceEm.getTime()) / UM_DIA_MS);
  return { fase: "VENCIDA", venceuEm: venceEm, diasEmAtraso };
}
