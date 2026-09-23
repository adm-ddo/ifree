import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataSemHoraExtenso } from "@/lib/data";
import type { TipoDocumentoGed } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.5 },
  titulo: { fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 24 },
  linhaDados: { marginBottom: 4 },
  local: { marginTop: 16, marginBottom: 16 },
  paragrafo: { marginBottom: 12, textAlign: "justify" },
  assinaturaBloco: { marginTop: 48 },
  linhaAssinatura: { borderTop: "1pt solid #1c1917", width: 260, marginTop: 40, paddingTop: 4 },
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

/// Este gerador serve ADVERTENCIA/SUSPENSAO/CONTRATO_TRABALHO — suspensão
/// na prática usa o layout dedicado de suspensao-pdf.tsx, e TERMO_CIENCIA
/// usa termo-ciencia-pdf.tsx (a rota despacha por tipo antes de chamar
/// este arquivo), mas o tipo fica aceito aqui pra não travar quem
/// eventualmente reusar o mesmo formato de carta genérica.
type TipoDocumentoGedCarta = Exclude<TipoDocumentoGed, "TERMO_CIENCIA">;

const TITULOS: Record<TipoDocumentoGedCarta, string> = {
  ADVERTENCIA: "CARTA DE ADVERTÊNCIA DISCIPLINAR",
  SUSPENSAO: "CARTA DE SUSPENSÃO DISCIPLINAR",
  CONTRATO_TRABALHO: "CONTRATO DE TRABALHO",
};

const RODAPE_AVISO: Record<TipoDocumentoGedCarta, string> = {
  ADVERTENCIA: "Documento gerado automaticamente — revisão do RH recomendada antes da entrega",
  SUSPENSAO: "Documento gerado automaticamente — revisão do RH recomendada antes da entrega",
  CONTRATO_TRABALHO: "Documento gerado automaticamente — revisão jurídica recomendada antes da assinatura",
};

export type DadosDocumentoGed = {
  tipo: TipoDocumentoGedCarta;
  empresaNome: string;
  empresaCnpj: string;
  pessoaNome: string;
  pessoaDocumento: string;
  cargo: string | null;
  ctpsNumero: string | null;
  ctpsSerieUf: string | null;
  dataDocumento: Date;
  corpoTexto: string;
};

/** Gerador único pra advertência/suspensão/contrato de trabalho CLT —
 * as três são a mesma forma (cabeçalho da empresa, dados da pessoa,
 * corpo de texto em parágrafos, data, linha de assinatura), só o título
 * muda por `tipo`. Corpo vem já resolvido (modelo escolhido ou contrato
 * CLT customizado) — aqui só faz o split em parágrafos e desenha. */
export async function gerarPdfDocumentoGed(params: DadosDocumentoGed): Promise<Buffer> {
  const dataDocumentoLabel = formatarDataSemHoraExtenso(params.dataDocumento);
  const paragrafos = params.corpoTexto.split(/\n\s*\n/).filter((p) => p.trim());

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>{TITULOS[params.tipo]}</Text>

        <Text style={styles.linhaDados}>Empresa: {params.empresaNome}</Text>
        <Text style={styles.linhaDados}>CNPJ: {params.empresaCnpj}</Text>
        <Text style={styles.linhaDados}>À(Ao): {params.pessoaNome}</Text>
        <Text style={styles.linhaDados}>CPF: {params.pessoaDocumento}</Text>
        {params.cargo && <Text style={styles.linhaDados}>Cargo: {params.cargo}</Text>}
        {params.ctpsNumero && params.ctpsSerieUf && (
          <Text style={styles.linhaDados}>
            CTPS: {params.ctpsNumero} / {params.ctpsSerieUf}
          </Text>
        )}

        <Text style={styles.local}>Data: {dataDocumentoLabel}.</Text>

        {paragrafos.map((paragrafo, i) => (
          <Text key={i} style={styles.paragrafo}>
            {paragrafo}
          </Text>
        ))}

        <View style={styles.assinaturaBloco}>
          <Text>Atenciosamente,</Text>
          <Text>{params.empresaNome}</Text>
          <Text>Representante Legal</Text>
        </View>

        <View style={styles.linhaAssinatura}>
          <Text>Ciente/Assinatura — {params.pessoaNome}</Text>
        </View>

        <Text
          style={styles.rodape}
          render={({ pageNumber, totalPages }) => `${RODAPE_AVISO[params.tipo]} · página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
