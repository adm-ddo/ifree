import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";
import { LABEL_CATEGORIA_DENUNCIA, LABEL_STATUS_DENUNCIA } from "@/lib/etica";
import type { CategoriaDenuncia, GravidadeDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 12, borderBottom: "1pt solid #e7e5e4", paddingBottom: 10 },
  titulo: { fontSize: 15, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  aviso: { fontSize: 7.5, color: "#92400e", marginTop: 6 },
  secao: { marginTop: 12 },
  secaoTitulo: { fontSize: 11, fontWeight: 700, marginBottom: 4, color: "#0d1b2a" },
  dadosLinha: { marginBottom: 2 },
  dadosLabel: { color: "#78716c" },
  descricaoBox: { padding: 8, backgroundColor: "#f5f5f4", borderRadius: 4 },
  linha: { paddingVertical: 4, borderBottom: "0.5pt solid #e7e5e4" },
  linhaMeta: { fontSize: 7.5, color: "#a8a29e", marginTop: 1 },
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

export type EtapaPdf = { status: StatusDenuncia; observacao: string | null; autorEmail: string | null; criadoEm: Date };
export type MensagemPdf = { autor: "EMPRESA" | "DENUNCIANTE"; texto: string; criadoEm: Date };
export type LogPdf = { acao: string; detalhe: string | null; autorEmail: string | null; criadoEm: Date };

const stylesLista = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },
  header: { marginBottom: 12, borderBottom: "1pt solid #e7e5e4", paddingBottom: 10 },
  titulo: { fontSize: 15, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#78716c", marginTop: 2 },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  linha: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottom: "0.5pt solid #e7e5e4" },
  colProtocolo: { width: "16%" },
  colCategoria: { width: "26%" },
  colStatus: { width: "22%" },
  colGravidade: { width: "12%" },
  colData: { width: "14%" },
  colSla: { width: "10%", textAlign: "right" },
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

export type LinhaListaDenuncia = {
  protocolo: string;
  categoria: CategoriaDenuncia;
  status: StatusDenuncia;
  gravidade: GravidadeDenuncia | null;
  criadoEm: Date;
  slaVencido: boolean;
};

/** Export da lista filtrada da Central de Ética — mesmo espírito de
 * /relatorios/pdf: resumo tabular do que está sendo visto na tela. */
export async function gerarPdfListaDenuncias(params: {
  empresaNome: string;
  itens: LinhaListaDenuncia[];
}): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={stylesLista.page}>
        <View style={stylesLista.header}>
          <Text style={stylesLista.titulo}>Central de Ética — Relatório de denúncias</Text>
          <Text style={stylesLista.subtitulo}>{params.empresaNome}</Text>
        </View>

        <View style={stylesLista.linhaCabecalho}>
          <Text style={stylesLista.colProtocolo}>Protocolo</Text>
          <Text style={stylesLista.colCategoria}>Categoria</Text>
          <Text style={stylesLista.colStatus}>Etapa</Text>
          <Text style={stylesLista.colGravidade}>Gravidade</Text>
          <Text style={stylesLista.colData}>Recebida em</Text>
          <Text style={stylesLista.colSla}>SLA</Text>
        </View>
        {params.itens.map((item, i) => (
          <View key={i} style={stylesLista.linha}>
            <Text style={stylesLista.colProtocolo}>{item.protocolo.slice(0, 4)}-{item.protocolo.slice(4)}</Text>
            <Text style={stylesLista.colCategoria}>{LABEL_CATEGORIA_DENUNCIA[item.categoria]}</Text>
            <Text style={stylesLista.colStatus}>{LABEL_STATUS_DENUNCIA[item.status]}</Text>
            <Text style={stylesLista.colGravidade}>{item.gravidade ?? "—"}</Text>
            <Text style={stylesLista.colData}>{formatarDataHora(item.criadoEm)}</Text>
            <Text style={stylesLista.colSla}>{item.slaVencido ? "Vencido" : "OK"}</Text>
          </View>
        ))}
        {params.itens.length === 0 && <Text style={{ marginTop: 12, color: "#78716c" }}>Nenhuma denúncia encontrada.</Text>}

        <Text
          style={stylesLista.rodape}
          render={({ pageNumber, totalPages }) =>
            `Gerado em ${formatarDataHora(new Date())} · página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

/** PDF de comprovação de conformidade de UM caso — protocolo, dados,
 * descrição, linha do tempo completa, mensagens trocadas e log de
 * auditoria. Pensado pra ficar salvo/impresso como prova de tratativa em
 * eventual fiscalização ou auditoria (mesmo espírito de
 * espelho-ponto-pdf.tsx/advertencia-pdf.tsx: documento pra guardar). */
export async function gerarPdfDenuncia(params: {
  empresaNome: string;
  protocolo: string;
  categoria: CategoriaDenuncia;
  gravidade: GravidadeDenuncia | null;
  status: StatusDenuncia;
  identificado: boolean;
  pessoaNome: string | null;
  descricao: string;
  criadoEm: Date;
  prazoSlaEm: Date;
  finalizadoEm: Date | null;
  etapas: EtapaPdf[];
  mensagens: MensagemPdf[];
  logs: LogPdf[];
}): Promise<Buffer> {
  const protocoloFormatado = `${params.protocolo.slice(0, 4)}-${params.protocolo.slice(4)}`;

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Central de Ética — Denúncia {protocoloFormatado}</Text>
          <Text style={styles.subtitulo}>{params.empresaNome}</Text>
          <Text style={styles.aviso}>
            Documento de comprovação de conformidade — controle interno de tratativa de denúncia (NR-1).
          </Text>
        </View>

        <View>
          <Text style={styles.dadosLinha}>
            <Text style={styles.dadosLabel}>Categoria: </Text>
            {LABEL_CATEGORIA_DENUNCIA[params.categoria]}
          </Text>
          <Text style={styles.dadosLinha}>
            <Text style={styles.dadosLabel}>Gravidade: </Text>
            {params.gravidade ?? "Não classificada"}
          </Text>
          <Text style={styles.dadosLinha}>
            <Text style={styles.dadosLabel}>Etapa atual: </Text>
            {LABEL_STATUS_DENUNCIA[params.status]}
          </Text>
          <Text style={styles.dadosLinha}>
            <Text style={styles.dadosLabel}>Denunciante: </Text>
            {params.identificado ? params.pessoaNome ?? "—" : "Anônimo"}
          </Text>
          <Text style={styles.dadosLinha}>
            <Text style={styles.dadosLabel}>Recebida em: </Text>
            {formatarDataHora(params.criadoEm)}
          </Text>
          <Text style={styles.dadosLinha}>
            <Text style={styles.dadosLabel}>Prazo SLA: </Text>
            {formatarDataHora(params.prazoSlaEm)}
          </Text>
          {params.finalizadoEm && (
            <Text style={styles.dadosLinha}>
              <Text style={styles.dadosLabel}>Finalizada em: </Text>
              {formatarDataHora(params.finalizadoEm)}
            </Text>
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Descrição</Text>
          <View style={styles.descricaoBox}>
            <Text>{params.descricao}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Linha do tempo</Text>
          {params.etapas.map((e, i) => (
            <View key={i} style={styles.linha}>
              <Text>{LABEL_STATUS_DENUNCIA[e.status]}</Text>
              <Text style={styles.linhaMeta}>
                {formatarDataHora(e.criadoEm)} · {e.autorEmail ?? "Automático"}
                {e.observacao ? ` — ${e.observacao}` : ""}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Mensagens trocadas</Text>
          {params.mensagens.length === 0 ? (
            <Text style={styles.linhaMeta}>Nenhuma mensagem trocada.</Text>
          ) : (
            params.mensagens.map((m, i) => (
              <View key={i} style={styles.linha}>
                <Text>
                  <Text style={styles.dadosLabel}>
                    {m.autor === "EMPRESA" ? "Empresa" : "Denunciante"}:{" "}
                  </Text>
                  {m.texto}
                </Text>
                <Text style={styles.linhaMeta}>{formatarDataHora(m.criadoEm)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Log de auditoria</Text>
          {params.logs.map((l, i) => (
            <View key={i} style={styles.linha}>
              <Text>
                {l.acao}
                {l.detalhe ? ` — ${l.detalhe}` : ""}
              </Text>
              <Text style={styles.linhaMeta}>
                {formatarDataHora(l.criadoEm)}
                {l.autorEmail ? ` · ${l.autorEmail}` : ""}
              </Text>
            </View>
          ))}
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
