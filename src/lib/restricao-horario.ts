import { diaSemanaISOBrasil, minutosDesdeMeiaNoiteBrasil } from "./data";
import { minutosParaHorario, paraMinutosHorario } from "./ponto";

export type RestricaoDia = {
  diaSemana: number;
  horaMinimaMin: number | null;
  horaMaximaMin: number | null;
};

const DIAS_SEMANA_ISO = [1, 2, 3, 4, 5, 6, 7];

/// 1=segunda...7=domingo — mesmo padrão ISO de diaSemanaISOBrasil.
const LABEL_DIA_SEMANA_ISO: Record<number, string> = {
  1: "segunda-feira",
  2: "terça-feira",
  3: "quarta-feira",
  4: "quinta-feira",
  5: "sexta-feira",
  6: "sábado",
  7: "domingo",
};

export type VerificacaoRestricaoEntrada = { bloqueado: false } | { bloqueado: true; mensagem: string };

/** Confere se AGORA está dentro da janela liberada pra bater ENTRADA nesta
 * empresa, pro dia da semana de hoje — dia sem restrição configurada
 * (nenhum item da lista bate com o dia de hoje) libera qualquer horário,
 * igual sempre foi. Só vale pra entrada (abrir turno EXTRA ou bater
 * entrada CLT no totem) — nunca chamado pra saída/intervalo, uma vez que a
 * pessoa já está trabalhando não faz sentido travar ela lá dentro. */
export function verificarRestricaoEntrada(
  restricoes: RestricaoDia[],
  agora: Date
): VerificacaoRestricaoEntrada {
  const diaSemana = diaSemanaISOBrasil(agora);
  const restricaoHoje = restricoes.find((r) => r.diaSemana === diaSemana);
  if (!restricaoHoje) return { bloqueado: false };

  const minutosAgora = minutosDesdeMeiaNoiteBrasil(agora);
  const nomeDia = LABEL_DIA_SEMANA_ISO[diaSemana];

  if (restricaoHoje.horaMinimaMin !== null && minutosAgora < restricaoHoje.horaMinimaMin) {
    return {
      bloqueado: true,
      mensagem: `⏰ Horário bloqueado para trabalhar — às ${nomeDia}s só libera a partir das ${minutosParaHorario(restricaoHoje.horaMinimaMin)}.`,
    };
  }
  if (restricaoHoje.horaMaximaMin !== null && minutosAgora > restricaoHoje.horaMaximaMin) {
    return {
      bloqueado: true,
      mensagem: `⏰ Horário bloqueado para trabalhar — às ${nomeDia}s só libera até às ${minutosParaHorario(restricaoHoje.horaMaximaMin)}.`,
    };
  }
  return { bloqueado: false };
}

/** Lê os campos horaMinima_1..horaMaxima_7 de um FormData (ver
 * RestricaoHorarioForm, reaproveitado em /freelancers/[id] e
 * /funcionarios/[id]) e devolve só os dias com pelo menos um dos dois
 * preenchidos — pronto pra um createMany depois de apagar as linhas
 * antigas do vínculo. */
export function parseRestricoesFormData(formData: FormData): RestricaoDia[] | { erro: string } {
  const restricoes: RestricaoDia[] = [];
  for (const diaSemana of DIAS_SEMANA_ISO) {
    const minimaBruta = String(formData.get(`horaMinima_${diaSemana}`) ?? "").trim();
    const maximaBruta = String(formData.get(`horaMaxima_${diaSemana}`) ?? "").trim();
    if (!minimaBruta && !maximaBruta) continue;

    const horaMinimaMin = minimaBruta ? paraMinutosHorario(minimaBruta) : null;
    const horaMaximaMin = maximaBruta ? paraMinutosHorario(maximaBruta) : null;
    if ((minimaBruta && horaMinimaMin === null) || (maximaBruta && horaMaximaMin === null)) {
      return { erro: `Horário inválido em ${LABEL_DIA_SEMANA_ISO[diaSemana]}.` };
    }
    if (horaMinimaMin !== null && horaMaximaMin !== null && horaMinimaMin >= horaMaximaMin) {
      return { erro: `Em ${LABEL_DIA_SEMANA_ISO[diaSemana]}, "a partir de" precisa ser antes de "até".` };
    }
    restricoes.push({ diaSemana, horaMinimaMin, horaMaximaMin });
  }
  return restricoes;
}
