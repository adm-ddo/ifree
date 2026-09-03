import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora, formatarDataHoraComDiaSemana } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import type { TipoDocumentoPessoa } from "@/generated/prisma/enums";

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
  paragrafo: { marginBottom: 8, lineHeight: 1.5 },
  assinaturaBox: { marginTop: 24, alignItems: "center" },
  assinaturaImg: { width: 220, height: 80, objectFit: "contain" },
  assinaturaLinha: { borderTop: "0.5pt solid #78716c", width: 220, marginTop: 4 },
  assinaturaLabel: { fontSize: 8, color: "#78716c", marginTop: 4, textAlign: "center" },
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

export type DadosContrato = {
  empresaNome: string;
  empresaCnpj: string;
  pessoaNome: string;
  pessoaDocumento: string;
  pessoaTipoDocumento: TipoDocumentoPessoa;
  funcaoNome: string;
  valorHoraAplicado: number;
  horaEntrada: Date;
  assinaturaContratoDataUrl: string;
  termos: string[];
};

function ContratoPagina(props: DadosContrato) {
  return (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Contrato de Prestação de Serviço Eventual</Text>
          <Text style={styles.subtitulo}>
            {props.empresaNome} · {props.empresaCnpj}
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Partes</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Contratante</Text>
            <Text style={styles.valor}>
              {props.empresaNome} ({props.empresaCnpj})
            </Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Contratado(a)</Text>
            <Text style={styles.valor}>
              {props.pessoaNome} ({LABEL_TIPO_DOCUMENTO[props.pessoaTipoDocumento]}{" "}
              {formatarDocumento(props.pessoaTipoDocumento, props.pessoaDocumento)})
            </Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Condições do serviço</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Função</Text>
            <Text style={styles.valor}>{props.funcaoNome}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Valor por hora</Text>
            <Text style={styles.valor}>R$ {props.valorHoraAplicado.toFixed(2)}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Início do turno</Text>
            <Text style={styles.valor}>{formatarDataHoraComDiaSemana(props.horaEntrada)}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Termos</Text>
          {props.termos.map((paragrafo, i) => (
            <Text key={i} style={styles.paragrafo}>
              {paragrafo}
            </Text>
          ))}
          <Text style={{ ...styles.paragrafo, fontSize: 8, color: "#a8a29e" }}>
            Este é um texto padrão gerado automaticamente e não substitui
            revisão jurídica antes do uso em produção.
          </Text>
        </View>

        <View style={styles.assinaturaBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image aqui é do @react-pdf/renderer, não HTML; não tem prop alt */}
          <Image src={props.assinaturaContratoDataUrl} style={styles.assinaturaImg} />
          <View style={styles.assinaturaLinha} />
          <Text style={styles.assinaturaLabel}>
            {props.pessoaNome} · assinado digitalmente no totem em{" "}
            {formatarDataHoraComDiaSemana(props.horaEntrada)}
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

export function ContratoDocument(props: DadosContrato) {
  return (
    <Document>
      <ContratoPagina {...props} />
    </Document>
  );
}

export function ContratosDocument({ itens }: { itens: DadosContrato[] }) {
  return (
    <Document>
      {itens.map((item, i) => (
        <ContratoPagina key={i} {...item} />
      ))}
    </Document>
  );
}

export async function gerarPdfContrato(props: DadosContrato): Promise<Buffer> {
  return renderToBuffer(<ContratoDocument {...props} />);
}

/** Junta os contratos de vários turnos num único PDF (um por página) —
 * usado na impressão em lote da página do freelancer, quando ele fez mais
 * de um turno/função na empresa e o admin quer imprimir tudo de uma vez. */
export async function gerarPdfContratos(itens: DadosContrato[]): Promise<Buffer> {
  return renderToBuffer(<ContratosDocument itens={itens} />);
}
