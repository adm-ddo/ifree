import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora, formatarDataHoraComDiaSemana } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import type { TipoDocumentoPessoa, TipoChavePix } from "@/generated/prisma/enums";

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
  tabelaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
    fontSize: 9,
  },
  tabelaLinha: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #e7e5e4",
    fontSize: 9,
  },
  colFuncao: { width: "18%" },
  colEntrada: { width: "36%" },
  colSaida: { width: "36%" },
  colValor: { width: "10%", textAlign: "right" },
  valorTotalBox: {
    marginTop: 4,
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  valorTotalLabel: { fontSize: 11, color: "#166534" },
  valorTotalValor: { fontSize: 14, fontWeight: 700, color: "#166534" },
  paragrafo: { marginBottom: 8, lineHeight: 1.5, fontSize: 9, color: "#57534e" },
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

export type ItemReciboGrupo = {
  funcaoNome: string;
  horaEntrada: Date;
  horaSaida: Date;
  valorTotal: number;
};

export type DadosReciboGrupo = {
  empresaNome: string;
  empresaCnpj: string;
  pessoaNome: string;
  pessoaDocumento: string;
  pessoaTipoDocumento: TipoDocumentoPessoa;
  chavePixDestino: string;
  tipoChavePixDestino: TipoChavePix;
  criadoEm: Date;
  itens: ItemReciboGrupo[];
};

/** Recibo único consolidando vários turnos da mesma pessoa pagos juntos
 * numa transferência PIX só (ver GrupoPagamento) — o "detalhamento do que
 * foi agrupado" pedido pelo dono, com o valor de cada turno e o total
 * pago. Os recibos individuais de cada turno (com a assinatura do totem)
 * continuam existindo à parte, ver gerarPdfRecibo/gerarPdfRecibos. */
export async function gerarPdfReciboGrupo(props: DadosReciboGrupo): Promise<Buffer> {
  const valorTotal = props.itens.reduce((soma, i) => soma + i.valorTotal, 0);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>
            Recibo de Pagamento Agrupado — {props.itens.length} turnos
          </Text>
          <Text style={styles.subtitulo}>
            {props.empresaNome} · {props.empresaCnpj}
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Prestador(a) do serviço</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.valor}>{props.pessoaNome}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>{LABEL_TIPO_DOCUMENTO[props.pessoaTipoDocumento]}</Text>
            <Text style={styles.valor}>
              {formatarDocumento(props.pessoaTipoDocumento, props.pessoaDocumento)}
            </Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Turnos incluídos neste pagamento</Text>
          <View style={styles.tabelaCabecalho}>
            <Text style={styles.colFuncao}>Função</Text>
            <Text style={styles.colEntrada}>Entrada</Text>
            <Text style={styles.colSaida}>Saída</Text>
            <Text style={styles.colValor}>Valor</Text>
          </View>
          {props.itens.map((item, i) => (
            <View key={i} style={styles.tabelaLinha}>
              <Text style={styles.colFuncao}>{item.funcaoNome}</Text>
              <Text style={styles.colEntrada}>{formatarDataHoraComDiaSemana(item.horaEntrada)}</Text>
              <Text style={styles.colSaida}>
                {formatarDataHoraComDiaSemana(item.horaSaida, item.horaEntrada)}
              </Text>
              <Text style={styles.colValor}>R$ {item.valorTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.valorTotalBox}>
          <Text style={styles.valorTotalLabel}>Valor total pago ({props.itens.length} turnos)</Text>
          <Text style={styles.valorTotalValor}>R$ {valorTotal.toFixed(2)}</Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Pagamento</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Forma</Text>
            <Text style={styles.valor}>PIX</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>
              Chave PIX ({LABEL_TIPO_CHAVE_PIX[props.tipoChavePixDestino]})
            </Text>
            <Text style={styles.valor}>{props.chavePixDestino}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Confirmado em</Text>
            <Text style={styles.valor}>{formatarDataHoraComDiaSemana(props.criadoEm)}</Text>
          </View>
        </View>

        <Text style={styles.paragrafo}>
          Este recibo consolida o pagamento de {props.itens.length} turnos prestados
          por {props.pessoaNome} à {props.empresaNome}, quitados numa única
          transferência PIX. Os termos e recibos individuais de cada turno,
          incluindo a confirmação assinada digitalmente no totem ao final de
          cada um, continuam disponíveis separadamente.
        </Text>

        <Text style={{ ...styles.paragrafo, fontSize: 8, color: "#78716c" }}>
          Quando processado automaticamente pela plataforma, o repasse via
          PIX é executado pela Asaas Gestão Financeira S.A., instituição
          de pagamento autorizada a funcionar pelo Banco Central do
          Brasil, a partir da conta digital de titularidade da empresa
          contratante — o iFREE é a plataforma de tecnologia que
          intermedeia o serviço, não a instituição que processa o
          pagamento. Pagamentos feitos manualmente pela empresa seguem o
          meio por ela escolhido.
        </Text>

        <Text style={{ ...styles.paragrafo, fontSize: 8, color: "#a8a29e" }}>
          Este é um texto padrão gerado automaticamente e não substitui
          revisão jurídica antes do uso em produção.
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
