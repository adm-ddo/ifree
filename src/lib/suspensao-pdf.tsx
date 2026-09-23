import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataSemHora, formatarDataSemHoraExtenso } from "@/lib/data";
import type { HistoricoDisciplinarItem } from "@/lib/ged";

const DIA_MS = 24 * 60 * 60 * 1000;

const NUMEROS_POR_EXTENSO = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte",
  "vinte e um", "vinte e dois", "vinte e três", "vinte e quatro", "vinte e cinco",
  "vinte e seis", "vinte e sete", "vinte e oito", "vinte e nove", "trinta",
];

function porExtenso(n: number): string {
  return NUMEROS_POR_EXTENSO[n] ?? String(n);
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.5 },
  titulo: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 20 },
  linhaDados: { marginBottom: 4 },
  espacamento: { marginBottom: 12 },
  paragrafo: { marginBottom: 12, textAlign: "justify" },
  destaque: { fontWeight: 700 },
  assinaturaBloco: { marginTop: 40 },
  linhaAssinatura: { borderTop: "1pt solid #1c1917", width: 260, marginBottom: 4, paddingTop: 4 },
  testemunhasTitulo: { marginTop: 24 },
  testemunhasLinha: { flexDirection: "row", justifyContent: "space-between", marginTop: 32 },
  testemunhaAssinatura: { borderTop: "1pt solid #1c1917", width: 200, paddingTop: 4 },
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

/** Suspensão disciplinar — layout fixo real (cedido pelo Thiago, modelo
 * usado pela DAM), diferente do gerador genérico de carta em
 * documento-ged-pdf.tsx: cabeçalho EMPREGADOR/EMPREGADO(A)/CPF/CARGO,
 * quantidade de dias por extenso entre parênteses (ex.: "3 (três) dias"),
 * período calculado (início → último dia suspenso, não a data de
 * retorno), local em branco pra assinatura física, e dois signatários
 * (empregador + colaborador) mais duas testemunhas. O único texto que o
 * admin escreve é o motivo e a quantidade de dias — todo o resto é
 * calculado/preenchido sozinho em gerarDocumentoGed (src/app/ged/actions.ts). */
export async function gerarPdfSuspensao(params: {
  pessoaNome: string;
  pessoaDocumento: string;
  cargo: string | null;
  motivo: string;
  diasSuspensao: number;
  periodoInicio: Date;
  empresaNome: string;
  empresaCnpj: string;
}): Promise<Buffer> {
  const ultimoDiaSuspenso = new Date(params.periodoInicio.getTime() + (params.diasSuspensao - 1) * DIA_MS);
  const diasLabel = `${params.diasSuspensao} (${porExtenso(params.diasSuspensao)}) ${params.diasSuspensao === 1 ? "dia" : "dias"}`;

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>CARTA DE SUSPENSÃO DISCIPLINAR</Text>

        <Text style={styles.linhaDados}>EMPREGADOR: {params.empresaNome}.</Text>
        <Text style={styles.linhaDados}>CNPJ: {params.empresaCnpj}</Text>
        <View style={styles.espacamento} />
        <Text style={styles.linhaDados}>EMPREGADO(A): {params.pessoaNome}</Text>
        <Text style={styles.linhaDados}>CPF: {params.pessoaDocumento}</Text>
        <Text style={styles.espacamento}>CARGO: {params.cargo ?? "—"}</Text>

        <Text style={styles.paragrafo}>Prezado(a) Senhor(a),</Text>

        <Text style={styles.paragrafo}>
          Em razão de {params.motivo}, mesmo após a aplicação de advertências anteriores devidamente
          registradas e assinadas, a empresa vem, por meio desta, aplicar a penalidade de{" "}
          <Text style={styles.destaque}>SUSPENSÃO DISCIPLINAR</Text>, nos termos do art. 482 da Consolidação das
          Leis do Trabalho (CLT) e das normas internas da empresa.
        </Text>

        <Text style={styles.paragrafo}>
          Ressaltamos que a conduta relatada configura descumprimento das obrigações contratuais,
          comprometendo o regular funcionamento das atividades e a boa convivência no ambiente de trabalho.
        </Text>

        <Text style={styles.paragrafo}>
          Diante do histórico funcional e da necessidade de observância das normas internas, fica aplicada a
          penalidade de:
        </Text>

        <Text style={styles.paragrafo}>
          <Text style={styles.destaque}>SUSPENSÃO DE {diasLabel.toUpperCase()}</Text>, a ser cumprida no período
          de {formatarDataSemHora(params.periodoInicio)} a {formatarDataSemHora(ultimoDiaSuspenso)}, período em
          que não haverá prestação de serviços nem pagamento de salário, conforme legislação vigente.
        </Text>

        <Text style={styles.paragrafo}>
          Fica o(a) colaborador(a) desde já advertido(a) de que a continuidade de condutas dessa natureza
          poderá ensejar a aplicação de penalidades mais severas, inclusive a{" "}
          <Text style={styles.destaque}>rescisão do contrato de trabalho por justa causa</Text>, nos termos da
          legislação trabalhista.
        </Text>

        <Text style={styles.paragrafo}>Solicitamos a assinatura desta como ciência.</Text>

        <Text style={styles.espacamento}>
          ______________________________, {formatarDataSemHoraExtenso(params.periodoInicio)}.
        </Text>

        <View style={styles.assinaturaBloco}>
          <View style={styles.linhaAssinatura}>
            <Text>EMPREGADOR</Text>
          </View>
          <View style={styles.linhaAssinatura}>
            <Text>{params.pessoaNome} — CPF {params.pessoaDocumento}</Text>
          </View>
        </View>

        <Text style={styles.testemunhasTitulo}>Testemunhas:</Text>
        <View style={styles.testemunhasLinha}>
          <View style={styles.testemunhaAssinatura} />
          <View style={styles.testemunhaAssinatura} />
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

const stylesFaltaInjustificada = StyleSheet.create({
  ...styles,
  itemHistorico: { marginBottom: 8, textAlign: "justify" },
  assinaturaTabela: { flexDirection: "row", marginTop: 40, borderTop: "1pt solid #1c1917" },
  assinaturaColuna: { flex: 1, paddingTop: 6 },
  assinaturaColunaDireita: { flex: 1, paddingTop: 6, borderLeft: "1pt solid #1c1917", paddingLeft: 12 },
});

/** Comunicado de suspensão disciplinar por falta injustificada — modelo
 * real cedido pelo Thiago (usado pela DAM), diferente tanto do gerador
 * genérico de carta (documento-ged-pdf.tsx) quanto do modelo de motivo
 * livre acima: é específico pra ausência não justificada (data + período/
 * turno da falta, em vez de motivo digitado livremente) e lista o
 * histórico disciplinar anterior da pessoa (advertências/suspensões já
 * registradas no GED), reforçando o enquadramento como possível conduta
 * desidiosa (art. 482, "e", CLT) quando há reincidência. O histórico vem
 * congelado do momento da geração (montarHistoricoDisciplinar em
 * src/app/ged/actions.ts) — nunca recalculado ao reabrir o PDF depois. */
export async function gerarPdfSuspensaoFaltaInjustificada(params: {
  pessoaNome: string;
  pessoaDocumento: string;
  cargo: string | null;
  dataFalta: Date;
  periodoTurno: string;
  diasSuspensao: number;
  periodoInicio: Date;
  empresaNome: string;
  empresaCnpj: string;
  historico: HistoricoDisciplinarItem[];
}): Promise<Buffer> {
  const s = stylesFaltaInjustificada;
  const ultimoDiaSuspenso = new Date(params.periodoInicio.getTime() + (params.diasSuspensao - 1) * DIA_MS);
  const diasLabel = `${params.diasSuspensao} (${porExtenso(params.diasSuspensao)}) ${params.diasSuspensao === 1 ? "dia" : "dias"}`;
  const rotuloHistorico = (tipo: HistoricoDisciplinarItem["tipo"]) => (tipo === "ADVERTENCIA" ? "Advertência" : "Suspensão");

  return renderToBuffer(
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>COMUNICADO DE SUSPENSÃO DISCIPLINAR</Text>

        <Text style={s.linhaDados}>EMPREGADOR: {params.empresaNome}.</Text>
        <Text style={s.linhaDados}>CNPJ: {params.empresaCnpj}</Text>
        <View style={s.espacamento} />
        <Text style={s.linhaDados}>EMPREGADO(A): {params.pessoaNome}</Text>
        <Text style={s.linhaDados}>CPF: {params.pessoaDocumento}</Text>
        <Text style={s.espacamento}>CARGO: {params.cargo ?? "—"}</Text>

        <Text style={s.paragrafo}>À(Ao) Sr(a). {params.pessoaNome},</Text>

        <Text style={s.paragrafo}>
          Pelo presente comunicado, a empresa {params.empresaNome} formaliza a aplicação de{" "}
          <Text style={s.destaque}>SUSPENSÃO DISCIPLINAR</Text> em razão de nova ocorrência de falta injustificada
          ao trabalho, ocorrida em {formatarDataSemHora(params.dataFalta)}, correspondente à ausência no
          período/turno {params.periodoTurno}.
        </Text>

        <Text style={s.paragrafo}>
          Conforme registros de jornada e documentos funcionais mantidos pela empresa, a ausência acima indicada
          não foi acompanhada, até o momento da aplicação desta penalidade, de documento ou justificativa
          considerada apta a afastar a falta, observados os procedimentos internos e a legislação aplicável.
        </Text>

        {params.historico.length > 0 && (
          <>
            <Text style={s.paragrafo}>
              A presente medida considera, ainda, o histórico disciplinar do(a) colaborador(a), incluindo as
              seguintes penalidades anteriores, relacionadas a ocorrências distintas:
            </Text>
            {params.historico.map((item, i) => (
              <Text key={i} style={s.itemHistorico}>
                {i + 1}. {rotuloHistorico(item.tipo)} aplicada em {formatarDataSemHora(new Date(item.data))},
                referente a {item.motivo}.
              </Text>
            ))}
          </>
        )}

        <Text style={s.paragrafo}>
          A nova ocorrência, {params.historico.length > 0 ? "por ser posterior às medidas disciplinares acima indicadas, e " : ""}
          considerada a sua natureza e gravidade no contexto contratual, caracteriza descumprimento dos deveres de
          assiduidade e das obrigações decorrentes do contrato de trabalho, podendo, quando presentes os
          respectivos requisitos, enquadrar-se como conduta desidiosa, na forma do art. 482, alínea &quot;e&quot;, da
          Consolidação das Leis do Trabalho (CLT).
        </Text>

        <Text style={s.paragrafo}>
          Considerando a natureza da ocorrência, o histórico funcional e a necessidade de observância dos deveres
          contratuais, a empresa entende adequada e proporcional, neste momento, a adoção de medida disciplinar de
          caráter pedagógico, sem prejuízo da análise de futuras ocorrências de forma individualizada.
        </Text>

        <Text style={[s.paragrafo, s.destaque]}>PENALIDADE APLICADA</Text>

        <Text style={s.paragrafo}>
          Fica aplicada a <Text style={s.destaque}>SUSPENSÃO DISCIPLINAR DE {diasLabel.toUpperCase()}</Text>, a
          ser cumprida no período de {formatarDataSemHora(params.periodoInicio)} a{" "}
          {formatarDataSemHora(ultimoDiaSuspenso)}, sem prestação de serviços durante o período de suspensão e com
          os efeitos remuneratórios previstos na legislação aplicável, observado o limite legal.
        </Text>

        <Text style={s.paragrafo}>
          A suspensão ora aplicada refere-se exclusivamente à ocorrência descrita neste comunicado e não constitui
          nova punição pelas ocorrências anteriores já penalizadas, preservando-se a vedação à dupla punição pelo
          mesmo fato.
        </Text>

        <Text style={s.paragrafo}>
          A empresa registra que a aplicação desta penalidade não implica renúncia ao exercício do poder
          disciplinar em relação a fatos futuros. A eventual repetição de faltas injustificadas ou de outras
          infrações contratuais poderá ensejar nova medida disciplinar, observados, em cada caso, a gravidade da
          conduta, a proporcionalidade, a imediatidade, a gradação das penalidades quando cabível e os demais
          requisitos legais.
        </Text>

        <Text style={s.paragrafo}>
          Fica o(a) colaborador(a) ciente de que a reiteração de condutas faltosas poderá, conforme as
          circunstâncias e mediante a devida apuração, resultar em penalidades mais severas, inclusive{" "}
          <Text style={s.destaque}>rescisão do contrato de trabalho por justa causa</Text>, quando presentes os
          requisitos legais previstos na CLT.
        </Text>

        <Text style={s.paragrafo}>
          A assinatura abaixo destina-se exclusivamente a registrar a ciência do(a) empregado(a) quanto ao
          recebimento deste comunicado, não significando, por si só, concordância com os fatos ou com a
          penalidade aplicada.
        </Text>

        <Text style={s.espacamento}>
          ______________________________, {formatarDataSemHoraExtenso(params.periodoInicio)}.
        </Text>

        <View style={s.assinaturaTabela}>
          <View style={s.assinaturaColuna}>
            <Text>EMPREGADOR / REPRESENTANTE LEGAL</Text>
          </View>
          <View style={s.assinaturaColunaDireita}>
            <Text>EMPREGADO(A)</Text>
            <Text>CPF: {params.pessoaDocumento}</Text>
          </View>
        </View>

        <Text style={s.testemunhasTitulo}>Testemunhas (se houver):</Text>
        <View style={s.testemunhasLinha}>
          <View style={s.testemunhaAssinatura}>
            <Text>CPF:</Text>
          </View>
          <View style={s.testemunhaAssinatura}>
            <Text>CPF:</Text>
          </View>
        </View>

        <Text
          style={s.rodape}
          render={({ pageNumber, totalPages }) => `Gerado pelo iFREE · página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
