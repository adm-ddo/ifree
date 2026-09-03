import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarHora, formatarDataHora } from "@/lib/data";
import { LABEL_ESCALA_TRABALHO } from "@/lib/ponto";
import type { EscalaTrabalho } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  aviso: { fontSize: 8, color: "#92400e", marginTop: 6 },
  tabela: { marginTop: 8 },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  linha: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #e7e5e4",
  },
  colNome: { width: "19%" },
  colEscala: { width: "11%" },
  colEntrada: { width: "14%" },
  colIntervalo: { width: "17%" },
  colSaida: { width: "12%" },
  colHoras: { width: "13%", textAlign: "right" },
  colNoturnas: { width: "14%", textAlign: "right" },
  vazio: { marginTop: 12, color: "#78716c" },
  totalBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 11, color: "#166534" },
  totalValor: { fontSize: 14, fontWeight: 700, color: "#166534" },
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

export type LinhaRelatorioHoras = {
  pessoaNome: string;
  escalaTrabalho: EscalaTrabalho | null;
  horaEntrada: Date;
  entradaIntervalo: Date | null;
  saidaIntervalo: Date | null;
  horaSaida: Date;
  minutosTrabalhados: number;
  /// Minutos dentro do horário noturno legal (22h-5h, CLT art. 73) — ver
  /// calcularMinutosNoturnos em src/lib/ponto.ts.
  minutosNoturnos: number;
  /// true quando o dono confirmou a saída manualmente (a pessoa não bateu
  /// ponto sozinha) — ver Turno/RegistroPonto.correcaoSaidaEm.
  encerradoManualmente: boolean;
};

function formatarHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
}

/** Relatório de horas trabalhadas por funcionário CLT — controle interno,
 * sem valor nem pagamento. Mesmo formato visual de gerarPdfRelatorioPagamentos,
 * mas sem coluna de PIX/valor; escala aparece só como referência. */
export async function gerarPdfRelatorioHorasClt(params: {
  empresaNome: string;
  periodoLabel: string;
  itens: LinhaRelatorioHoras[];
}): Promise<Buffer> {
  const totalMinutos = params.itens.reduce((soma, i) => soma + i.minutosTrabalhados, 0);
  const totalMinutosNoturnos = params.itens.reduce((soma, i) => soma + i.minutosNoturnos, 0);
  const temEncerradoManualmente = params.itens.some((i) => i.encerradoManualmente);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório de horas (CLT) — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
          <Text style={styles.aviso}>
            Controle interno de jornada — não substitui o registro eletrônico
            de ponto oficial (Portaria MTE 671/2021).
          </Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colNome}>Nome</Text>
            <Text style={styles.colEscala}>Escala (ref.)</Text>
            <Text style={styles.colEntrada}>Entrada</Text>
            <Text style={styles.colIntervalo}>Intervalo</Text>
            <Text style={styles.colSaida}>Saída</Text>
            <Text style={styles.colHoras}>Horas</Text>
            <Text style={styles.colNoturnas}>Noturnas (22h-5h)</Text>
          </View>
          {params.itens.map((item, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.colNome}>{item.pessoaNome}</Text>
              <Text style={styles.colEscala}>
                {item.escalaTrabalho ? LABEL_ESCALA_TRABALHO[item.escalaTrabalho] : "—"}
              </Text>
              <Text style={styles.colEntrada}>{formatarHora(item.horaEntrada)}</Text>
              <Text style={styles.colIntervalo}>
                {item.entradaIntervalo && item.saidaIntervalo
                  ? `${formatarHora(item.entradaIntervalo)}–${formatarHora(item.saidaIntervalo)}`
                  : "—"}
              </Text>
              <Text style={styles.colSaida}>
                {formatarHora(item.horaSaida)}
                {item.encerradoManualmente ? " (emp.)" : ""}
              </Text>
              <Text style={styles.colHoras}>{formatarHoras(item.minutosTrabalhados)}</Text>
              <Text style={styles.colNoturnas}>
                {item.minutosNoturnos > 0 ? formatarHoras(item.minutosNoturnos) : "—"}
              </Text>
            </View>
          ))}
        </View>

        {params.itens.length === 0 && (
          <Text style={styles.vazio}>Nenhum registro concluído nesse período.</Text>
        )}

        {temEncerradoManualmente && (
          <Text style={styles.aviso}>
            (emp.) — saída confirmada manualmente pela empresa, a pessoa não bateu ponto sozinha.
          </Text>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total de horas no período</Text>
          <Text style={styles.totalValor}>{formatarHoras(totalMinutos)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Das quais, horas noturnas (22h-5h)</Text>
          <Text style={styles.totalValor}>{formatarHoras(totalMinutosNoturnos)}</Text>
        </View>

        <Text style={styles.aviso}>
          Horas noturnas: minuto-relógio real trabalhado dentro da janela
          22h-5h (CLT art. 73), sem aplicar a hora noturna reduzida
          (52min30s) nem o adicional — cálculo final de folha é com o
          contador.
        </Text>

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
