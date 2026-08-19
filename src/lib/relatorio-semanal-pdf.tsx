import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import { LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import type { TipoChavePix } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
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
  colNome: { width: "24%" },
  colPix: { width: "34%" },
  colTurnos: { width: "16%", textAlign: "right" },
  colValor: { width: "26%", textAlign: "right" },
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

export type LinhaRelatorioSemanal = {
  pessoaNome: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
  quantidadeTurnos: number;
  valorTotal: number;
};

/** Relatório agregado por pessoa pro pagamento semanal — diferente do
 * diário (uma linha por turno), aqui cada pessoa soma todos os turnos da
 * semana num valor só, já que é isso que vai ser transferido de uma vez. */
export async function gerarPdfRelatorioSemanal(params: {
  empresaNome: string;
  periodoLabel: string;
  dataPagamentoLabel: string;
  itens: LinhaRelatorioSemanal[];
}): Promise<Buffer> {
  const valorTotalGeral = params.itens.reduce((soma, i) => soma + i.valorTotal, 0);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório de pagamento semanal — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>
            {params.empresaNome} · pagamento em {params.dataPagamentoLabel}
          </Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colNome}>Nome</Text>
            <Text style={styles.colPix}>Chave PIX</Text>
            <Text style={styles.colTurnos}>Turnos</Text>
            <Text style={styles.colValor}>Valor da semana</Text>
          </View>
          {params.itens.map((item, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.colNome}>{item.pessoaNome}</Text>
              <Text style={styles.colPix}>
                {item.chavePix} ({LABEL_TIPO_CHAVE_PIX[item.tipoChavePix]})
              </Text>
              <Text style={styles.colTurnos}>{item.quantidadeTurnos}</Text>
              <Text style={styles.colValor}>R$ {item.valorTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {params.itens.length === 0 && (
          <Text style={styles.vazio}>Ninguém em frequência semanal com turnos nessa semana.</Text>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValor}>R$ {valorTotalGeral.toFixed(2)}</Text>
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
