import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataSemHora } from "@/lib/data";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.4 },
  empresaNome: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 12 },
  tituloBox: {
    border: "1pt solid #1c1917",
    padding: 8,
    marginBottom: 14,
  },
  tituloBoxTexto: { textAlign: "center", fontWeight: 700, fontSize: 11 },
  paragrafo: { marginBottom: 6, textAlign: "justify" },
  listaItem: { marginBottom: 3 },
  tabela: { marginTop: 10, marginBottom: 14, borderTop: "1pt solid #1c1917", borderLeft: "1pt solid #1c1917" },
  linha: { flexDirection: "row" },
  celulaCabecalho: {
    padding: 5,
    borderRight: "1pt solid #1c1917",
    borderBottom: "1pt solid #1c1917",
    backgroundColor: "#f5f5f4",
    fontWeight: 700,
    fontSize: 8.5,
  },
  celula: {
    padding: 5,
    borderRight: "1pt solid #1c1917",
    borderBottom: "1pt solid #1c1917",
    minHeight: 20,
    fontSize: 8.5,
  },
  colQuant: { width: "8%" },
  colItem: { width: "26%" },
  colValor: { width: "12%" },
  colDataEntrega: { width: "13%" },
  colCA: { width: "11%" },
  colDataDevolucao: { width: "13%" },
  colAssinatura: { width: "17%" },
  rodapeCampo: { marginTop: 16 },
  rodape: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#a8a29e",
    textAlign: "center",
  },
});

function formatarValor(valor: number | null): string {
  return valor === null ? "" : `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Ficha de controle de entrega de EPI — modelo real cedido pelo Thiago
 * (usado pela Prime Parrilla Express), com o valor do item impresso na
 * tabela pra empresa saber quanto descontar na rescisão se o EPI não for
 * devolvido — o iFREE só imprime o valor, não calcula nem aplica nenhum
 * desconto sozinho. "Data de devolução" e "Assinatura" ficam em branco
 * de propósito: são preenchidas à mão, uma vez pra cada item, na hora
 * em que a pessoa efetivamente recebe (ou devolve) o equipamento. */
export async function gerarPdfFichaEpi(params: {
  empresaNome: string;
  pessoaNome: string;
  matriculaInterna: string | null;
  cargo: string | null;
  entradas: { item: string; quantidade: number; numeroCA: string | null; valorUnitario: number | null; dataEntrega: Date }[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.empresaNome}>{params.empresaNome.toUpperCase()}</Text>

        <View style={styles.tituloBox}>
          <Text style={styles.tituloBoxTexto}>CONTROLE DE ENTREGA DE EPI&apos;S</Text>
          <Text style={styles.tituloBoxTexto}>EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL</Text>
        </View>

        <Text style={styles.paragrafo}>
          Eu {params.pessoaNome} — Registro Nº {params.matriculaInterna ?? "_______"}
          {params.cargo ? `, Função ${params.cargo},` : ","} declaro para todos os efeitos legais que recebi da{" "}
          {params.empresaNome}, os equipamentos de proteção individual (EPI) relacionados abaixo, bem como as
          instruções para sua correta utilização, obrigando-me:
        </Text>
        <Text style={styles.listaItem}>1) usar o EPI e uniforme indicado, apenas às finalidades a que se destina;</Text>
        <Text style={styles.listaItem}>
          2) comunicar o setor de obras/segurança do trabalho, qualquer alteração no EPI que o torne parcialmente
          ou totalmente danificado;
        </Text>
        <Text style={styles.listaItem}>
          3) responsabilizar-me pelos danos do EPI, quando usado de modo inadequado ou fora das atividades a que
          se destina, bem como pelo seu extravio;
        </Text>
        <Text style={styles.listaItem}>4) devolvê-lo quando da troca por outro ou no meu desligamento da empresa.</Text>

        <View style={styles.tabela}>
          <View style={styles.linha}>
            <Text style={[styles.celulaCabecalho, styles.colQuant]}>Quant.</Text>
            <Text style={[styles.celulaCabecalho, styles.colItem]}>EPI&apos;S</Text>
            <Text style={[styles.celulaCabecalho, styles.colValor]}>Valor</Text>
            <Text style={[styles.celulaCabecalho, styles.colDataEntrega]}>Entrega</Text>
            <Text style={[styles.celulaCabecalho, styles.colCA]}>C.A</Text>
            <Text style={[styles.celulaCabecalho, styles.colDataDevolucao]}>Devolução</Text>
            <Text style={[styles.celulaCabecalho, styles.colAssinatura]}>Assinatura</Text>
          </View>
          {params.entradas.map((entrada, i) => (
            <View key={i} style={styles.linha}>
              <Text style={[styles.celula, styles.colQuant]}>{entrada.quantidade}</Text>
              <Text style={[styles.celula, styles.colItem]}>{entrada.item}</Text>
              <Text style={[styles.celula, styles.colValor]}>{formatarValor(entrada.valorUnitario)}</Text>
              <Text style={[styles.celula, styles.colDataEntrega]}>{formatarDataSemHora(entrada.dataEntrega)}</Text>
              <Text style={[styles.celula, styles.colCA]}>{entrada.numeroCA ?? ""}</Text>
              <Text style={[styles.celula, styles.colDataDevolucao]} />
              <Text style={[styles.celula, styles.colAssinatura]} />
            </View>
          ))}
        </View>

        <Text style={styles.paragrafo}>
          Declaro para todos os efeitos legais que recebi todos os Equipamentos de Proteção Individual constantes
          da lista acima, novos e em perfeitas condições de uso, e que estou ciente das obrigações descritas na
          NR 06, baixada pela Portaria MTB 3214/78, sub-item 6.7.1, a saber:
        </Text>
        <Text style={styles.listaItem}>a) usar, utilizando-o apenas para a finalidade a que se destina;</Text>
        <Text style={styles.listaItem}>b) responsabilizar-se pela guarda e conservação;</Text>
        <Text style={styles.listaItem}>c) comunicar ao empregador qualquer alteração que o torne impróprio para uso; e</Text>
        <Text style={styles.listaItem}>d) cumprir as determinações do empregador sobre o uso adequado.</Text>
        <Text style={styles.paragrafo}>
          Declaro, também, que estou ciente das disposições do Art. 462 e § 1º da CLT, e autorizo o desconto
          salarial proporcional ao custo de reparação do dano que os EPI&apos;s aos meus cuidados venham
          apresentar.
        </Text>
        <Text style={styles.paragrafo}>
          Declaro ainda estar ciente de que o uso é obrigatório, sob pena de ser punido conforme Lei nº 6.514, de
          27/12/77, artigo 158.
        </Text>
        <Text style={styles.paragrafo}>
          Declaro, ainda, que recebi treinamento referente ao uso do E.P.I. e as Normas de Segurança do Trabalho.
        </Text>

        <Text style={styles.rodapeCampo}>Data: ______________________</Text>
        <Text style={styles.rodapeCampo}>Local: ______________________________________</Text>
        <Text style={styles.rodapeCampo}>
          ASSINATURA: (assinatura do Colaborador) ______________________________________
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
