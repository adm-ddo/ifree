const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Quantos dias antes do fim da etapa em aberto o status vira "ATENCAO" —
 * decisão de negócio (efetivar, prorrogar ou dispensar) costuma ser
 * tomada perto do prazo, não meses antes. */
const LIMIAR_ATENCAO_DIAS = 15;

function adicionarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * UM_DIA_MS);
}

export type StatusExperiencia = {
  etapa1FimEm: Date;
  etapa2FimEm: Date | null;
  /** Prazo máximo legal do contrato de experiência (etapa2FimEm quando
   * existe 2ª etapa, senão etapa1FimEm) — só informativo, não é o que
   * decide o aviso (ver prazoDecisaoAtual). */
  contratoFimEm: Date;
  /** Em qual etapa está a decisão pendente agora. */
  etapaAtual: 1 | 2;
  /** Prazo da decisão EM ABERTO no momento — etapa1FimEm enquanto a
   * empresa não confirmar que vai prorrogar pro 2º período (ou quando não
   * há 2ª etapa configurada), e só passa a ser etapa2FimEm depois dessa
   * confirmação explícita. */
  prazoDecisaoAtual: Date;
  /** Negativo quando já venceu (relativo a prazoDecisaoAtual). */
  diasRestantes: number;
  fase: "EFETIVADO" | "EM_ANDAMENTO" | "ATENCAO" | "VENCIDO";
};

/** Contrato de experiência CLT: uma ou duas etapas (ex.: 30+60, 45+45),
 * limite legal de 90 dias no total — mas as duas etapas NÃO são somadas
 * automaticamente num prazo único. São duas decisões separadas:
 *
 * 1) Perto do fim da 1ª etapa, a empresa recebe o aviso e decide: prorroga
 *    pro 2º período (registra `continuouEm`) ou já resolve ali (efetiva
 *    ou rescinde).
 * 2) Só depois dessa confirmação de prorrogação é que o prazo da 2ª etapa
 *    passa a valer, com o mesmo aviso de novo perto do fim dela — aí sim
 *    é a decisão final (efetivar ou rescindir).
 *
 * Se `efetivadoEm` estiver preenchido, o contrato já foi decidido e o
 * status fica congelado em EFETIVADO, independente da data. */
export function calcularStatusExperiencia(
  dataAdmissao: Date,
  dias1: number,
  dias2: number | null,
  continuouEm: Date | null,
  efetivadoEm: Date | null,
  hoje: Date
): StatusExperiencia {
  const etapa1FimEm = adicionarDias(dataAdmissao, dias1);
  const etapa2FimEm = dias2 !== null ? adicionarDias(etapa1FimEm, dias2) : null;
  const contratoFimEm = etapa2FimEm ?? etapa1FimEm;

  const emEtapa2 = etapa2FimEm !== null && continuouEm !== null;
  const etapaAtual: 1 | 2 = emEtapa2 ? 2 : 1;
  const prazoDecisaoAtual = emEtapa2 ? etapa2FimEm : etapa1FimEm;

  const diasRestantes = Math.round((prazoDecisaoAtual.getTime() - hoje.getTime()) / UM_DIA_MS);

  let fase: StatusExperiencia["fase"];
  if (efetivadoEm) {
    fase = "EFETIVADO";
  } else if (diasRestantes < 0) {
    fase = "VENCIDO";
  } else if (diasRestantes <= LIMIAR_ATENCAO_DIAS) {
    fase = "ATENCAO";
  } else {
    fase = "EM_ANDAMENTO";
  }

  return { etapa1FimEm, etapa2FimEm, contratoFimEm, etapaAtual, prazoDecisaoAtual, diasRestantes, fase };
}
