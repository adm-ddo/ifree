import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";

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
  colChave: { width: "58%", textTransform: "capitalize" },
  colQuantidade: { width: "20%", textAlign: "right" },
  colValor: { width: "22%", textAlign: "right" },
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
  devidoBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    border: "0.5pt solid #e7e5e4",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  devidoLabel: { fontSize: 9, color: "#78716c" },
  devidoValor: { fontSize: 10, fontWeight: 700, color: "#57534e" },
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

export type LinhaFinanceiroPdf = { chave: string; quantidade: number; valor: number };

export async function gerarPdfFinanceiro(params: {
  empresaNome: string;
  periodoLabel: string;
  agrupamentoLabel: string;
  totalDevidoAgora: number;
  itens: LinhaFinanceiroPdf[];
}): Promise<Buffer> {
  const valorTotalPeriodo = params.itens.reduce((soma, i) => soma + i.valor, 0);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório financeiro — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>
            {params.empresaNome} · pago no período, agrupado {params.agrupamentoLabel}
          </Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colChave}>{params.agrupamentoLabel === "por pessoa" ? "Pessoa" : "Data"}</Text>
            <Text style={styles.colQuantidade}>Pagamentos</Text>
            <Text style={styles.colValor}>Valor pago</Text>
          </View>
          {params.itens.map((item, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.colChave}>{item.chave}</Text>
              <Text style={styles.colQuantidade}>{item.quantidade}</Text>
              <Text style={styles.colValor}>R$ {item.valor.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {params.itens.length === 0 && (
          <Text style={styles.vazio}>Nenhum pagamento concluído nesse período.</Text>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total pago no período</Text>
          <Text style={styles.totalValor}>R$ {valorTotalPeriodo.toFixed(2)}</Text>
        </View>

        <View style={styles.devidoBox}>
          <Text style={styles.devidoLabel}>Total devido agora (fora do período acima)</Text>
          <Text style={styles.devidoValor}>R$ {params.totalDevidoAgora.toFixed(2)}</Text>
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
