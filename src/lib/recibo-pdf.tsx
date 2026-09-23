import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora, formatarDataHoraComDiaSemana } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import type { TipoDocumentoPessoa, TipoChavePix, ModoPagamento } from "@/generated/prisma/enums";

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
  valorTotalBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  valorTotalLabel: { fontSize: 11, color: "#166534" },
  valorTotalValor: { fontSize: 14, fontWeight: 700, color: "#166534" },
  paragrafo: { marginBottom: 8, lineHeight: 1.5 },
  assinaturaBox: { marginTop: 24, alignItems: "center" },
  assinaturaImg: { width: 220, height: 80, objectFit: "contain" },
  assinaturaLinha: { borderTop: "0.5pt solid #78716c", width: 220, marginTop: 4 },
  assinaturaLabel: { fontSize: 8, color: "#78716c", marginTop: 4, textAlign: "center" },
  semAssinaturaBox: {
    marginTop: 24,
    padding: 10,
    backgroundColor: "#fffbeb",
    border: "0.5pt solid #fde68a",
    borderRadius: 6,
  },
  semAssinaturaTexto: { fontSize: 8, color: "#92400e", lineHeight: 1.5, textAlign: "center" },
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

export type DadosRecibo = {
  empresaNome: string;
  empresaCnpj: string;
  pessoaNome: string;
  pessoaDocumento: string;
  pessoaTipoDocumento: TipoDocumentoPessoa;
  funcaoNome: string;
  valorHoraAplicado: number;
  modoPagamentoAplicado: ModoPagamento;
  valorDiariaAplicada: number | null;
  horaEntrada: Date;
  horaSaida: Date;
  minutosDescontadosPausa: number;
  minutosArredondados: number;
  valorTotal: number;
  chavePixDestino: string;
  tipoChavePixDestino: TipoChavePix;
  /// Null quando o turno foi encerrado sem a pessoa passar pelo totem de
  /// novo pra confirmar (fechamento automático, ou saída corrigida na mão
  /// depois) — nesse caso o recibo sai sem a imagem de assinatura, com um
  /// aviso no lugar (ver fechamentoAutomatico/correcaoSaidaEm abaixo).
  assinaturaReciboDataUrl: string | null;
  fechamentoAutomatico: boolean;
  correcaoSaidaEm: Date | null;
};

function ReciboPagina(props: DadosRecibo) {
  const horas = Math.floor(props.minutosArredondados / 60);
  const minutos = props.minutosArredondados % 60;

  return (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Recibo de Pagamento — Serviço Eventual</Text>
          <Text style={styles.subtitulo}>
            {props.empresaNome} · {props.empresaCnpj}
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Prestador(a) do serviço</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.valor}>{props.pessoaNome}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>{LABEL_TIPO_DOCUMENTO[props.pessoaTipoDocumento]}</Text>
            <Text style={styles.valor}>
              {formatarDocumento(props.pessoaTipoDocumento, props.pessoaDocumento)}
            </Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Função</Text>
            <Text style={styles.valor}>{props.funcaoNome}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Período trabalhado</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Entrada</Text>
            <Text style={styles.valor}>{formatarDataHoraComDiaSemana(props.horaEntrada)}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Saída</Text>
            <Text style={styles.valor}>
              {formatarDataHoraComDiaSemana(props.horaSaida, props.horaEntrada)}
            </Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Tempo (arredondado p/ 5min)</Text>
            <Text style={styles.valor}>
              {horas}h{String(minutos).padStart(2, "0")}min
            </Text>
          </View>
          {props.minutosDescontadosPausa > 0 && (
            <View style={styles.linha}>
              <Text style={styles.label}>Intervalo descontado</Text>
              <Text style={styles.valor}>{props.minutosDescontadosPausa}min</Text>
            </View>
          )}
          {props.modoPagamentoAplicado === "DIARIA" && props.valorDiariaAplicada !== null ? (
            <View style={styles.linha}>
              <Text style={styles.label}>Diária combinada</Text>
              <Text style={styles.valor}>R$ {props.valorDiariaAplicada.toFixed(2)}</Text>
            </View>
          ) : (
            <View style={styles.linha}>
              <Text style={styles.label}>Valor/hora</Text>
              <Text style={styles.valor}>R$ {props.valorHoraAplicado.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.valorTotalBox}>
            <Text style={styles.valorTotalLabel}>Valor total</Text>
            <Text style={styles.valorTotalValor}>R$ {props.valorTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Pagamento</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Forma</Text>
            <Text style={styles.valor}>PIX</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>
              Chave PIX ({LABEL_TIPO_CHAVE_PIX[props.tipoChavePixDestino]})
            </Text>
            <Text style={styles.valor}>{props.chavePixDestino}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Prazo</Text>
            <Text style={styles.valor}>Até 24h após a emissão deste recibo</Text>
          </View>
        </View>

        <Text style={styles.paragrafo}>
          Este recibo confirma o encerramento do serviço iniciado em{" "}
          {formatarDataHoraComDiaSemana(props.horaEntrada)}, cujos termos foram lidos e
          aceitos digitalmente pelo(a) Contratado(a) no início do turno, por
          meio do contrato de prestação de serviço eventual firmado naquele
          momento.
        </Text>

        <Text style={{ ...styles.paragrafo, fontSize: 8, color: "#78716c" }}>
          Quando processado automaticamente pela plataforma, o repasse via
          PIX é executado pela Asaas Gestão Financeira S.A., instituição
          de pagamento autorizada a funcionar pelo Banco Central do
          Brasil, a partir da conta digital de titularidade da empresa
          contratante — o iFREE é a plataforma de tecnologia que
          intermedeia o serviço, não a instituição que processa o
          pagamento. Pagamentos feitos manualmente pela empresa seguem o
          meio por ela escolhido.
        </Text>

        <Text style={{ ...styles.paragrafo, fontSize: 8, color: "#a8a29e" }}>
          Este é um texto padrão gerado automaticamente e não substitui
          revisão jurídica antes do uso em produção.
        </Text>

        {props.assinaturaReciboDataUrl ? (
          <View style={styles.assinaturaBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image aqui é do @react-pdf/renderer, não HTML; não tem prop alt */}
            <Image src={props.assinaturaReciboDataUrl} style={styles.assinaturaImg} />
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaLabel}>
              {props.pessoaNome} · confirmo o recebimento do valor acima,
              assinado digitalmente no totem em{" "}
              {formatarDataHoraComDiaSemana(props.horaSaida, props.horaEntrada)}
            </Text>
          </View>
        ) : (
          <View style={styles.semAssinaturaBox}>
            <Text style={styles.semAssinaturaTexto}>
              ⚠️ Sem assinatura de confirmação de recebimento — {props.pessoaNome}{" "}
              não bateu a saída no totem;{" "}
              {props.fechamentoAutomatico
                ? "o sistema encerrou este turno automaticamente"
                : "a saída deste turno foi definida manualmente pela empresa"}
              {props.correcaoSaidaEm &&
                ` (horário corrigido pela empresa em ${formatarDataHora(props.correcaoSaidaEm)})`}
              . A confirmação de recebimento do valor deve ser obtida por
              outro meio.
            </Text>
          </View>
        )}

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

export function ReciboDocument(props: DadosRecibo) {
  return (
    <Document>
      <ReciboPagina {...props} />
    </Document>
  );
}

export function RecibosDocument({ itens }: { itens: DadosRecibo[] }) {
  return (
    <Document>
      {itens.map((item, i) => (
        <ReciboPagina key={i} {...item} />
      ))}
    </Document>
  );
}

export async function gerarPdfRecibo(props: DadosRecibo): Promise<Buffer> {
  return renderToBuffer(<ReciboDocument {...props} />);
}

/** Junta os recibos de vários turnos num único PDF (um por página) — usado
 * na impressão em lote da página do freelancer. */
export async function gerarPdfRecibos(itens: DadosRecibo[]): Promise<Buffer> {
  return renderToBuffer(<RecibosDocument itens={itens} />);
}
