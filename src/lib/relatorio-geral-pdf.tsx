import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import type { LinhaPorFuncao, LinhaPorPessoaFuncao } from "@/lib/relatorio";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  cardsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  card: { flex: 1, backgroundColor: "#f5f5f4", borderRadius: 6, padding: 8 },
  cardValor: { fontSize: 13, fontWeight: 700 },
  cardLabel: { fontSize: 8, color: "#78716c", marginTop: 2 },
  secaoTitulo: { fontSize: 12, fontWeight: 700, marginTop: 18, marginBottom: 6 },
  tabela: { marginTop: 4 },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontWeight: 700,
  },
  linha: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: "0.5pt solid #e7e5e4",
  },
  colNome: { width: "40%" },
  colFuncao: { width: "24%" },
  colTurnos: { width: "12%", textAlign: "right" },
  colHoras: { width: "12%", textAlign: "right" },
  colValor: { width: "12%", textAlign: "right" },
  vazio: { marginTop: 8, color: "#78716c" },
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

function formatarHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
}

/** "Imprimir tudo" — versão resumida/agregada do que já aparece em
 * /relatorios (totais + custo por função + por pessoa), sem detalhe turno
 * a turno (esse fica no relatório individual por pessoa). */
export async function gerarPdfRelatorioGeral(params: {
  empresaNome: string;
  periodoLabel: string;
  totalMinutos: number;
  totalValor: number;
  totalTurnos: number;
  porFuncao: LinhaPorFuncao[];
  porPessoaFuncao: LinhaPorPessoaFuncao[];
}): Promise<Buffer> {
  const porPessoaOrdenado = [...params.porPessoaFuncao].sort((a, b) => b.valor - a.valor);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório geral — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardValor}>R$ {params.totalValor.toFixed(2)}</Text>
            <Text style={styles.cardLabel}>Custo total (PIX)</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValor}>{formatarHoras(params.totalMinutos)}</Text>
            <Text style={styles.cardLabel}>Horas trabalhadas</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValor}>{params.totalTurnos}</Text>
            <Text style={styles.cardLabel}>Turnos no período</Text>
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Custo por função</Text>
        {params.porFuncao.length === 0 ? (
          <Text style={styles.vazio}>Nenhum turno pago nesse período.</Text>
        ) : (
          <View style={styles.tabela}>
            <View style={styles.linhaCabecalho}>
              <Text style={styles.colNome}>Função</Text>
              <Text style={styles.colTurnos}>Turnos</Text>
              <Text style={styles.colHoras}>Horas</Text>
              <Text style={styles.colValor}>Valor</Text>
            </View>
            {params.porFuncao.map((f) => (
              <View key={f.funcaoId} style={styles.linha}>
                <Text style={styles.colNome}>{f.nome}</Text>
                <Text style={styles.colTurnos}>{f.turnos}</Text>
                <Text style={styles.colHoras}>{formatarHoras(f.minutos)}</Text>
                <Text style={styles.colValor}>R$ {f.valor.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.secaoTitulo}>Por pessoa</Text>
        {porPessoaOrdenado.length === 0 ? (
          <Text style={styles.vazio}>Nenhum turno pago nesse período.</Text>
        ) : (
          <View style={styles.tabela}>
            <View style={styles.linhaCabecalho}>
              <Text style={styles.colNome}>Pessoa</Text>
              <Text style={styles.colFuncao}>Função</Text>
              <Text style={styles.colTurnos}>Turnos</Text>
              <Text style={styles.colHoras}>Horas</Text>
              <Text style={styles.colValor}>Valor</Text>
            </View>
            {porPessoaOrdenado.map((p, i) => (
              <View key={i} style={styles.linha}>
                <Text style={styles.colNome}>{p.pessoaNome}</Text>
                <Text style={styles.colFuncao}>{p.funcaoNome}</Text>
                <Text style={styles.colTurnos}>{p.turnos}</Text>
                <Text style={styles.colHoras}>{formatarHoras(p.minutos)}</Text>
                <Text style={styles.colValor}>R$ {p.valor.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

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
