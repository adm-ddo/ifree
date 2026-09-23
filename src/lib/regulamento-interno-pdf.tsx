import "server-only";
import { Document, Page, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.5 },
  titulo: { fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  subtitulo: { fontSize: 10, textAlign: "center", color: "#57534e", marginBottom: 24 },
  paragrafo: { marginBottom: 12, textAlign: "justify" },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#a8a29e",
    textAlign: "center",
  },
});

/** Regulamento interno — documento da empresa, não de uma pessoa
 * específica, por isso sem bloco de assinatura individual (é pra
 * impressão/afixação/distribuição geral). */
export async function gerarPdfRegulamentoInterno(params: {
  empresaNome: string;
  empresaCnpj: string;
  paragrafos: string[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>REGULAMENTO INTERNO</Text>
        <Text style={styles.subtitulo}>
          {params.empresaNome} — CNPJ {params.empresaCnpj}
        </Text>

        {params.paragrafos.map((paragrafo, i) => (
          <Text key={i} style={styles.paragrafo}>
            {paragrafo}
          </Text>
        ))}

        <Text
          style={styles.rodape}
          render={({ pageNumber, totalPages }) => `Gerado pelo iFREE · página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
