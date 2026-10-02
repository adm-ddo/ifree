import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora, formatarHora } from "@/lib/data";
import type { DiaTurnos } from "@/lib/relatorio";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 16, borderBottom: "1pt solid #e7e5e4", paddingBottom: 12 },
  titulo: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  secaoDia: { marginTop: 14 },
  cabecalhoDia: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  nomeDia: { fontSize: 11, fontWeight: 700 },
  resumoDia: { fontSize: 9, color: "#57534e" },
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
  colPessoa: { width: "28%" },
  colFuncao: { width: "22%" },
  colHorario: { width: "22%" },
  colStatus: { width: "16%" },
  colValor: { width: "12%", textAlign: "right" },
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

function formatarCabecalhoDia(dataISO: string): string {
  const data = new Date(`${dataISO}T12:00:00-03:00`);
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Relatório analítico diário — uma seção por dia-calendário (sem quebra
 * de página forçada entre dias, igual gerarPdfRelatorioFuncao, que separa
 * por função em vez de por dia), cada uma com os turnos daquele dia numa
 * tabela plana — NUNCA soma por pessoa nem por função (diferente de
 * gerarPdfRelatorioFuncao: aqui o agrupamento é só visual, pra separar um
 * dia do outro, não um bucket que soma linhas). */
export async function gerarPdfRelatorioDiario(params: {
  empresaNome: string;
  periodoLabel: string;
  totalValor: number;
  dias: DiaTurnos[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Relatório analítico diário — {params.periodoLabel}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
        </View>

        {params.dias.length === 0 && <Text style={styles.vazio}>Nenhum turno encontrado nesse período.</Text>}

        {params.dias.map((dia) => (
          <View key={dia.dataISO} style={styles.secaoDia} wrap={false}>
            <View style={styles.cabecalhoDia}>
              <Text style={styles.nomeDia}>{formatarCabecalhoDia(dia.dataISO)}</Text>
              <Text style={styles.resumoDia}>
                {dia.turnos.length} turno(s) · {formatarHoras(dia.totalMinutos)} · R$ {dia.totalValor.toFixed(2)}
              </Text>
            </View>
            <View style={styles.linhaCabecalho}>
              <Text style={styles.colPessoa}>Pessoa</Text>
              <Text style={styles.colFuncao}>Função</Text>
              <Text style={styles.colHorario}>Entrada – Saída</Text>
              <Text style={styles.colStatus}>Status</Text>
              <Text style={styles.colValor}>Valor</Text>
            </View>
            {dia.turnos.map((t) => (
              <View key={t.turnoId} style={styles.linha}>
                <Text style={styles.colPessoa}>{t.pessoaNome}</Text>
                <Text style={styles.colFuncao}>{t.funcaoNome}</Text>
                <Text style={styles.colHorario}>
                  {formatarHora(t.horaEntrada)}
                  {t.horaSaida ? ` – ${formatarHora(t.horaSaida)}` : ""}
                </Text>
                <Text style={styles.colStatus}>{STATUS_LABEL[t.status] ?? t.status}</Text>
                <Text style={styles.colValor}>R$ {t.valor.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total do período</Text>
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
