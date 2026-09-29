import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarHora, formatarDataHora } from "@/lib/data";

const FUSO_BRASIL = "America/Sao_Paulo";

function formatarDataCurta(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO_BRASIL }).format(data);
}

function formatarDiaSemana(data: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: FUSO_BRASIL }).format(data);
  return label.replace(".", "").slice(0, 3);
}

function formatarHoras(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  return `${sinal}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}min`;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 12, borderBottom: "1pt solid #e7e5e4", paddingBottom: 10 },
  titulo: { fontSize: 15, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  aviso: { fontSize: 7.5, color: "#92400e", marginTop: 6 },
  dadosBox: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 4 },
  dadosCol: { width: "48%" },
  dadosLinha: { marginBottom: 2 },
  dadosLabel: { color: "#78716c" },
  tabela: { marginTop: 8 },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  linha: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #e7e5e4",
  },
  linhaVazia: { color: "#a8a29e" },
  colData: { width: "10%" },
  colDia: { width: "7%" },
  colEntrada: { width: "12%" },
  colIntervalo: { width: "19%" },
  colSaida: { width: "12%" },
  colTotal: { width: "13%", textAlign: "right" },
  colNoturno: { width: "13%", textAlign: "right" },
  colSaldo: { width: "14%", textAlign: "right" },
  saldoExtra: { color: "#92400e", fontWeight: 700 },
  saldoDevida: { color: "#991b1b", fontWeight: 700 },
  totalBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 10, color: "#166534" },
  totalValor: { fontSize: 13, fontWeight: 700, color: "#166534" },
  metaBoxExtra: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaBoxFalta: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaBoxNeutro: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f5f5f4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabelExtra: { fontSize: 10, color: "#92400e" },
  metaValorExtra: { fontSize: 13, fontWeight: 700, color: "#92400e" },
  metaLabelFalta: { fontSize: 10, color: "#991b1b" },
  metaValorFalta: { fontSize: 13, fontWeight: 700, color: "#991b1b" },
  metaLabelNeutro: { fontSize: 10, color: "#57534e" },
  metaValorNeutro: { fontSize: 13, fontWeight: 700, color: "#57534e" },
  assinaturas: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
  blocoAssinatura: { width: "45%" },
  linhaAssinatura: { borderTop: "1pt solid #292524", paddingTop: 4, textAlign: "center", fontSize: 8 },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#a8a29e",
    textAlign: "center",
  },
});

export type LinhaEspelhoPonto = {
  data: Date;
  horaEntrada: Date;
  entradaIntervalo: Date | null;
  saidaIntervalo: Date | null;
  horaSaida: Date | null;
  minutosTrabalhados: number | null;
  /// Minutos dentro do horário noturno legal (22h-5h, CLT art. 73) — null
  /// enquanto o registro está aberto, mesmo espírito de minutosTrabalhados.
  /// Ver calcularMinutosNoturnos em src/lib/ponto.ts.
  minutosNoturnos: number | null;
  encerradoManualmente: boolean;
  /// Saldo do dia contra o horário esperado (calcularSaldoDiarioClt em
  /// src/lib/ponto.ts, mesma conta já usada no histórico de ponto da tela
  /// de funcionário) — mutuamente exclusivos (um dia nunca tem os dois),
  /// ambos null quando dentro da tolerância ou sem horário configurado
  /// pra essa pessoa (ver horarioConfigurado abaixo).
  horaExtraMin: number | null;
  horasDevidasMin: number | null;
};

/** Espelho de ponto mensal, por funcionário — um dia por linha (mesmo
 * formato que um relógio ponto homologado imprimiria), incluindo os dias
 * sem nenhum registro (fica em branco, pra ficar visível o mês inteiro,
 * não só os dias trabalhados). Continua sendo o mesmo controle interno de
 * sempre (aviso no rodapé do cabeçalho) — o formato é parecido de
 * propósito, não uma certificação de que substitui um REP-P homologado. */
export async function gerarPdfEspelhoPonto(params: {
  empresaNome: string;
  empresaCnpj: string;
  pessoaNome: string;
  pessoaCpf: string;
  pisPasepNit: string | null;
  ctpsNumero: string | null;
  ctpsSerieUf: string | null;
  matriculaInterna: string | null;
  cargo: string | null;
  mesReferenciaLabel: string;
  /// false quando a pessoa não tem horário esperado configurado (nem
  /// escala, nem horário individual) — nesse caso todo horaExtraMin/
  /// horasDevidasMin das linhas vem null e a coluna Saldo/os totais
  /// mostram um aviso em vez de "R$ 0,00 de saldo" (que seria enganoso:
  /// não é que bateu certinho, é que não dá pra calcular).
  horarioConfigurado: boolean;
  diasDoMes: Date[];
  linhasPorDia: Map<string, LinhaEspelhoPonto[]>;
}): Promise<Buffer> {
  const dataISO = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_BRASIL, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  let totalMinutos = 0;
  let totalMinutosNoturnos = 0;
  let totalHoraExtraMin = 0;
  let totalHorasDevidasMin = 0;
  let diasTrabalhados = 0;
  for (const linhas of params.linhasPorDia.values()) {
    if (linhas.length > 0) diasTrabalhados++;
    for (const l of linhas) {
      totalMinutos += l.minutosTrabalhados ?? 0;
      totalMinutosNoturnos += l.minutosNoturnos ?? 0;
      totalHoraExtraMin += l.horaExtraMin ?? 0;
      totalHorasDevidasMin += l.horasDevidasMin ?? 0;
    }
  }

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Espelho de Ponto — {params.mesReferenciaLabel}</Text>
          <Text style={styles.subtitulo}>
            {params.empresaNome} · CNPJ {params.empresaCnpj}
          </Text>
          <Text style={styles.aviso}>
            Controle interno de jornada — não substitui o registro eletrônico de ponto oficial
            (Portaria MTE 671/2021). Formato pensado pra ficar parecido com o espelho de um
            relógio de ponto homologado, sem ser um.
          </Text>
        </View>

        <View style={styles.dadosBox}>
          <View style={styles.dadosCol}>
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>Funcionário: </Text>
              {params.pessoaNome}
            </Text>
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>CPF: </Text>
              {params.pessoaCpf}
            </Text>
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>PIS/PASEP/NIT: </Text>
              {params.pisPasepNit ?? "—"}
            </Text>
          </View>
          <View style={styles.dadosCol}>
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>Cargo: </Text>
              {params.cargo ?? "—"}
            </Text>
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>Matrícula: </Text>
              {params.matriculaInterna ?? "—"}
            </Text>
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>CTPS: </Text>
              {params.ctpsNumero ? `${params.ctpsNumero} / ${params.ctpsSerieUf ?? "—"}` : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colData}>Data</Text>
            <Text style={styles.colDia}>Dia</Text>
            <Text style={styles.colEntrada}>Entrada</Text>
            <Text style={styles.colIntervalo}>Intervalo</Text>
            <Text style={styles.colSaida}>Saída</Text>
            <Text style={styles.colTotal}>Total</Text>
            <Text style={styles.colNoturno}>Noturnas</Text>
            <Text style={styles.colSaldo}>Saldo do dia</Text>
          </View>
          {params.diasDoMes.map((dia) => {
            const linhas = params.linhasPorDia.get(dataISO(dia)) ?? [];
            if (linhas.length === 0) {
              return (
                <View key={dataISO(dia)} style={styles.linha}>
                  <Text style={styles.colData}>{formatarDataCurta(dia)}</Text>
                  <Text style={styles.colDia}>{formatarDiaSemana(dia)}</Text>
                  <Text style={[styles.colEntrada, styles.linhaVazia]}>—</Text>
                  <Text style={[styles.colIntervalo, styles.linhaVazia]}>—</Text>
                  <Text style={[styles.colSaida, styles.linhaVazia]}>—</Text>
                  <Text style={[styles.colTotal, styles.linhaVazia]}>—</Text>
                  <Text style={[styles.colNoturno, styles.linhaVazia]}>—</Text>
                  <Text style={[styles.colSaldo, styles.linhaVazia]}>—</Text>
                </View>
              );
            }
            return linhas.map((l, i) => (
              <View key={`${dataISO(dia)}-${i}`} style={styles.linha}>
                <Text style={styles.colData}>{i === 0 ? formatarDataCurta(dia) : ""}</Text>
                <Text style={styles.colDia}>{i === 0 ? formatarDiaSemana(dia) : ""}</Text>
                <Text style={styles.colEntrada}>{formatarHora(l.horaEntrada)}</Text>
                <Text style={styles.colIntervalo}>
                  {l.entradaIntervalo && l.saidaIntervalo
                    ? `${formatarHora(l.entradaIntervalo)}–${formatarHora(l.saidaIntervalo)}`
                    : "—"}
                </Text>
                <Text style={styles.colSaida}>
                  {l.horaSaida ? formatarHora(l.horaSaida) : "aberto"}
                  {l.encerradoManualmente ? " (emp.)" : ""}
                </Text>
                <Text style={styles.colTotal}>
                  {l.minutosTrabalhados !== null ? formatarHoras(l.minutosTrabalhados) : "—"}
                </Text>
                <Text style={styles.colNoturno}>
                  {l.minutosNoturnos !== null && l.minutosNoturnos > 0
                    ? formatarHoras(l.minutosNoturnos)
                    : "—"}
                </Text>
                <Text
                  style={
                    l.horaExtraMin !== null
                      ? [styles.colSaldo, styles.saldoExtra]
                      : l.horasDevidasMin !== null
                        ? [styles.colSaldo, styles.saldoDevida]
                        : styles.colSaldo
                  }
                >
                  {l.horaExtraMin !== null
                    ? `+${formatarHoras(l.horaExtraMin)}`
                    : l.horasDevidasMin !== null
                      ? `-${formatarHoras(l.horasDevidasMin)}`
                      : "—"}
                </Text>
              </View>
            ));
          })}
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>
            Total de horas no mês · {diasTrabalhados} dia(s) trabalhado(s)
          </Text>
          <Text style={styles.totalValor}>{formatarHoras(totalMinutos)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Das quais, horas noturnas (22h-5h)</Text>
          <Text style={styles.totalValor}>{formatarHoras(totalMinutosNoturnos)}</Text>
        </View>

        {!params.horarioConfigurado ? (
          <View style={styles.metaBoxNeutro}>
            <Text style={styles.metaLabelNeutro}>
              Horário de trabalho não configurado pra essa pessoa — sem cálculo de horas extras/devidas
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.metaBoxExtra}>
              <Text style={styles.metaLabelExtra}>Total de horas extras no período</Text>
              <Text style={styles.metaValorExtra}>+{formatarHoras(totalHoraExtraMin)}</Text>
            </View>
            <View style={styles.metaBoxFalta}>
              <Text style={styles.metaLabelFalta}>Total de horas devidas no período</Text>
              <Text style={styles.metaValorFalta}>-{formatarHoras(totalHorasDevidasMin)}</Text>
            </View>
          </>
        )}

        <Text style={styles.aviso}>
          Horas noturnas: minuto-relógio real trabalhado dentro da janela
          22h-5h (CLT art. 73), sem aplicar a hora noturna reduzida
          (52min30s) nem o adicional — cálculo final de folha é com o
          contador.
        </Text>

        <View style={styles.assinaturas}>
          <View style={styles.blocoAssinatura}>
            <Text style={styles.linhaAssinatura}>Assinatura do(a) funcionário(a)</Text>
          </View>
          <View style={styles.blocoAssinatura}>
            <Text style={styles.linhaAssinatura}>Assinatura do(a) empregador(a)</Text>
          </View>
        </View>

        <Text
          style={styles.rodape}
          render={({ pageNumber, totalPages }) =>
            `Gerado em ${formatarDataHora(new Date())} · página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
