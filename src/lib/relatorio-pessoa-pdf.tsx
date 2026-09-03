import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import type { StatusTurno } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  tabela: { marginTop: 8 },
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
  colData: { width: "20%" },
  colFuncao: { width: "26%" },
  colHoras: { width: "18%", textAlign: "right" },
  colStatus: { width: "18%" },
  colValor: { width: "18%", textAlign: "right" },
  vazio: { marginTop: 12, color: "#78716c" },
  totalBox: {
    marginTop: 12,
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

const STATUS_LABEL: Record<StatusTurno, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

export type LinhaTurnoPessoa = {
  entradaLabel: string;
  funcaoNome: string;
  minutosArredondados: number | null;
  status: StatusTurno;
  valorTotal: number | null;
};

function formatarHoras(minutos: number | null): string {
  if (minutos === null) return "—";
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
}

/** Relatório individual, turno a turno, de uma pessoa no período — o
 * detalhe completo que fica de fora do relatório por função e do geral
 * (que são resumidos). */
export async function gerarPdfRelatorioPessoa(params: {
  empresaNome: string;
  pessoaNome: string;
  periodoLabel: string;
  itens: LinhaTurnoPessoa[];
}): Promise<Buffer> {
  const valorTotal = params.itens.reduce((soma, i) => soma + (i.valorTotal ?? 0), 0);
  const minutosTotal = params.itens.reduce((soma, i) => soma + (i.minutosArredondados ?? 0), 0);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>{params.pessoaNome} — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colData}>Entrada</Text>
            <Text style={styles.colFuncao}>Função</Text>
            <Text style={styles.colHoras}>Horas</Text>
            <Text style={styles.colStatus}>Status</Text>
            <Text style={styles.colValor}>Valor</Text>
          </View>
          {params.itens.map((item, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.colData}>{item.entradaLabel}</Text>
              <Text style={styles.colFuncao}>{item.funcaoNome}</Text>
              <Text style={styles.colHoras}>{formatarHoras(item.minutosArredondados)}</Text>
              <Text style={styles.colStatus}>{STATUS_LABEL[item.status]}</Text>
              <Text style={styles.colValor}>
                {item.valorTotal !== null ? `R$ ${item.valorTotal.toFixed(2)}` : "—"}
              </Text>
            </View>
          ))}
        </View>

        {params.itens.length === 0 && (
          <Text style={styles.vazio}>Nenhum turno nesse período.</Text>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total do período</Text>
          <Text style={styles.totalValor}>
            {formatarHoras(minutosTotal)} · R$ {valorTotal.toFixed(2)}
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
