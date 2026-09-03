import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const FUSO_BRASIL = "America/Sao_Paulo";

function dataPorExtenso(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: FUSO_BRASIL }).format(data);
}

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

/** Carta de advertência disciplinar por falta de registro de ponto —
 * modelo fornecido pela empresa, preenchido com os dados reais do
 * funcionário e do incidente específico. Gerada a partir de UM
 * RegistroPonto que precisou de correção manual (ver botão em
 * RegistroPontoHistorico.tsx) — cobre um único dia por carta, mesmo
 * espírito de "um documento por incidente" já usado no contrato/recibo do
 * extra. Documento de apoio: como toda peça disciplinar de RH, o ideal é
 * revisão de um responsável antes de entregar — o sistema só preenche o
 * modelo, não decide se a advertência é cabível. */
export async function gerarPdfAdvertenciaPonto(params: {
  empresaNome: string;
  empresaLocal: string;
  pessoaNome: string;
  cargo: string;
  ctpsNumero: string;
  ctpsSerieUf: string;
  dataOcorrencia: Date;
  dataEmissao: Date;
}): Promise<Buffer> {
  const dataOcorrenciaLabel = dataPorExtenso(params.dataOcorrencia);
  const dataEmissaoLabel = dataPorExtenso(params.dataEmissao);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>CARTA DE ADVERTÊNCIA DISCIPLINAR</Text>

        <Text style={styles.linhaDados}>À(Ao): {params.pessoaNome}</Text>
        <Text style={styles.linhaDados}>Cargo: {params.cargo}</Text>
        <Text style={styles.linhaDados}>
          CTPS: {params.ctpsNumero} / {params.ctpsSerieUf}
        </Text>

        <Text style={styles.local}>
          Local e Data: {params.empresaLocal}, {dataEmissaoLabel}.
        </Text>

        <Text style={styles.paragrafo}>Prezado(a) colaborador(a),</Text>

        <Text style={styles.paragrafo}>
          Comunicamos-lhe por meio deste documento que Vossa Senhoria está sendo ADVERTIDO(A)
          formalmente devido ao descumprimento das normas internas de controle de jornada desta
          empresa.
        </Text>

        <Text style={styles.paragrafo}>Fato motivador:</Text>

        <Text style={styles.paragrafo}>
          No dia {dataOcorrenciaLabel}, você deixou de registrar o seu horário de entrada/saída no
          sistema de ponto eletrônico/manual, gerando a necessidade de intervenção do departamento
          de Recursos Humanos/Administrativo para a realização de marcação manual corretiva.
        </Text>

        <Text style={styles.paragrafo}>
          Ressaltamos que o registro correto da jornada de trabalho é uma obrigação legal do
          empregado e uma norma interna essencial para a correta apuração da folha de pagamento e
          cumprimento da legislação trabalhista (art. 74 da CLT).
        </Text>

        <Text style={styles.paragrafo}>
          O esquecimento ou a omissão frequente do registro de ponto constitui ato de indisciplina.
          Solicitamos a sua colaboração para que tal situação não volte a se repetir, sob pena de
          adoção de medidas disciplinares mais severas previstas em lei, tais como a suspensão
          disciplinar e, em caso de reincidência contínua, a rescisão do contrato de trabalho por
          justa causa (conforme o art. 482 da CLT).
        </Text>

        <Text style={styles.paragrafo}>
          Certos de sua atenção e cumprimento das diretrizes da empresa, solicitamos o seu ciente
          na via original deste documento.
        </Text>

        <View style={styles.assinaturaBloco}>
          <Text>Atenciosamente,</Text>
          <Text>{params.empresaNome}</Text>
          <Text>Representante Legal</Text>
        </View>

        <View style={styles.linhaAssinatura}>
          <Text>Ciente do(a) colaborador(a) — {params.pessoaNome}</Text>
        </View>

        <Text
          style={styles.rodape}
          render={({ pageNumber, totalPages }) =>
            `Documento de apoio gerado automaticamente — revisão do RH recomendada antes da entrega · página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
