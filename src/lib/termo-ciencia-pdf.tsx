import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataSemHora } from "@/lib/data";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.5 },
  titulo: { fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 20 },
  paragrafo: { marginBottom: 12, textAlign: "justify" },
  linhaDivisoria: { borderTop: "1pt solid #d6d3d1", marginTop: 8, marginBottom: 20 },
  campo: { marginBottom: 10 },
  campoLabel: { fontWeight: 700 },
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

/** Renderer genérico pra "termos de ciência" (campanhas de saúde,
 * monitoramento, normas gerais etc.) — título + corpo em parágrafos (já
 * com os tokens de empresa resolvidos, ver resolverTermoCiencia em
 * src/lib/ged.ts) + uma declaração de ciência final fixa (nome/CPF/
 * assinatura/data do colaborador + assinatura do representante da
 * empresa). Um renderer só serve pra todo termo desse catálogo — um
 * termo novo não precisa de PDF novo, só de um item a mais no array. */
export async function gerarPdfTermoCiencia(params: {
  titulo: string;
  paragrafos: string[];
  pessoaNome: string;
  pessoaDocumento: string;
  dataDocumento: Date;
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>{params.titulo.toUpperCase()}</Text>

        {params.paragrafos.map((paragrafo, i) => (
          <Text key={i} style={styles.paragrafo}>
            {paragrafo}
          </Text>
        ))}

        <View style={styles.linhaDivisoria} />

        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>Nome do(a) colaborador(a): </Text>
          {params.pessoaNome}
        </Text>
        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>CPF: </Text>
          {params.pessoaDocumento}
        </Text>
        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>Assinatura: </Text>
          ______________________________________
        </Text>
        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>Data: </Text>
          {formatarDataSemHora(params.dataDocumento)}
        </Text>

        <View style={styles.linhaDivisoria} />

        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>Representante da empresa: </Text>
          ______________________________________
        </Text>
        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>Assinatura: </Text>
          ______________________________________
        </Text>

        <Text
          style={styles.rodape}
          render={({ pageNumber, totalPages }) => `Gerado pelo iFREE · página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
