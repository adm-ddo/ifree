import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarDataHora } from "@/lib/data";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#292524" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    borderBottom: "1pt solid #e7e5e4",
    paddingBottom: 14,
  },
  foto: { width: 64, height: 64, borderRadius: 32, objectFit: "cover" },
  nome: { fontSize: 18, fontWeight: 700 },
  contato: { fontSize: 9, color: "#78716c", marginTop: 2 },
  secao: { marginBottom: 14 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottom: "0.5pt solid #d6d3d1",
  },
  paragrafo: { lineHeight: 1.5 },
  chipsLinha: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    border: "0.5pt solid #00C896",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 9,
    color: "#00875F",
  },
  reputacaoLinha: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 4 },
  reputacaoNota: { fontSize: 20, fontWeight: 700 },
  reputacaoTexto: { fontSize: 9, color: "#78716c" },
  experienciaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "0.5pt solid #f0efee",
  },
  experienciaEmpresa: { fontWeight: 700 },
  experienciaDetalhe: { fontSize: 9, color: "#78716c" },
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

export type ExperienciaCurriculo = {
  empresaNome: string;
  funcaoNome: string | null;
  quantidade: number;
  primeiraData: Date;
  ultimaData: Date;
};

export type DadosCurriculo = {
  nome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  meiosTransporte: string[];
  fotoDataUrl: string | null;
  biografia: string | null;
  habilidades: string[];
  vagasDesejadas: string[];
  reputacaoMedia: number | null;
  reputacaoTotal: number;
  reputacaoTagsFrequentes: string[];
  experiencias: ExperienciaCurriculo[];
};

function formatarPeriodo(primeira: Date, ultima: Date): string {
  const f = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d);
  const de = f(primeira);
  const ate = f(ultima);
  return de === ate ? de : `${de} – ${ate}`;
}

function CurriculoPagina(props: DadosCurriculo) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        {props.fotoDataUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, não tem prop alt
          <Image src={props.fotoDataUrl} style={styles.foto} />
        )}
        <View>
          <Text style={styles.nome}>{props.nome}</Text>
          <Text style={styles.contato}>
            {props.telefone}
            {props.email ? ` · ${props.email}` : ""}
          </Text>
          {props.endereco && <Text style={styles.contato}>{props.endereco}</Text>}
          {props.meiosTransporte.length > 0 && (
            <Text style={styles.contato}>Transporte: {props.meiosTransporte.join(", ")}</Text>
          )}
        </View>
      </View>

      {props.biografia && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Sobre</Text>
          <Text style={styles.paragrafo}>{props.biografia}</Text>
        </View>
      )}

      {props.habilidades.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Habilidades</Text>
          <View style={styles.chipsLinha}>
            {props.habilidades.map((h) => (
              <View key={h} style={styles.chip}>
                <Text>{h}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {props.vagasDesejadas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Vagas desejadas</Text>
          <View style={styles.chipsLinha}>
            {props.vagasDesejadas.map((v) => (
              <View key={v} style={styles.chip}>
                <Text>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {props.reputacaoTotal > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Reputação no iFREE</Text>
          <View style={styles.reputacaoLinha}>
            <Text style={styles.reputacaoNota}>{props.reputacaoMedia?.toFixed(1)}</Text>
            <Text style={styles.reputacaoTexto}>
              de 5 · {props.reputacaoTotal} avaliaç{props.reputacaoTotal === 1 ? "ão" : "ões"} de empresas
            </Text>
          </View>
          {props.reputacaoTagsFrequentes.length > 0 && (
            <View style={styles.chipsLinha}>
              {props.reputacaoTagsFrequentes.map((t) => (
                <View key={t} style={styles.chip}>
                  <Text>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {props.experiencias.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Experiência</Text>
          {props.experiencias.map((e, i) => (
            <View key={i} style={styles.experienciaItem}>
              <View>
                <Text style={styles.experienciaEmpresa}>{e.empresaNome}</Text>
                {e.funcaoNome && <Text style={styles.experienciaDetalhe}>{e.funcaoNome}</Text>}
              </View>
              <View>
                <Text style={styles.experienciaDetalhe}>{formatarPeriodo(e.primeiraData, e.ultimaData)}</Text>
                <Text style={styles.experienciaDetalhe}>
                  {e.quantidade} turno{e.quantidade === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text
        style={styles.rodape}
        render={({ pageNumber, totalPages }) =>
          `Currículo gerado automaticamente pelo iFREE em ${formatarDataHora(new Date())} · página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </Page>
  );
}

export function CurriculoDocument(props: DadosCurriculo) {
  return (
    <Document>
      <CurriculoPagina {...props} />
    </Document>
  );
}

export async function gerarPdfCurriculo(props: DadosCurriculo): Promise<Buffer> {
  return renderToBuffer(<CurriculoDocument {...props} />);
}
