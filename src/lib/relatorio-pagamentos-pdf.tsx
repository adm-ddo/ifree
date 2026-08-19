import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarHora, formatarDataHora } from "@/lib/data";
import { LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import type { TipoChavePix, StatusTurno, ModoPagamento } from "@/generated/prisma/enums";

const LABEL_STATUS: Record<StatusTurno, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "A pagar",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const LABEL_MODO_PAGAMENTO: Record<ModoPagamento, string> = {
  HORA: "Hora",
  DIARIA: "Diária",
};

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
  colNome: { width: "17%" },
  colFuncao: { width: "12%" },
  colModo: { width: "9%" },
  colHorario: { width: "14%" },
  colPix: { width: "26%" },
  colValor: { width: "12%", textAlign: "right" },
  colStatus: { width: "10%", textAlign: "right" },
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

export type LinhaRelatorioPagamento = {
  pessoaNome: string;
  funcaoNome: string;
  modoPagamento: ModoPagamento;
  horaEntrada: Date;
  horaSaida: Date;
  valorTotal: number;
  chavePix: string;
  tipoChavePix: TipoChavePix;
  status: StatusTurno;
};

/** Relatório tabular pro financeiro lançar os PIX manualmente enquanto não
 * há integração automática (Stone) — diferente do recibo/contrato
 * individual (uma página por turno, com assinatura), esse é um resumo
 * compacto de um dia inteiro com a chave PIX de cada um em destaque. */
export async function gerarPdfRelatorioPagamentos(params: {
  empresaNome: string;
  dataLabel: string;
  itens: LinhaRelatorioPagamento[];
}): Promise<Buffer> {
  const valorTotalGeral = params.itens.reduce((soma, i) => soma + i.valorTotal, 0);

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório de pagamentos — {params.dataLabel}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={styles.colNome}>Nome</Text>
            <Text style={styles.colFuncao}>Função</Text>
            <Text style={styles.colModo}>Modo</Text>
            <Text style={styles.colHorario}>Horário</Text>
            <Text style={styles.colPix}>Chave PIX</Text>
            <Text style={styles.colValor}>Valor</Text>
            <Text style={styles.colStatus}>Status</Text>
          </View>
          {params.itens.map((item, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.colNome}>{item.pessoaNome}</Text>
              <Text style={styles.colFuncao}>{item.funcaoNome}</Text>
              <Text style={styles.colModo}>{LABEL_MODO_PAGAMENTO[item.modoPagamento]}</Text>
              <Text style={styles.colHorario}>
                {formatarHora(item.horaEntrada)}–{formatarHora(item.horaSaida)}
              </Text>
              <Text style={styles.colPix}>
                {item.chavePix} ({LABEL_TIPO_CHAVE_PIX[item.tipoChavePix]})
              </Text>
              <Text style={styles.colValor}>R$ {item.valorTotal.toFixed(2)}</Text>
              <Text style={styles.colStatus}>{LABEL_STATUS[item.status]}</Text>
            </View>
          ))}
        </View>

        {params.itens.length === 0 && (
          <Text style={styles.vazio}>Nenhum turno encerrado nesse dia.</Text>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total do dia</Text>
          <Text style={styles.totalValor}>R$ {valorTotalGeral.toFixed(2)}</Text>
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
