import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataSemHora } from "@/lib/data";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.35 },
  titulo: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 14 },
  paragrafo: { marginBottom: 7, textAlign: "justify" },
  linhaDivisoria: { borderTop: "1pt solid #d6d3d1", marginTop: 6, marginBottom: 10 },
  campo: { marginBottom: 6 },
  campoLabel: { fontWeight: 700 },
  caixaCopia: {
    border: "1pt solid #a8a29e",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  caixaCopiaLabel: { fontSize: 8.5, color: "#78716c", marginBottom: 6 },
  linhaEmBranco: { borderBottom: "1pt solid #d6d3d1", height: 15 },
  moldeCaixa: { marginTop: 24, padding: 16, border: "1pt solid #d6d3d1", borderRadius: 4 },
  moldeTexto: { fontSize: 13, lineHeight: 2.1, textAlign: "justify" },
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

/** PDF de 2 páginas pra qualquer termo que precise de uma declaração
 * escrita de próprio punho — usado hoje por "opcao-autonomo-apos-oferta-
 * clt" (freelancer que recusa virar CLT) e pelos dois termos de pedido
 * de demissão ("pedido-demissao-cumpre-aviso"/"pedido-demissao-
 * dispensado-aviso", ver FRASES_PROPRIO_PUNHO_RESCISAO em src/lib/ged.ts)
 * — diferente do renderer genérico gerarPdfTermoCiencia (que serve pro
 * resto do catálogo), esse documento precisa de uma segunda página só
 * com o molde da frase que a pessoa escreve de próprio punho na
 * página 1: página 1 tem o contexto + a caixa em branco pra escrever a
 * declaração à mão (sem citar a página 2 — pedido do Thiago, 2026-09-21,
 * pro caso original: a instrução é dada de viva voz por quem aplica o
 * documento, não impressa ali) + nome/CPF/assinatura/data; página 2 é só
 * o texto de referência pra quem aplica o documento conferir/ditar,
 * nunca é ela mesma assinada. `fraseProprioPunho` nunca deve usar aspas
 * (pedido original do Thiago): se a pessoa copiar literalmente o que vê,
 * aspas no texto dela ficariam estranhas. */
export async function gerarPdfDeclaracaoOfertaClt(params: {
  titulo: string;
  paragrafos: string[];
  pessoaNome: string;
  pessoaDocumento: string;
  dataDocumento: Date;
  fraseProprioPunho: string;
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

        <View style={styles.caixaCopia}>
          <Text style={styles.caixaCopiaLabel}>DECLARAÇÃO DE PRÓPRIO PUNHO (a ser escrita à mão, integralmente, pelo(a) profissional):</Text>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.linhaEmBranco} />
          ))}
        </View>

        <Text style={styles.campo}>
          <Text style={styles.campoLabel}>Nome do(a) profissional: </Text>
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

      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>DECLARAÇÃO DE PRÓPRIO PUNHO — TEXTO DE REFERÊNCIA</Text>
        <Text style={styles.paragrafo}>
          Esta página é só uma referência — não deve ser assinada nem entregue separada. É o texto que o(a)
          profissional deve escrever à mão, integralmente, no espaço em branco da página anterior deste documento
          (sem usar aspas):
        </Text>

        <View style={styles.moldeCaixa}>
          <Text style={styles.moldeTexto}>{params.fraseProprioPunho}</Text>
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
