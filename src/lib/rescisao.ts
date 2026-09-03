// Sem "server-only": calcularPrazoLimiteRescisao é usada tanto no
// formulário (client component, pra mostrar o prazo em tempo real
// enquanto a empresa escolhe a data) quanto na page/PDF (server) — mesmo
// espírito de src/lib/experiencia.ts e src/lib/ferias.ts. Nenhuma função
// deste arquivo toca banco de dados.

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function adicionarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * UM_DIA_MS);
}

/** Domingo de Páscoa pro ano dado — algoritmo de Gauss/Meeus (anônimo
 * gregoriano). Base pra Sexta-feira Santa, o único feriado nacional móvel
 * (Carnaval e Corpus Christi são ponto facultativo, não feriado nacional
 * obrigatório — não entram aqui de propósito). */
function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const numero = h + l - 7 * m + 114;
  const mes = Math.floor(numero / 31); // 3 = março, 4 = abril
  const dia = (numero % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const FERIADOS_NACIONAIS_FIXOS = [
  { mes: 1, dia: 1, nome: "Confraternização Universal" },
  { mes: 4, dia: 21, nome: "Tiradentes" },
  { mes: 5, dia: 1, nome: "Dia do Trabalho" },
  { mes: 9, dia: 7, nome: "Independência do Brasil" },
  { mes: 10, dia: 12, nome: "Nossa Senhora Aparecida" },
  { mes: 11, dia: 2, nome: "Finados" },
  { mes: 11, dia: 15, nome: "Proclamação da República" },
  { mes: 11, dia: 20, nome: "Dia Nacional de Zumbi e da Consciência Negra" },
  { mes: 12, dia: 25, nome: "Natal" },
] as const;

function mesmaDataUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Nome do feriado nacional obrigatório nessa data, ou null se não for
 * feriado — só feriados nacionais fixos + Sexta-feira Santa (móvel).
 * Feriados estaduais/municipais e pontos facultativos (Carnaval, Corpus
 * Christi) ficam de fora: variam por cidade/empresa, então incluí-los
 * arriscaria antecipar um prazo que na prática não precisava. */
export function nomeFeriadoNacional(data: Date): string | null {
  const mes = data.getUTCMonth() + 1;
  const dia = data.getUTCDate();
  const fixo = FERIADOS_NACIONAIS_FIXOS.find((f) => f.mes === mes && f.dia === dia);
  if (fixo) return fixo.nome;
  const sextaSanta = adicionarDias(domingoDePascoa(data.getUTCFullYear()), -2);
  return mesmaDataUTC(data, sextaSanta) ? "Sexta-feira Santa" : null;
}

export type DetalhePrazoRescisao = {
  /** 10 dias corridos após a rescisão, sem nenhum ajuste. */
  prazoBrutoDezDias: Date;
  /** Prazo final, já antecipado se necessário. */
  prazoLimite: Date;
  antecipado: boolean;
  /** Por que antecipou (o motivo do PRIMEIRO dia que caiu em domingo/feriado
   * — se antecipar mais de um dia em sequência, é só esse primeiro motivo
   * que importa contar pra empresa). Null quando não precisou antecipar. */
  motivoAntecipacao: string | null;
};

/** Prazo legal pra pagamento/assinatura da rescisão: 10 dias corridos a
 * partir do último dia trabalhado (CLT art. 477 §6º), antecipando um dia
 * de cada vez sempre que cair num sábado, domingo ou feriado nacional —
 * regra explícita do dono (nem todo mundo interpreta a lei da mesma
 * forma). */
export function calcularPrazoLimiteRescisao(dataRescisao: Date): DetalhePrazoRescisao {
  const prazoBrutoDezDias = adicionarDias(dataRescisao, 10);
  let prazoLimite = prazoBrutoDezDias;
  let motivoAntecipacao: string | null = null;

  while (true) {
    const feriado = nomeFeriadoNacional(prazoLimite);
    const diaSemana = prazoLimite.getUTCDay();
    const domingo = diaSemana === 0;
    const sabado = diaSemana === 6;
    if (!feriado && !domingo && !sabado) break;
    if (!motivoAntecipacao) {
      motivoAntecipacao = feriado
        ? `cairia no feriado de ${feriado}`
        : domingo
          ? "cairia num domingo"
          : "cairia num sábado";
    }
    prazoLimite = adicionarDias(prazoLimite, -1);
  }

  return {
    prazoBrutoDezDias,
    prazoLimite,
    antecipado: prazoLimite.getTime() !== prazoBrutoDezDias.getTime(),
    motivoAntecipacao,
  };
}
