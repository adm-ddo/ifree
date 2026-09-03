import { promises as fs } from "fs";
import path from "path";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const OUT_DIR =
  "C:/Users/Thiago/AppData/Local/Temp/claude/c--Users-Thiago-extras-app/fc1e4f69-6ed5-4dcd-9a0e-5fd106776fef/scratchpad/juridico-clt";

const NAVY = "#0D1B2A";
const VERDE = "#00906d";
const MUTED = "#78716c";
const BORDA = "#e7e5e4";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#292524", lineHeight: 1.5 },
  header: { marginBottom: 18, borderBottom: `1.5pt solid ${NAVY}`, paddingBottom: 12 },
  eyebrow: { fontSize: 9, fontWeight: 700, color: VERDE, textTransform: "uppercase", letterSpacing: 1 },
  titulo: { fontSize: 18, fontWeight: 700, color: NAVY, marginTop: 4 },
  subtitulo: { fontSize: 10, color: MUTED, marginTop: 4 },
  secaoTitulo: { fontSize: 12, fontWeight: 700, color: NAVY, marginTop: 16, marginBottom: 6 },
  paragrafo: { marginBottom: 8, textAlign: "justify" },
  clausula: { flexDirection: "row", marginBottom: 8 },
  clausulaNum: { width: 20, fontWeight: 700, color: VERDE },
  clausulaTexto: { flex: 1, textAlign: "justify" },
  bullet: { flexDirection: "row", marginBottom: 5, paddingLeft: 4 },
  bulletMarca: { width: 12, color: VERDE, fontWeight: 700 },
  bulletTexto: { flex: 1, textAlign: "justify" },
  caixaAviso: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fffbeb",
    borderLeft: "3pt solid #d97706",
    fontSize: 9,
    color: "#92400e",
  },
  caixaDisclaimer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#f5f5f4",
    borderRadius: 4,
    fontSize: 8.5,
    color: MUTED,
  },
  campo: { flexDirection: "row", marginBottom: 10, gap: 8 },
  campoLabel: { fontSize: 9, color: MUTED, width: 110 },
  campoLinha: { flex: 1, borderBottom: `0.8pt solid ${NAVY}`, height: 14 },
  assinaturas: { marginTop: 36, flexDirection: "row", justifyContent: "space-between" },
  assinaturaBloco: { width: "45%", alignItems: "center" },
  assinaturaLinha: { borderTop: `0.8pt solid ${NAVY}`, width: "100%", marginTop: 30 },
  assinaturaLabel: { fontSize: 8.5, color: MUTED, marginTop: 4, textAlign: "center" },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#a8a29e",
    textAlign: "center",
    borderTop: `0.5pt solid ${BORDA}`,
    paddingTop: 6,
  },
});

function Rodape({ doc }: { doc: string }) {
  return (
    <Text
      style={s.rodape}
      render={({ pageNumber, totalPages }) => `${doc} · página ${pageNumber} de ${totalPages}`}
      fixed
    />
  );
}

// ============================================================
// DOCUMENTO 1 — Nota técnica para o advogado
// ============================================================
function NotaJuridica() {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.eyebrow}>iFREE · Nota preparatória</Text>
          <Text style={s.titulo}>Controle Interno de Jornada — Nota para Avaliação Jurídica</Text>
          <Text style={s.subtitulo}>
            Preparada para apresentação ao(à) advogado(a) responsável, sobre o módulo de controle
            de jornada para funcionários CLT do sistema iFREE.
          </Text>
        </View>

        <Text style={s.secaoTitulo}>Objetivo</Text>
        <Text style={s.paragrafo}>
          Este documento resume a estratégia adotada para o módulo de controle de jornada oferecido
          a funcionários registrados em regime CLT dentro do sistema iFREE — hoje usado internamente
          por [nome da empresa] — para que o(a) advogado(a) avalie sua adequação e valide (ou ajuste)
          os pontos abaixo antes de qualquer uso formal do registro como base disciplinar.
        </Text>

        <Text style={s.secaoTitulo}>1. O que o sistema faz, na prática</Text>
        <Text style={s.paragrafo}>
          O funcionário se identifica por CPF num tablet fixo no local, tira uma foto no momento do
          registro, e o sistema grava a data e o horário de entrada e de saída — e, quando
          configurado, também a saída e a volta do intervalo intrajornada. Não há cálculo de valor,
          não há pagamento associado a este fluxo, e não há assinatura de contrato de trabalho nele:
          é, na essência, um substituto digital de olhar a câmera de segurança para anotar o horário
          de chegada — só que centralizado, com foto e horário já organizados por pessoa e por dia.
        </Text>

        <Text style={s.secaoTitulo}>2. Base legal da dispensa de controle de ponto</Text>
        <Text style={s.paragrafo}>
          O art. 74, §2º, da CLT — com a redação dada pela Lei nº 13.874/2019 (Lei da Liberdade
          Econômica) — dispensa da obrigatoriedade de manter controle de jornada (manual, mecânico
          ou eletrônico) os estabelecimentos com até 20 (vinte) empregados. [Nome da empresa]
          se enquadra nessa hipótese atualmente. A mesma reforma viabilizou o regime de{" "}
          <Text style={{ fontWeight: 700 }}>jornada por exceção</Text>, que dispensa o registro
          detalhado de horário justamente para quem não é obrigado a ter ponto.
        </Text>

        <Text style={s.secaoTitulo}>3. Por que não se buscou a certificação REP-P (Portaria MTE 671/2021)</Text>
        <Text style={s.paragrafo}>
          Existe um caminho para tornar um sistema como este um registrador eletrônico de ponto
          oficial (REP-P), regulado pela Portaria MTP nº 671/2021: registro do programa no INPI,
          Atestado Técnico e Termo de Responsabilidade assinado com certificado digital ICP-Brasil
          qualificado, geração de arquivos técnicos (AFD/AEJ) assinados digitalmente em padrão
          CAdES, comprovantes de marcação em PDF assinados em padrão PAdES, entre outras exigências
          técnicas e documentais.
        </Text>
        <Text style={s.paragrafo}>
          A decisão, até aqui, foi não seguir esse caminho, por três razões: (a) a empresa está
          dispensada da obrigação legal de manter ponto; (b) a finalidade pretendida é gestão
          interna, não a emissão de prova formal com presunção de veracidade; (c) o custo e a
          complexidade da certificação são desproporcionais ao uso pretendido no estágio atual.
        </Text>

        <Text style={s.secaoTitulo}>4. Uso pretendido do registro</Text>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Acompanhamento informal de pontualidade e assiduidade — substituindo a checagem manual
            por câmera.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Eventual base para orientação verbal ou advertência escrita, dentro do poder diretivo
            do empregador.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            NÃO se pretende usar como prova de jornada trabalhada para fins de pagamento de horas
            extras, banco de horas ou qualquer verba de natureza salarial — isso permanece fora do
            escopo do sistema, regido apenas pelo contrato de trabalho vigente.
          </Text>
        </View>

        <Text style={s.secaoTitulo}>5. Força probatória — a diferença em relação a um REP-P certificado</Text>
        <Text style={s.paragrafo}>
          Sem a certificação REP-P, o registro não goza da presunção de veracidade que a legislação
          atribui a um ponto eletrônico homologado. Ou seja: numa eventual disputa, cabe à empresa
          demonstrar a fidedignidade do registro, em vez de a lei já presumi-lo verdadeiro. A
          combinação de foto, horário e consistência ao longo do tempo tende a sustentar bem esse
          ônus na prática, mas — reforça-se — não é automática como seria com um REP-P.
        </Text>

        <View style={s.caixaAviso}>
          <Text>
            Ponto de atenção para o(a) advogado(a): caso o quadro de funcionários da empresa se
            aproxime de 20 por estabelecimento, a obrigatoriedade legal de ponto passa a valer, e a
            análise sobre certificação REP-P deixa de ser uma opção e vira uma exigência de
            conformidade — recomenda-se revisitar esta nota nesse cenário.
          </Text>
        </View>

        <Text style={s.secaoTitulo}>6. Mitigação de risco já adotada</Text>
        <Text style={s.paragrafo}>
          Cada funcionário CLT assina, na admissão (ou na implantação do sistema, para quem já está
          na empresa), um Termo de Ciência específico — documento em anexo a esta nota — deixando
          claro que se trata de controle interno, que não substitui um ponto eletrônico oficial, e
          que o funcionário está ciente de que o registro pode subsidiar decisões de gestão. Esse
          termo cria uma base informativa e contratual própria, independente da certificação REP-P.
        </Text>

        <Text style={s.secaoTitulo}>7. Pontos para validação do(a) advogado(a)</Text>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Adequação do texto do Termo de Ciência (documento anexo) à realidade da empresa e à
            legislação vigente.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Confirmação de que o enquadramento no art. 74, §2º, da CLT permanece válido para o
            número de empregados por estabelecimento.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Orientação sobre até que ponto o registro pode fundamentar medidas disciplinares
            formais (advertência, suspensão) sem a certificação REP-P.
          </Text>
        </View>

        <Text style={s.secaoTitulo}>8. Fontes consultadas nesta análise preliminar</Text>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Portaria MTP nº 671/2021 (Ministério do Trabalho e Previdência) — regulamenta REP-C,
            REP-A e REP-P.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>Art. 74, §2º, da CLT, com redação da Lei nº 13.874/2019.</Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            &ldquo;Perguntas e Respostas — Portaria nº 671/2021&rdquo;, FAQ oficial do Ministério do
            Trabalho e Emprego (gov.br).
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletMarca}>•</Text>
          <Text style={s.bulletTexto}>
            Conteúdo complementar de fornecedores especializados em ponto eletrônico (usado só como
            checklist técnico de apoio, não como fonte primária).
          </Text>
        </View>

        <View style={s.caixaDisclaimer}>
          <Text>
            Esta nota foi elaborada com apoio de pesquisa automatizada (IA) a partir de fontes
            públicas secundárias, sem qualificação jurídica formal. Serve como ponto de partida
            para a análise do(a) advogado(a), não como parecer jurídico. Todas as afirmações legais
            devem ser conferidas contra o texto primário da legislação antes de qualquer decisão ou
            comunicação à equipe.
          </Text>
        </View>

        <Rodape doc="Nota técnica — Controle Interno de Jornada" />
      </Page>
    </Document>
  );
}

// ============================================================
// DOCUMENTO 2 — Termo de Ciência (funcionário CLT)
// ============================================================
function TermoClt() {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.eyebrow}>iFREE · Funcionário CLT</Text>
          <Text style={s.titulo}>Termo de Ciência — Controle Interno de Jornada</Text>
          <Text style={s.subtitulo}>
            Diferente do termo assinado por extras/freelancers no totem — este não envolve
            prestação eventual, pagamento por turno nem chave PIX.
          </Text>
        </View>

        <View style={s.campo}>
          <Text style={s.campoLabel}>Empresa</Text>
          <View style={s.campoLinha} />
        </View>
        <View style={s.campo}>
          <Text style={s.campoLabel}>CNPJ</Text>
          <View style={s.campoLinha} />
        </View>
        <View style={s.campo}>
          <Text style={s.campoLabel}>Funcionário(a)</Text>
          <View style={s.campoLinha} />
        </View>
        <View style={s.campo}>
          <Text style={s.campoLabel}>CPF</Text>
          <View style={s.campoLinha} />
        </View>
        <View style={s.campo}>
          <Text style={s.campoLabel}>Cargo / Função</Text>
          <View style={s.campoLinha} />
        </View>

        <Text style={s.secaoTitulo}>Cláusulas</Text>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>1.</Text>
          <Text style={s.clausulaTexto}>
            A Empresa utiliza um sistema eletrônico interno (totem/tablet) para registrar o
            horário de entrada e saída do(a) Funcionário(a), mediante identificação por CPF e
            captura de foto no momento do registro — e, quando aplicável, também a saída e a volta
            do intervalo intrajornada.
          </Text>
        </View>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>2.</Text>
          <Text style={s.clausulaTexto}>
            Este registro tem finalidade de controle interno de gestão e{" "}
            <Text style={{ fontWeight: 700 }}>não constitui</Text> Registrador Eletrônico de Ponto
            (REP) certificado nos termos da Portaria MTP nº 671/2021. A Empresa está, atualmente,
            dispensada da obrigatoriedade legal de controle de ponto, nos termos do art. 74, §2º,
            da CLT (estabelecimentos com até 20 empregados).
          </Text>
        </View>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>3.</Text>
          <Text style={s.clausulaTexto}>
            O(a) Funcionário(a) declara estar ciente de que é sua responsabilidade registrar
            fielmente sua entrada e saída no sistema, refletindo o horário real de chegada e saída
            do local de trabalho.
          </Text>
        </View>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>4.</Text>
          <Text style={s.clausulaTexto}>
            O(a) Funcionário(a) está ciente de que os registros gerados por este sistema poderão
            ser utilizados pela Empresa para fins de acompanhamento de pontualidade e assiduidade,
            podendo subsidiar orientações, advertências ou demais medidas no âmbito do poder
            diretivo do empregador, sempre observada a legislação trabalhista aplicável.
          </Text>
        </View>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>5.</Text>
          <Text style={s.clausulaTexto}>
            Este sistema não é utilizado para cálculo, controle ou pagamento de horas extras, banco
            de horas ou qualquer verba de natureza salarial — a remuneração do(a) Funcionário(a)
            segue integralmente o quanto pactuado em seu contrato de trabalho e/ou convenção
            coletiva aplicável, independentemente dos registros deste sistema.
          </Text>
        </View>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>6.</Text>
          <Text style={s.clausulaTexto}>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018), a foto
            capturada no momento do registro é utilizada exclusivamente para confirmar a identidade
            de quem realizou a marcação. O(a) Funcionário(a) pode, a qualquer momento, solicitar
            acesso, correção ou exclusão desses dados, nos termos do art. 18 da LGPD, ressalvado o
            que precisar ser mantido por obrigação legal.
          </Text>
        </View>

        <View style={s.clausula}>
          <Text style={s.clausulaNum}>7.</Text>
          <Text style={s.clausulaTexto}>
            Este termo não cria, modifica nem substitui qualquer cláusula do contrato de trabalho
            vigente entre as partes — trata-se exclusivamente da ciência do(a) Funcionário(a)
            quanto ao funcionamento do sistema de controle interno de jornada.
          </Text>
        </View>

        <View style={s.campo}>
          <Text style={s.campoLabel}>Local e data</Text>
          <View style={s.campoLinha} />
        </View>

        <View style={s.assinaturas}>
          <View style={s.assinaturaBloco}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>Assinatura do(a) Funcionário(a)</Text>
          </View>
          <View style={s.assinaturaBloco}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>Assinatura do representante da Empresa</Text>
          </View>
        </View>

        <View style={s.caixaDisclaimer}>
          <Text>
            Modelo gerado como ponto de partida — recomenda-se revisão por advogado(a) trabalhista
            antes do uso, ajustando à realidade específica da empresa e ao contrato de trabalho de
            cada funcionário.
          </Text>
        </View>

        <Rodape doc="Termo de Ciência — Controle Interno de Jornada (CLT)" />
      </Page>
    </Document>
  );
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const bufferNota = await renderToBuffer(<NotaJuridica />);
  await fs.writeFile(path.join(OUT_DIR, "nota-juridica-controle-jornada.pdf"), bufferNota);

  const bufferTermo = await renderToBuffer(<TermoClt />);
  await fs.writeFile(path.join(OUT_DIR, "termo-ciencia-clt-controle-jornada.pdf"), bufferTermo);

  console.log("Gerado em:", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
