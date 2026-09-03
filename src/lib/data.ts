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

/** Instante convertido pro formato que um <input type="datetime-local">
 * aceita como value/defaultValue ("YYYY-MM-DDTHH:mm"), sempre no horário
 * de Brasília — datetime-local é "sem fuso", então sem forçar o fuso aqui
 * o valor exibido dependeria do fuso do navegador de quem preenche. */
export function paraDatetimeLocalBrasil(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `${obter("year")}-${obter("month")}-${obter("day")}T${obter("hour")}:${obter("minute")}`;
}

export function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

const DIAS_SEMANA_EXTENSO = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

const INDICE_EXTENSO_POR_ABREV: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Nome por extenso do dia da semana, em minúsculas (ex.: "quarta-feira"),
 * no calendário de Brasília. */
export function nomeDiaSemanaBrasil(instante: Date): string {
  const abrev = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO_BRASIL,
    weekday: "short",
  }).format(instante);
  return DIAS_SEMANA_EXTENSO[INDICE_EXTENSO_POR_ABREV[abrev]];
}

/** formatarDataHora() com o dia da semana entre parênteses — ex.: "26/08/2026,
 * 15:45 (quarta-feira)". `diaReferencia` força qual dia usar pro dia da
 * semana: um turno que atravessa a virada (entrada de noite, saída de
 * madrugada) sempre usa o dia em que o TURNO COMEÇOU, tanto na entrada
 * quanto na saída — sem isso a saída mostraria o dia seguinte, dando a
 * impressão de dois turnos diferentes. */
export function formatarDataHoraComDiaSemana(data: Date, diaReferencia?: Date): string {
  return `${formatarDataHora(data)} (${nomeDiaSemanaBrasil(diaReferencia ?? data)})`;
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

/** Minutos desde meia-noite (horário de Brasília) do instante — usado pra
 * classificar um turno como "dia" ou "noite" pelo horário de entrada
 * quando a pessoa não tem turno fixo configurado (ver
 * src/lib/turno.ts:classificarTurno). */
export function minutosDesdeMeiaNoiteBrasil(instante: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO_BRASIL,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  return hora * 60 + minuto;
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
