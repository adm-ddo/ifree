import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// 30 linhas bem espaçadas preenche a folha inteira (A4) com campo
// confortável pra escrever à caneta — menos linhas que o original em
// papel (44), decisão explícita do Thiago pra priorizar espaço de
// escrita em vez de caber mais linhas na mesma folha.
const TOTAL_LINHAS = 30;

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#1c1917" },
  empresaNome: { fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 5 },
  tituloBox: {
    border: "1pt solid #1c1917",
    padding: 5,
    marginBottom: 8,
  },
  tituloBoxTexto: { textAlign: "center", fontWeight: 700, fontSize: 11 },
  tabela: { borderTop: "1pt solid #1c1917", borderLeft: "1pt solid #1c1917" },
  linha: { flexDirection: "row" },
  celulaCabecalho: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRight: "1pt solid #1c1917",
    borderBottom: "1pt solid #1c1917",
    backgroundColor: "#f5f5f4",
    fontWeight: 700,
    fontSize: 8.5,
  },
  celula: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRight: "1pt solid #1c1917",
    borderBottom: "1pt solid #1c1917",
    fontSize: 9.5,
  },
  colData: { flex: 1.1 },
  colTurno: { flex: 2.4 },
  colFiltrado: { flex: 1 },
  colTrocado: { flex: 1 },
  colLitros: { flex: 1.8 },
  colResponsavel: { flex: 1.9 },
  notaBox: {
    border: "1pt solid #1c1917",
    borderTop: "none",
    padding: 7,
  },
  notaTexto: { textAlign: "center", fontSize: 8.5 },
  rodape: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    fontSize: 8,
    color: "#a8a29e",
    textAlign: "center",
  },
});

/** Planilha de controle de filtro/troca de óleo — modelo real cedido
 * pelo Thiago, substitui o checklist genérico anterior (que só tinha
 * data/fritadeira/responsável/assinatura). Cada linha já vem com os
 * marcadores impressos (Manhã( )/Noite( ), Filtrado( ), Trocado( )) pra
 * só circular à caneta, igual ao papel de verdade usado no restaurante —
 * por isso ganhou um renderer dedicado em vez do genérico de colunas
 * livres (gerarPdfModeloPapel), que só sabe desenhar colunas em branco. */
export async function gerarPdfControleTrocaOleo(params: { empresaNome: string }): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.empresaNome}>{params.empresaNome.toUpperCase()}</Text>

        <View style={styles.tituloBox}>
          <Text style={styles.tituloBoxTexto}>PLANILHA DE CONTROLE DE FILTRO/TROCA DE ÓLEO</Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linha}>
            <Text style={[styles.celulaCabecalho, styles.colData]}>DATA</Text>
            <Text style={[styles.celulaCabecalho, styles.colTurno]}>TURNO</Text>
            <Text style={[styles.celulaCabecalho, styles.colFiltrado]}>FILTRADO</Text>
            <Text style={[styles.celulaCabecalho, styles.colTrocado]}>TROCADO</Text>
            <Text style={[styles.celulaCabecalho, styles.colLitros]}>LITROS ADICIONADOS</Text>
            <Text style={[styles.celulaCabecalho, styles.colResponsavel]}>RESPONSÁVEL</Text>
          </View>
          {Array.from({ length: TOTAL_LINHAS }).map((_, i) => (
            <View key={i} style={styles.linha}>
              <Text style={[styles.celula, styles.colData]}>____/____/____</Text>
              <Text style={[styles.celula, styles.colTurno]}>Manhã(   )      Noite(   )</Text>
              <Text style={[styles.celula, styles.colFiltrado]}>(   )</Text>
              <Text style={[styles.celula, styles.colTrocado]}>(   )</Text>
              <Text style={[styles.celula, styles.colLitros]} />
              <Text style={[styles.celula, styles.colResponsavel]} />
            </View>
          ))}
        </View>

        <View style={styles.notaBox}>
          <Text style={styles.notaTexto}>
            O ÓLEO DEVE SER FILTRADO 1X POR SEMANA E A CADA 20 DIAS O ÓLEO DEVE SER TROCADO 100%. OU SEJA,
            FILTRA 2 SEMANAS E TROCA NA TERCEIRA SEMANA.
          </Text>
        </View>

        <Text
          style={styles.rodape}
          render={({ pageNumber, totalPages }) => `Gerado pelo iFREE · página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
