import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import { formatarCpf } from "@/lib/cpf";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  secao: { marginBottom: 14 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottom: "0.5pt solid #d6d3d1",
  },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#78716c" },
  valor: { fontWeight: 700 },
  valorTotalBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  valorTotalLabel: { fontSize: 11, color: "#166534" },
  valorTotalValor: { fontSize: 14, fontWeight: 700, color: "#166534" },
  paragrafo: { marginBottom: 8, lineHeight: 1.5 },
  formaPagamentoBox: { flexDirection: "row", gap: 24, marginTop: 4 },
  checkbox: { flexDirection: "row", alignItems: "center", gap: 6 },
  checkboxQuadrado: { width: 12, height: 12, border: "1pt solid #292524" },
  assinaturaBox: { marginTop: 40, alignItems: "center" },
  assinaturaLinha: { borderTop: "0.5pt solid #78716c", width: 260, marginTop: 36 },
  assinaturaLabel: { fontSize: 9, color: "#78716c", marginTop: 4, textAlign: "center" },
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

export type DadosReciboAjudaCusto = {
  empresaNome: string;
  empresaCnpj: string;
  pessoaNome: string;
  pessoaDocumento: string;
  mesReferenciaLabel: string;
  dataLabel: string;
  valor: number;
};

/** Recibo de ajuda de custo (transporte) pra impressão — pago em dinheiro
 * ou PIX, marcado à caneta na hora do pagamento de verdade (por isso as
 * duas opções ficam em branco aqui, não uma já preenchida). Natureza
 * indenizatória: cobre deslocamento (ônibus, aplicativo, bicicleta,
 * moto), não é salário — ver o parágrafo explicativo abaixo, que é
 * exatamente o texto que dá essa cobertura. Diferente do recibo de turno
 * (que tem assinatura digital do totem), este é assinado fisicamente
 * depois de impresso, então só tem a linha em branco. */
function ReciboAjudaCustoPagina(props: DadosReciboAjudaCusto) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Recibo de Ajuda de Custo — Transporte</Text>
        <Text style={styles.subtitulo}>
          {props.empresaNome} · {props.empresaCnpj}
        </Text>
      </View>

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Funcionário(a)</Text>
        <View style={styles.linha}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.valor}>{props.pessoaNome}</Text>
        </View>
        <View style={styles.linha}>
          <Text style={styles.label}>CPF</Text>
          <Text style={styles.valor}>{formatarCpf(props.pessoaDocumento)}</Text>
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Referência</Text>
        <View style={styles.linha}>
          <Text style={styles.label}>Mês de referência</Text>
          <Text style={styles.valor}>{props.mesReferenciaLabel}</Text>
        </View>
        <View style={styles.linha}>
          <Text style={styles.label}>Data</Text>
          <Text style={styles.valor}>{props.dataLabel}</Text>
        </View>
        <View style={styles.valorTotalBox}>
          <Text style={styles.valorTotalLabel}>Valor da ajuda de custo</Text>
          <Text style={styles.valorTotalValor}>R$ {props.valor.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Forma de pagamento</Text>
        <View style={styles.formaPagamentoBox}>
          <View style={styles.checkbox}>
            <View style={styles.checkboxQuadrado} />
            <Text>Dinheiro</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxQuadrado} />
            <Text>PIX</Text>
          </View>
        </View>
      </View>

      <Text style={styles.paragrafo}>
        Recebi da empresa {props.empresaNome} o valor acima, referente a{" "}
        <Text style={{ fontWeight: 700 }}>ajuda de custo para despesas de deslocamento</Text>{" "}
        (transporte por ônibus, aplicativo, bicicleta ou moto) até o
        local de trabalho. Este valor tem natureza indenizatória, não
        constitui salário e não integra a remuneração para fins de
        férias, 13º salário, FGTS ou verbas rescisórias.
      </Text>

      <Text style={{ ...styles.paragrafo, fontSize: 8, color: "#a8a29e" }}>
        Este é um texto padrão gerado automaticamente e não substitui
        revisão jurídica/contábil antes do uso.
      </Text>

      <View style={styles.assinaturaBox}>
        <View style={styles.assinaturaLinha} />
        <Text style={styles.assinaturaLabel}>
          {props.pessoaNome} · assinatura de recebimento
        </Text>
      </View>

      <Text
        style={styles.rodape}
        render={({ pageNumber, totalPages }) =>
          `Gerado em ${formatarDataHora(new Date())} · página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </Page>
  );
}

export async function gerarPdfReciboAjudaCusto(props: DadosReciboAjudaCusto): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <ReciboAjudaCustoPagina {...props} />
    </Document>
  );
}
