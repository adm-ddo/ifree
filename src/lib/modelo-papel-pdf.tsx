import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  titulo: { fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  subtitulo: { fontSize: 10, textAlign: "center", color: "#57534e", marginBottom: 20 },
  tabela: { borderTop: "1pt solid #d6d3d1", borderLeft: "1pt solid #d6d3d1" },
  linha: { flexDirection: "row" },
  celulaCabecalho: {
    flex: 1,
    padding: 6,
    borderRight: "1pt solid #d6d3d1",
    borderBottom: "1pt solid #d6d3d1",
    backgroundColor: "#f5f5f4",
    fontWeight: 700,
  },
  celulaVazia: {
    flex: 1,
    height: 22,
    padding: 6,
    borderRight: "1pt solid #d6d3d1",
    borderBottom: "1pt solid #d6d3d1",
  },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#a8a29e",
    textAlign: "center",
  },
});

/** Gerador genérico de checklist em branco pra imprimir e preencher à
 * mão — usado pelos modelos de papel padrão do sistema (MODELOS_PADRAO_
 * PAPEL em src/lib/ged.ts) e por qualquer futuro modelo novo que só
 * precise de um título + colunas configuráveis, sem código extra. */
export async function gerarPdfModeloPapel(params: {
  empresaNome: string;
  titulo: string;
  colunas: string[];
  linhasBrancas?: number;
}): Promise<Buffer> {
  const totalLinhas = params.linhasBrancas ?? 28;

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>{params.titulo.toUpperCase()}</Text>
        <Text style={styles.subtitulo}>{params.empresaNome}</Text>

        <View style={styles.tabela}>
          <View style={styles.linha}>
            {params.colunas.map((coluna) => (
              <Text key={coluna} style={styles.celulaCabecalho}>
                {coluna}
              </Text>
            ))}
          </View>
          {Array.from({ length: totalLinhas }).map((_, i) => (
            <View key={i} style={styles.linha}>
              {params.colunas.map((coluna) => (
                <Text key={coluna} style={styles.celulaVazia} />
              ))}
            </View>
          ))}
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
