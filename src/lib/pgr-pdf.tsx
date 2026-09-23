import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import { LABEL_DIMENSAO_PGR, LABEL_NIVEL_RISCO_PGR, type DimensaoPgr, type NivelRiscoPgr } from "@/lib/pgr-questionario";
import type { StatusAcaoPgr } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  aviso: { fontSize: 8, color: "#92400e", marginTop: 6 },
  secao: { marginTop: 16 },
  secaoTitulo: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  paragrafo: { fontSize: 9, color: "#44403c", marginBottom: 4, lineHeight: 1.4 },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  linha: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #e7e5e4",
  },
  colDimensao: { width: "60%" },
  colNivel: { width: "20%", textAlign: "right" },
  colRespostas: { width: "20%", textAlign: "right" },
  colAcaoDimensao: { width: "18%" },
  colAcaoRisco: { width: "32%" },
  colAcaoMedida: { width: "32%" },
  colAcaoStatus: { width: "18%", textAlign: "right" },
  vazio: { marginTop: 8, color: "#78716c" },
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

const LABEL_STATUS_ACAO: Record<StatusAcaoPgr, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

export type LinhaMatrizPdf = { dimensao: DimensaoPgr; media: number; nivel: NivelRiscoPgr };

export type AcaoPdf = {
  dimensao: string;
  descricaoRisco: string;
  medida: string;
  status: StatusAcaoPgr;
};

/** Documento do PGR (riscos psicossociais, NR-1) — identificação da
 * empresa, metodologia (com o aviso de revisão profissional), matriz de
 * risco do ciclo mais recente encerrado e plano de ação. Mesmo formato
 * visual de gerarPdfRelatorioHorasClt. */
export async function gerarPdfPgr(params: {
  empresaNome: string;
  cicloEncerradoEmLabel: string;
  totalRespostas: number;
  matrizGeral: LinhaMatrizPdf[];
  matrizPorCargo: { cargo: string; totalRespostas: number; linhas: LinhaMatrizPdf[] }[];
  acoes: AcaoPdf[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>PGR — Gerenciamento de Riscos Psicossociais</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
          <Text style={styles.aviso}>
            Documento gerado a partir de pesquisa anônima aplicada pela
            empresa via iFREE. O questionário padrão é inspirado nas
            dimensões usadas por instrumentos validados de avaliação de
            risco psicossocial (Karasek, HSE-IT, COPSOQ) — recomenda-se a
            revisão de um profissional de segurança do trabalho antes de
            assinar este documento como PGR oficial da empresa (NR-1,
            Portaria MTE 1.419/2024).
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>1. Metodologia</Text>
          <Text style={styles.paragrafo}>
            Pesquisa anônima aplicada aos funcionários CLT, com perguntas
            de frequência (escala de 1 a 5) organizadas em 7 dimensões de
            risco psicossocial. As respostas não identificam quem
            respondeu; o recorte por cargo só é exibido quando há 5
            respostas ou mais daquele cargo, pra não arriscar identificar
            ninguém.
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>
            2. Matriz de risco — ciclo encerrado em {params.cicloEncerradoEmLabel} ({params.totalRespostas} resposta(s))
          </Text>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colDimensao}>Dimensão</Text>
            <Text style={styles.colRespostas}>Respostas</Text>
            <Text style={styles.colNivel}>Nível de risco</Text>
          </View>
          {params.matrizGeral.map((linha) => (
            <View key={linha.dimensao} style={styles.linha}>
              <Text style={styles.colDimensao}>{LABEL_DIMENSAO_PGR[linha.dimensao]}</Text>
              <Text style={styles.colRespostas}>{params.totalRespostas}</Text>
              <Text style={styles.colNivel}>{LABEL_NIVEL_RISCO_PGR[linha.nivel]}</Text>
            </View>
          ))}
        </View>

        {params.matrizPorCargo.map((bloco) => (
          <View key={bloco.cargo} style={styles.secao} wrap={false}>
            <Text style={styles.secaoTitulo}>
              Por cargo — {bloco.cargo} ({bloco.totalRespostas} resposta(s))
            </Text>
            <View style={styles.linhaCabecalho}>
              <Text style={styles.colDimensao}>Dimensão</Text>
              <Text style={styles.colNivel}>Nível de risco</Text>
            </View>
            {bloco.linhas.map((linha) => (
              <View key={linha.dimensao} style={styles.linha}>
                <Text style={styles.colDimensao}>{LABEL_DIMENSAO_PGR[linha.dimensao]}</Text>
                <Text style={styles.colNivel}>{LABEL_NIVEL_RISCO_PGR[linha.nivel]}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>3. Plano de ação</Text>
          {params.acoes.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma ação cadastrada ainda.</Text>
          ) : (
            <>
              <View style={styles.linhaCabecalho}>
                <Text style={styles.colAcaoDimensao}>Dimensão</Text>
                <Text style={styles.colAcaoRisco}>Risco identificado</Text>
                <Text style={styles.colAcaoMedida}>Medida</Text>
                <Text style={styles.colAcaoStatus}>Status</Text>
              </View>
              {params.acoes.map((acao, i) => (
                <View key={i} style={styles.linha}>
                  <Text style={styles.colAcaoDimensao}>
                    {LABEL_DIMENSAO_PGR[acao.dimensao as DimensaoPgr] ?? acao.dimensao}
                  </Text>
                  <Text style={styles.colAcaoRisco}>{acao.descricaoRisco}</Text>
                  <Text style={styles.colAcaoMedida}>{acao.medida}</Text>
                  <Text style={styles.colAcaoStatus}>{LABEL_STATUS_ACAO[acao.status]}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>4. Próxima revisão</Text>
          <Text style={styles.paragrafo}>
            A NR-1 exige reavaliação completa no mínimo uma vez por ano, ou
            sempre que houver mudança organizacional significativa.
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
    </Document>
  );
}
