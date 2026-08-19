// Sem informar o fuso, o Intl.DateTimeFormat usa o fuso do servidor — em
// produção (Vercel) isso é UTC, deixando toda data/hora exibida 3h à frente
// do horário real de Brasília. Fixando o fuso aqui garante o horário certo
// não importa onde o código rode.
const FUSO_HORARIO_BRASIL = "America/Sao_Paulo";

export function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

export function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

/** Data (YYYY-MM-DD) do instante, no calendário de Brasília — base pros
 * outros helpers de fuso horário abaixo. */
export function dataISOBrasil(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** Converte uma data (YYYY-MM-DD) mais um horário em minutos desde
 * meia-noite, ambos em horário de Brasília, pro instante UTC
 * correspondente. O Brasil não tem mais horário de verão desde 2019, então
 * São Paulo fica sempre em UTC-3: meia-noite lá é sempre 03:00 UTC do mesmo
 * dia. */
export function instanteBrasil(dataISO: string, minutosDesdeMeiaNoite = 0): Date {
  return new Date(
    new Date(`${dataISO}T03:00:00.000Z`).getTime() + minutosDesdeMeiaNoite * 60_000
  );
}

/** Meia-noite de "hoje" em Brasília, como instante UTC — usado pra
 * consultas tipo "turnos iniciados hoje". */
export function inicioDoDiaBrasil(instante: Date): Date {
  return instanteBrasil(dataISOBrasil(instante));
}

/** Meia-noite da segunda-feira desta semana em Brasília — usado pra
 * relatórios "esta semana". */
export function inicioDaSemanaBrasil(instante: Date): Date {
  const inicioHoje = inicioDoDiaBrasil(instante);
  const diaSemana = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO_BRASIL,
    weekday: "short",
  }).format(instante);
  const indicePorDia: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  // Quantos dias se passaram desde a última segunda-feira (segunda = 0).
  const diasDesdeSegunda = (indicePorDia[diaSemana] + 6) % 7;
  return new Date(inicioHoje.getTime() - diasDesdeSegunda * 24 * 60 * 60 * 1000);
}

/** Meia-noite do dia 1 deste mês em Brasília — usado pra relatórios "este
 * mês". */
export function inicioDoMesBrasil(instante: Date): Date {
  const anoMes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO_BRASIL,
    year: "numeric",
    month: "2-digit",
  }).format(instante);
  return new Date(`${anoMes}-01T03:00:00.000Z`);
}

/** Dias da semana no padrão ISO (1=segunda...7=domingo), usado nos
 * seletores de configuração da semana de pagamento e nos relatórios. */
export const DIAS_SEMANA_ISO = [
  { valor: 1, label: "Segunda-feira" },
  { valor: 2, label: "Terça-feira" },
  { valor: 3, label: "Quarta-feira" },
  { valor: 4, label: "Quinta-feira" },
  { valor: 5, label: "Sexta-feira" },
  { valor: 6, label: "Sábado" },
  { valor: 7, label: "Domingo" },
] as const;

const INDICE_ISO_POR_DIA: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Dia da semana do instante, no calendário de Brasília, no padrão ISO
 * (1=segunda...7=domingo). */
export function diaSemanaISOBrasil(instante: Date): number {
  const abrev = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO_BRASIL,
    weekday: "short",
  }).format(instante);
  return INDICE_ISO_POR_DIA[abrev];
}

/** Início (meia-noite Brasília) da semana de pagamento mais recente que já
 * fechou por completo — usado pro relatório semanal, que só faz sentido
 * pra uma semana inteira já encerrada (a semana em curso ainda não tem
 * todos os turnos). `diaInicioISO` é o dia configurado pela empresa como
 * início da semana (1=segunda...7=domingo, ver
 * Empresa.semanaPagamentoInicioDia). A semana fechada vai desse instante
 * até 7 dias depois (exclusive). */
export function inicioUltimaSemanaFechadaBrasil(instante: Date, diaInicioISO: number): Date {
  const hoje = inicioDoDiaBrasil(instante);
  const diaHoje = diaSemanaISOBrasil(instante);
  const diasDesdeInicioSemanaAtual = (diaHoje - diaInicioISO + 7) % 7;
  const inicioSemanaAtual = new Date(
    hoje.getTime() - diasDesdeInicioSemanaAtual * 24 * 60 * 60 * 1000
  );
  return new Date(inicioSemanaAtual.getTime() - 7 * 24 * 60 * 60 * 1000);
}
