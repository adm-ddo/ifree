import { promises as fs, readFileSync } from "fs";
import path from "path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Circle,
  Rect,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const VERDE = "#00C896";
const VERDE_MEIO = "#00B285";
const VERDE_FUNDO = "#009E77";
const TINTA = "#14171A";
const NAVY = "#0D1B2A";
const BRANCO = "#FFFFFF";
const MUTED = "#6B7670";

const ROOT = path.resolve(__dirname, "..");
// react-pdf's Image trata string como URL (fetch) — em Node isso quebra com
// caminho local do Windows, então lemos o arquivo e passamos o Buffer direto.
const PNG = (rel: string) => readFileSync(path.join(ROOT, "public", "brand", "logo", "png", rel));
const QR = readFileSync(path.join(ROOT, "public", "brand", "qrcode", "ifree-qrcode.png"));

function IconeSvg({ size, cor = VERDE }: { size: number; cor?: string }) {
  return (
    <Svg viewBox="0 0 120 100" style={{ width: size, height: (size * 100) / 120 }}>
      <Path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill={VERDE_FUNDO} />
      <Path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill={VERDE_MEIO} />
      <Path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill={cor} />
      <Circle cx={44} cy={50} r={32} fill="none" stroke={cor} strokeWidth={11} />
      <Circle cx={44} cy={50} r={26.5} fill={BRANCO} />
      <Rect x={41} y={25} width={6} height={13} rx={3} fill={TINTA} />
      <Rect x={41} y={62} width={6} height={13} rx={3} fill={TINTA} />
      <Rect x={19} y={47} width={13} height={6} rx={3} fill={TINTA} />
      <Rect x={56} y={47} width={13} height={6} rx={3} fill={TINTA} />
      <Path d="M 38 48 L 44 55 L 55 35" fill="none" stroke={TINTA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", padding: 48, color: TINTA, fontSize: 10 },
  rodape: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#A9B3AD" },
  eyebrow: { fontSize: 10, fontWeight: 700, color: VERDE_FUNDO, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  h1: { fontSize: 24, fontWeight: 700, color: NAVY, marginBottom: 18 },
  corpo: { fontSize: 10.5, lineHeight: 1.6, color: "#3A413C" },
});

function Rodape({ pagina }: { pagina: string }) {
  return (
    <View style={s.rodape} fixed>
      <Text>iFREE · Manual de Identidade Visual</Text>
      <Text>{pagina}</Text>
    </View>
  );
}

// ---------- Página 1: Capa ----------
function PaginaCapa() {
  return (
    <Page size="A4" style={{ ...s.page, backgroundColor: NAVY, padding: 0, justifyContent: "center", alignItems: "center" }}>
      <View style={{ alignItems: "center" }}>
        <IconeSvg size={150} />
        <Text style={{ fontSize: 64, fontWeight: 700, marginTop: 18 }}>
          <Text style={{ color: VERDE }}>i</Text>
          <Text style={{ color: BRANCO }}>FREE</Text>
        </Text>
        <Text style={{ fontSize: 15, fontWeight: 700, color: "#D7EDE5", marginTop: 2 }}>Entrou. Trabalhou. Recebeu.</Text>
      </View>
      <View style={{ position: "absolute", bottom: 56, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontWeight: 700, color: BRANCO, letterSpacing: 0.5 }}>MANUAL DE IDENTIDADE VISUAL</Text>
        <Text style={{ fontSize: 9, color: "#8CA39B", marginTop: 4 }}>Versão 1 · 2026</Text>
      </View>
    </Page>
  );
}

// ---------- Página 2: Símbolo & construção ----------
function PaginaSimbolo() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.eyebrow}>01 · Símbolo</Text>
      <Text style={s.h1}>Um relógio virando um pássaro</Text>
      <Text style={s.corpo}>
        O anel do relógio representa o controle do turno — entrada, saída,
        cada minuto contado. A asa que sai dele é a liberdade: o extra decide
        quando topa o próximo turno. Os ponteiros, dentro do mostrador, formam
        um check — o sinal de que o turno foi confirmado e pago.
      </Text>

      <View style={{ alignItems: "center", marginVertical: 28 }}>
        <IconeSvg size={130} />
      </View>

      <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Área de proteção</Text>
      <Text style={{ ...s.corpo, marginBottom: 14 }}>
        Mantenha ao redor do símbolo um espaço livre de texto, borda ou outros
        elementos equivalente a, no mínimo, a largura do mostrador branco
        (medida &ldquo;X&rdquo; abaixo). Isso preserva a leitura da asa, que é a parte
        mais fina do desenho.
      </Text>
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: "#B7C0BA", padding: 28 }}>
          <IconeSvg size={90} />
        </View>
        <Text style={{ fontSize: 8, color: MUTED, marginTop: 6 }}>&ldquo;X&rdquo; = largura do mostrador branco do relógio</Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Tamanho mínimo</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
        <View style={{ alignItems: "center" }}>
          <IconeSvg size={30} />
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 6 }}>24px digital</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <IconeSvg size={22} />
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 6 }}>8mm impresso</Text>
        </View>
        <Text style={{ ...s.corpo, flex: 1, fontSize: 9 }}>
          Abaixo disso os detalhes do mostrador (ponteiros e marcações)
          somem — use só o anel verde sólido, sem o miolo, se precisar de
          algo menor (ex: favicon 16px).
        </Text>
      </View>
      <Rodape pagina="02" />
    </Page>
  );
}

// ---------- Página 3: Paleta ----------
function Swatch({ nome, hex, rgb, cmyk }: { nome: string; hex: string; rgb: string; cmyk: string }) {
  return (
    <View style={{ width: "47%", marginBottom: 20 }}>
      <View style={{ height: 70, backgroundColor: hex, borderRadius: 6, borderWidth: hex === BRANCO ? 1 : 0, borderColor: "#E1E6E0" }} />
      <Text style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginTop: 8 }}>{nome}</Text>
      <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>HEX {hex}</Text>
      <Text style={{ fontSize: 9, color: MUTED }}>RGB {rgb}</Text>
      <Text style={{ fontSize: 9, color: MUTED }}>CMYK {cmyk}*</Text>
    </View>
  );
}

function PaginaPaleta() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.eyebrow}>02 · Cor</Text>
      <Text style={s.h1}>Paleta</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        <Swatch nome="Verde iFREE" hex={VERDE} rgb="0, 200, 150" cmyk="100, 0, 25, 22" />
        <Swatch nome="Navy" hex={NAVY} rgb="13, 27, 42" cmyk="69, 36, 0, 84" />
        <Swatch nome="Tinta (texto)" hex={TINTA} rgb="20, 23, 26" cmyk="23, 12, 0, 90" />
        <Swatch nome="Branco" hex={BRANCO} rgb="255, 255, 255" cmyk="0, 0, 0, 0" />
      </View>
      <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>
        * CMYK calculado por conversão padrão a partir do RGB — confirme com
        o perfil de cor da sua gráfica antes de fechar uma impressão em
        grande volume; a conversão sem perfil pode variar.
      </Text>

      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Uso</Text>
        <Text style={s.corpo}>
          Verde é a cor de assinatura — símbolo, links, botões primários e o
          &ldquo;i&rdquo; do wordmark. Navy é a cor de fundo em telas de destaque (hero,
          CTAs, capas). Tinta é o texto do dia a dia; nunca use preto puro
          (#000000).
        </Text>
      </View>
      <Rodape pagina="03" />
    </Page>
  );
}

// ---------- Página 4: Tipografia ----------
function PaginaTipografia() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.eyebrow}>03 · Tipografia</Text>
      <Text style={s.h1}>Duas famílias, dois papéis</Text>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: VERDE_FUNDO }}>NO DIGITAL — Urbanist</Text>
        <Text style={{ fontSize: 44, fontWeight: 700, marginTop: 6 }}>Aa</Text>
        <Text style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>
          Google Fonts · peso 900 (Black) no logotipo e em headlines, 500–700
          no corpo de texto do site e do painel.
        </Text>
      </View>

      <View>
        <Text style={{ fontSize: 11, fontWeight: 700, color: VERDE_FUNDO }}>NO IMPRESSO — Helvetica Bold</Text>
        <Text style={{ fontSize: 44, fontWeight: 700, marginTop: 6, fontFamily: "Helvetica-Bold" }}>Aa</Text>
        <Text style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>
          Usada nos PDFs deste kit (molduras, recibos, contratos) por ser uma
          fonte padrão de qualquer visualizador de PDF — sem depender de
          instalação. Peso e proporção próximos do Urbanist Black.
        </Text>
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Hierarquia</Text>
        <Text style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>Título — 900 / Black</Text>
        <Text style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginTop: 6 }}>Subtítulo — 700 / Bold</Text>
        <Text style={{ fontSize: 10.5, color: "#3A413C", marginTop: 6 }}>Corpo de texto — 500 / Medium, entrelinha confortável.</Text>
      </View>
      <Rodape pagina="04" />
    </Page>
  );
}

// ---------- Página 5: Certo & errado ----------
function Selo({ ok }: { ok: boolean }) {
  return (
    <View
      style={{
        position: "absolute",
        top: -8,
        right: -8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: ok ? VERDE : "#E0433C",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: 700, color: BRANCO }}>{ok ? "✓" : "X"}</Text>
    </View>
  );
}

function Exemplo({ ok, legenda, children }: { ok: boolean; legenda: string; children: React.ReactNode }) {
  return (
    <View style={{ width: "47%", marginBottom: 22 }}>
      <View
        style={{
          height: 84,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#E1E6E0",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {children}
        <Selo ok={ok} />
      </View>
      <Text style={{ fontSize: 9, color: "#3A413C", marginTop: 6 }}>{legenda}</Text>
    </View>
  );
}

function PaginaCertoErrado() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.eyebrow}>04 · Aplicação</Text>
      <Text style={s.h1}>Certo & errado</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        <Exemplo ok legenda="Cor cheia, no branco">
          <IconeSvg size={50} />
        </Exemplo>
        <Exemplo ok legenda="Cor cheia, no navy">
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: NAVY, borderRadius: 6 }} />
          <IconeSvg size={50} />
        </Exemplo>
        <Exemplo ok legenda="Monocromático, 1 cor só">
          <IconeSvg size={50} cor={TINTA} />
        </Exemplo>
        <Exemplo ok legenda="Com a área de proteção respeitada">
          <View style={{ borderWidth: 0.5, borderStyle: "dashed", borderColor: "#C6CEDA", padding: 10 }}>
            <IconeSvg size={40} />
          </View>
        </Exemplo>

        <Exemplo ok={false} legenda="Esticado / proporção alterada">
          <Svg viewBox="0 0 120 100" style={{ width: 76, height: 40 }}>
            <Path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill={VERDE_FUNDO} />
            <Path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill={VERDE_MEIO} />
            <Path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill={VERDE} />
            <Circle cx={44} cy={50} r={32} fill="none" stroke={VERDE} strokeWidth={11} />
            <Circle cx={44} cy={50} r={26.5} fill={BRANCO} />
            <Path d="M 38 48 L 44 55 L 55 35" fill="none" stroke={TINTA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Exemplo>
        <Exemplo ok={false} legenda="Cor fora da paleta">
          <IconeSvg size={50} cor="#C4224B" />
        </Exemplo>
        <Exemplo ok={false} legenda="Baixo contraste">
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#3FE0B8", borderRadius: 6 }} />
          <IconeSvg size={50} />
        </Exemplo>
        <Exemplo ok={false} legenda="Rotacionado">
          <View style={{ transform: "rotate(28deg)" }}>
            <IconeSvg size={48} />
          </View>
        </Exemplo>
      </View>
      <Rodape pagina="05" />
    </Page>
  );
}

// ---------- Página 6: Aplicações ----------
function PaginaAplicacoes() {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.eyebrow}>05 · Aplicações</Text>
      <Text style={s.h1}>Onde a marca já está</Text>

      <View style={{ flexDirection: "row", gap: 24, marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Moldura do totem</Text>
          <Text style={{ ...s.corpo, fontSize: 9.5 }}>
            Impressos prontos em A4 e A3, com recorte de 258×169mm pro
            VisionTab T3011 — em public/brand/moldura/.
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Ícone do app</Text>
          {/* eslint-disable jsx-a11y/alt-text -- Image do @react-pdf/renderer, sem prop alt */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 4 }}>
            <Image src={PNG("icone-cor-256.png")} style={{ width: 40, height: 40 }} />
            <Image src={PNG("icone-cor-256.png")} style={{ width: 26, height: 26 }} />
            <Image src={PNG("icone-cor-256.png")} style={{ width: 16, height: 16 }} />
          </View>
          {/* eslint-enable jsx-a11y/alt-text */}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6 }}>QR de contato</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer */}
          <Image src={QR} style={{ width: 70, height: 70 }} />
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>ifree.app.br</Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Onde encontrar cada arquivo</Text>
          <Text style={{ ...s.corpo, fontSize: 9.5 }}>
            public/brand/logo/svg — vetor, fonte de tudo{"\n"}
            public/brand/logo/png — transparente, várias resoluções{"\n"}
            public/brand/logo/jpg — fundo sólido{"\n"}
            public/brand/icones-app — favicon e ícones de app{"\n"}
            public/brand/qrcode — QR pro site{"\n"}
            public/brand/moldura — moldura do tablet em PDF
          </Text>
        </View>
      </View>
      <Rodape pagina="06" />
    </Page>
  );
}

async function main() {
  const buffer = await renderToBuffer(
    <Document>
      <PaginaCapa />
      <PaginaSimbolo />
      <PaginaPaleta />
      <PaginaTipografia />
      <PaginaCertoErrado />
      <PaginaAplicacoes />
    </Document>
  );

  const outDir = path.join(ROOT, "public", "brand", "manual");
  await fs.mkdir(outDir, { recursive: true });
  const dest = path.join(outDir, "manual-identidade-ifree.pdf");
  await fs.writeFile(dest, buffer);
  console.log("Manual gerado em", dest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
