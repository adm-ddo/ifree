import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import type { LinhaPorFuncao, LinhaPorPessoaFuncao } from "@/lib/relatorio";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  secaoFuncao: { marginTop: 14 },
  cabecalhoFuncao: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  nomeFuncao: { fontSize: 11, fontWeight: 700 },
  resumoFuncao: { fontSize: 9, color: "#57534e" },
  linhaCabecalho: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontWeight: 700,
    color: "#78716c",
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottom: "0.5pt solid #e7e5e4",
  },
  colNome: { width: "34%" },
  colFrequencia: { width: "20%" },
  colTurnos: { width: "16%", textAlign: "right" },
  colHoras: { width: "15%", textAlign: "right" },
  colValor: { width: "15%", textAlign: "right" },
  badgeDiaria: {
    fontSize: 7,
    color: "#b45309",
    backgroundColor: "#fffbeb",
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    alignSelf: "flex-start",
  },
  badgeSemanal: {
    fontSize: 7,
    color: "#4338ca",
    backgroundColor: "#eef2ff",
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    alignSelf: "flex-start",
  },
  vazio: { marginTop: 12, color: "#78716c" },
  totalBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 11, color: "#166534" },
  totalValor: { fontSize: 14, fontWeight: 700, color: "#166534" },
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

function formatarHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
}

/** Relatório de custo por função — cabeçalho por função (total de horas e
 * valor) seguido das pessoas que trabalharam nela no período, cada uma
 * com um selo indicando se recebe diária (a cada turno) ou semanal
 * (acumulado). Primeira vez nesse projeto que um PDF tem seção
 * agrupada com subtotal — os demais relatórios são tabela plana. */
export async function gerarPdfRelatorioFuncao(params: {
  empresaNome: string;
  periodoLabel: string;
  totalValor: number;
  porFuncao: LinhaPorFuncao[];
  porPessoaFuncao: LinhaPorPessoaFuncao[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Custo por função — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
        </View>

        {params.porFuncao.length === 0 && (
          <Text style={styles.vazio}>Nenhum turno pago nesse período.</Text>
        )}

        {params.porFuncao.map((funcao) => {
          const pessoas = params.porPessoaFuncao.filter((p) => p.funcaoId === funcao.funcaoId);
          return (
            <View key={funcao.funcaoId} style={styles.secaoFuncao} wrap={false}>
              <View style={styles.cabecalhoFuncao}>
                <Text style={styles.nomeFuncao}>{funcao.nome}</Text>
                <Text style={styles.resumoFuncao}>
                  {funcao.turnos} turno(s) · {formatarHoras(funcao.minutos)} · R${" "}
                  {funcao.valor.toFixed(2)}
                </Text>
              </View>
              <View style={styles.linhaCabecalho}>
                <Text style={styles.colNome}>Pessoa</Text>
                <Text style={styles.colFrequencia}>Frequência</Text>
                <Text style={styles.colTurnos}>Turnos</Text>
                <Text style={styles.colHoras}>Horas</Text>
                <Text style={styles.colValor}>Valor</Text>
              </View>
              {pessoas.map((p) => (
                <View key={p.pessoaId} style={styles.linha}>
                  <Text style={styles.colNome}>{p.pessoaNome}</Text>
                  <View style={styles.colFrequencia}>
                    <Text style={p.frequencia === "SEMANAL" ? styles.badgeSemanal : styles.badgeDiaria}>
                      {p.frequencia === "SEMANAL" ? "Semanal" : "Diária"}
                    </Text>
                  </View>
                  <Text style={styles.colTurnos}>{p.turnos}</Text>
                  <Text style={styles.colHoras}>{formatarHoras(p.minutos)}</Text>
                  <Text style={styles.colValor}>R$ {p.valor.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Custo total do período</Text>
          <Text style={styles.totalValor}>R$ {params.totalValor.toFixed(2)}</Text>
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
