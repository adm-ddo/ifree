import { promises as fs } from "fs";
import path from "path";
import QRCode from "qrcode";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  Circle,
  Rect,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// Conversão mm -> pt (unidade nativa do react-pdf/pdf-lib): 1mm = 2.834645669pt
const mm = (v: number) => v * 2.834645669291339;

const VERDE = "#00C896";
const VERDE_MEIO = "#00B285";
const VERDE_FUNDO = "#009E77";
const TINTA = "#14171A";
const NAVY = "#0D1B2A";
const BRANCO = "#FFFFFF";

const CUTOUT_W = 258; // mm — vão exato da tela do VisionTab T3011
const CUTOUT_H = 169; // mm

const URL_SITE = "https://ifree.app.br";

/** Ícone iFREE (relógio-anel + asa + ponteiros em check), viewBox 0..120 x 0..100. */
function IconeSvg({ w, h }: { w: number; h: number }) {
  return (
    <Svg viewBox="0 0 120 100" style={{ width: w, height: h }}>
      <Path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill={VERDE_FUNDO} />
      <Path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill={VERDE_MEIO} />
      <Path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill={VERDE} />
      <Circle cx={44} cy={50} r={32} fill="none" stroke={VERDE} strokeWidth={11} />
      <Circle cx={44} cy={50} r={26.5} fill={BRANCO} />
      <Rect x={41} y={25} width={6} height={13} rx={3} fill={TINTA} />
      <Rect x={41} y={62} width={6} height={13} rx={3} fill={TINTA} />
      <Rect x={19} y={47} width={13} height={6} rx={3} fill={TINTA} />
      <Rect x={56} y={47} width={13} height={6} rx={3} fill={TINTA} />
      <Path d="M 28 49 L 40 58 L 60 30" fill="none" stroke={TINTA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Marca "L" de corte nos 4 cantos do recorte — convenção gráfica de vai/recorte. */
function MarcasDeCorte({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const t = mm(9); // tamanho de cada tracinho da marca
  const off = mm(3); // afastamento da linha de corte
  const cor = VERDE;
  const espessura = 1;
  const cantos = [
    { cx: x, cy: y, dx1: -1, dy1: 0, dx2: 0, dy2: -1 }, // sup-esq
    { cx: x + w, cy: y, dx1: 1, dy1: 0, dx2: 0, dy2: -1 }, // sup-dir
    { cx: x, cy: y + h, dx1: -1, dy1: 0, dx2: 0, dy2: 1 }, // inf-esq
    { cx: x + w, cy: y + h, dx1: 1, dy1: 0, dx2: 0, dy2: 1 }, // inf-dir
  ];
  return (
    <>
      {cantos.map((c, i) => (
        <View key={i}>
          <View
            style={{
              position: "absolute",
              left: c.cx + c.dx1 * off - (c.dx1 < 0 ? t : 0),
              top: c.cy - espessura / 2,
              width: t,
              height: espessura,
              backgroundColor: cor,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: c.cx - espessura / 2,
              top: c.cy + c.dy2 * off - (c.dy2 < 0 ? t : 0),
              width: espessura,
              height: t,
              backgroundColor: cor,
            }}
          />
        </View>
      ))}
    </>
  );
}

async function gerarQrDataUri(): Promise<string> {
  return QRCode.toDataURL(URL_SITE, {
    margin: 1,
    width: 600,
    color: { dark: NAVY, light: "#FFFFFFFF" },
  });
}

const stylesComuns = StyleSheet.create({
  pagina: { fontFamily: "Helvetica", position: "relative", backgroundColor: BRANCO },
});

function MoldA4({ qrDataUri }: { qrDataUri: string }) {
  const W = 297;
  const H = 210;
  const borda = 4; // faixa verde ao redor da folha, em mm
  const cutX = (W - CUTOUT_W) / 2;
  const cutY = (H - CUTOUT_H) / 2;

  return (
    <Page size={[mm(W), mm(H)]} style={stylesComuns.pagina}>
      {/* moldura verde externa */}
      <View style={{ position: "absolute", left: 0, top: 0, width: mm(W), height: mm(borda), backgroundColor: VERDE }} />
      <View style={{ position: "absolute", left: 0, bottom: 0, width: mm(W), height: mm(borda), backgroundColor: VERDE }} />
      <View style={{ position: "absolute", left: 0, top: 0, width: mm(borda), height: mm(H), backgroundColor: VERDE }} />
      <View style={{ position: "absolute", right: 0, top: 0, width: mm(borda), height: mm(H), backgroundColor: VERDE }} />

      {/* recorte tracejado */}
      <View
        style={{
          position: "absolute",
          left: mm(cutX),
          top: mm(cutY),
          width: mm(CUTOUT_W),
          height: mm(CUTOUT_H),
          border: `${1}pt dashed ${VERDE}`,
        }}
      />
      <MarcasDeCorte x={mm(cutX)} y={mm(cutY)} w={mm(CUTOUT_W)} h={mm(CUTOUT_H)} />

      {/* logo, canto superior esquerdo */}
      <View style={{ position: "absolute", left: mm(borda + 6), top: mm(6), flexDirection: "row", alignItems: "center", gap: mm(2.2) }}>
        <IconeSvg w={mm(11)} h={mm(9.2)} />
        <Text style={{ fontSize: 15, fontWeight: 700 }}>
          <Text style={{ color: VERDE }}>i</Text>
          <Text style={{ color: TINTA }}>FREE</Text>
        </Text>
      </View>

      {/* tagline, canto superior direito */}
      <Text style={{ position: "absolute", right: mm(borda + 6), top: mm(9), fontSize: 7.5, fontWeight: 700, color: TINTA }}>
        Entrou. Trabalhou. Recebeu.
      </Text>

      {/* QR + site, canto inferior direito */}
      <View style={{ position: "absolute", right: mm(borda + 6), bottom: mm(4), flexDirection: "row", alignItems: "center", gap: mm(2.5) }}>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 7, color: TINTA, fontWeight: 700 }}>Quer isso no seu negócio?</Text>
          <Text style={{ fontSize: 9, color: VERDE, fontWeight: 700 }}>ifree.app.br</Text>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, sem prop alt */}
        <Image src={qrDataUri} style={{ width: mm(15), height: mm(15) }} />
      </View>

      {/* legenda do recorte, canto inferior esquerdo */}
      <Text style={{ position: "absolute", left: mm(borda + 6), bottom: mm(6), fontSize: 6.5, color: "#8A958E" }}>
        Recorte interno: 258 × 169mm · VisionTab T3011
      </Text>
    </Page>
  );
}

function MoldA3({ qrDataUri }: { qrDataUri: string }) {
  const W = 420;
  const H = 297;
  const borda = 6;
  const cutX = (W - CUTOUT_W) / 2;
  const cutY = (H - CUTOUT_H) / 2;

  return (
    <Page size={[mm(W), mm(H)]} style={stylesComuns.pagina}>
      {/* moldura verde externa */}
      <View style={{ position: "absolute", left: 0, top: 0, width: mm(W), height: mm(borda), backgroundColor: VERDE }} />
      <View style={{ position: "absolute", left: 0, bottom: 0, width: mm(W), height: mm(borda), backgroundColor: VERDE }} />
      <View style={{ position: "absolute", left: 0, top: 0, width: mm(borda), height: mm(H), backgroundColor: VERDE }} />
      <View style={{ position: "absolute", right: 0, top: 0, width: mm(borda), height: mm(H), backgroundColor: VERDE }} />

      {/* marca d'água do ícone no painel esquerdo */}
      <View style={{ position: "absolute", left: mm(borda - 4), top: mm(cutY + CUTOUT_H / 2 - 40), opacity: 0.05 }}>
        <IconeSvg w={mm(70)} h={mm(58)} />
      </View>

      {/* recorte tracejado */}
      <View
        style={{
          position: "absolute",
          left: mm(cutX),
          top: mm(cutY),
          width: mm(CUTOUT_W),
          height: mm(CUTOUT_H),
          border: `${1.2}pt dashed ${VERDE}`,
        }}
      />
      <MarcasDeCorte x={mm(cutX)} y={mm(cutY)} w={mm(CUTOUT_W)} h={mm(CUTOUT_H)} />

      {/* faixa superior: logo + selo "bata o ponto" + manifesto */}
      <View style={{ position: "absolute", left: 0, top: mm(borda), width: mm(W), height: mm(cutY - borda), alignItems: "center", justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: mm(W - 2 * (borda + 14)), marginBottom: mm(6) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: mm(3.5) }}>
            <IconeSvg w={mm(20)} h={mm(16.7)} />
            <View>
              <Text style={{ fontSize: 26, fontWeight: 700 }}>
                <Text style={{ color: VERDE }}>i</Text>
                <Text style={{ color: TINTA }}>FREE</Text>
              </Text>
              <Text style={{ fontSize: 9, fontWeight: 700, color: TINTA, marginTop: -2 }}>
                Entrou. Trabalhou. Recebeu.
              </Text>
            </View>
          </View>
          <View style={{ borderWidth: 1.2, borderColor: VERDE, borderRadius: 999, paddingVertical: mm(2.4), paddingHorizontal: mm(6) }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: VERDE_FUNDO }}>BATA O PONTO AQUI ↓</Text>
          </View>
        </View>
        <Text style={{ fontSize: 22, fontWeight: 700, color: NAVY, textAlign: "center" }}>
          Seu tempo. Sua hora. Sua liberdade.
        </Text>
      </View>

      {/* faixa inferior: passo a passo + QR/CTA */}
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: mm(borda),
          width: mm(W),
          height: mm(H - borda - cutY - CUTOUT_H),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: mm(borda + 14),
        }}
      >
        <View style={{ flexDirection: "row", gap: mm(10) }}>
          {[
            ["1", "Bate o CPF"],
            ["2", "Tira a foto"],
            ["3", "Assina na tela"],
          ].map(([n, label]) => (
            <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: mm(2.5) }}>
              <View style={{ width: mm(8), height: mm(8), borderRadius: mm(4), backgroundColor: VERDE, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>{n}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: 700, color: TINTA }}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: mm(5) }}>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Quer isso no seu negócio?</Text>
            <Text style={{ fontSize: 15, fontWeight: 700, color: VERDE_FUNDO }}>ifree.app.br</Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, sem prop alt */}
          <Image src={qrDataUri} style={{ width: mm(26), height: mm(26) }} />
        </View>
      </View>

      <Text style={{ position: "absolute", left: mm(borda + 4), bottom: mm(1.5), fontSize: 6, color: "#B7C0BA" }}>
        Recorte interno: 258 × 169mm · VisionTab T3011
      </Text>
    </Page>
  );
}

async function main() {
  const qrDataUri = await gerarQrDataUri();

  const outDir = path.resolve(__dirname, "..", "public", "brand", "moldura");
  await fs.mkdir(outDir, { recursive: true });

  const bufferA4 = await renderToBuffer(
    <Document>
      <MoldA4 qrDataUri={qrDataUri} />
    </Document>
  );
  await fs.writeFile(path.join(outDir, "moldura-tablet-A4.pdf"), bufferA4);

  const bufferA3 = await renderToBuffer(
    <Document>
      <MoldA3 qrDataUri={qrDataUri} />
    </Document>
  );
  await fs.writeFile(path.join(outDir, "moldura-tablet-A3.pdf"), bufferA3);

  console.log("OK:", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
