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
// Navy um pouco mais claro que o navy institucional — só pro fundo da
// moldura A4, a pedido: mais leve sem perder o tom de azul-marinho.
const NAVY_CLARO = "#16304A";
const BRANCO = "#FFFFFF";

// Área ativa da tela do VisionTab T3011 (Positivo Vision Tab 11) — NÃO é o
// corpo do tablet (que é maior, ~258×169mm). Calculado a partir da diagonal
// de 11" + proporção 16:10 (resolução FHD 1920×1200), cruzado com a razão
// tela/corpo do modelo irmão T3010 (corpo 237×156mm, tela 800×1280 @
// 10,1") — os dois caminhos bateram em ~237×148mm. A moldura cola na
// borda preta do tablet, então precisa deixar de fora só a tela de
// verdade, não o aparelho inteiro. Recomendado conferir com régua no
// aparelho físico antes de imprimir em lote — é um cálculo, não medida
// oficial do fabricante.
const CUTOUT_W = 237; // mm
const CUTOUT_H = 148; // mm

// Área ativa da tela do Samsung Galaxy Tab A SM-P355M (8" com S Pen,
// 2015) — pesquisado (não é medida física própria): resolução confirmada
// em 3 fontes independentes como 1024×768 (proporção 4:3, não 16:10).
// Corpo do aparelho: 208,4×137,9mm. Diagonal de 8" ÷ proporção 4:3 (razão
// diagonal:largura:altura = 5:4:3) dá tela ativa de ~162,6×121,9mm — bate
// com o corpo (sobra ~8mm de moldura de cada lado, ~23mm em cima/embaixo
// pra câmera e botão físico, plausível pra um tablet de 2015). Mesmo
// aviso do T3011: é cálculo, confira com régua no aparelho físico antes
// de imprimir em lote.
const CUTOUT_H_P355M = 162.6; // mm — lado mais comprido (retrato)
const CUTOUT_W_P355M = 121.9; // mm — lado mais curto (retrato)

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
      <Path d="M 38 48 L 44 55 L 55 35" fill="none" stroke={TINTA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Marca "L" de corte nos 4 cantos do recorte — convenção gráfica de guia de corte. */
function MarcasDeCorte({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const t = mm(8); // comprimento de cada tracinho
  const off = mm(2.5); // afastamento da quina do recorte
  const esp = 1; // espessura da linha
  const cantos = [
    { cx: x, cy: y, hDir: -1, vDir: -1 }, // sup-esq
    { cx: x + w, cy: y, hDir: 1, vDir: -1 }, // sup-dir
    { cx: x, cy: y + h, hDir: -1, vDir: 1 }, // inf-esq
    { cx: x + w, cy: y + h, hDir: 1, vDir: 1 }, // inf-dir
  ];
  return (
    <>
      {cantos.map((c, i) => (
        <View key={i}>
          <View
            style={{
              position: "absolute",
              left: c.hDir < 0 ? c.cx - off - t : c.cx + off,
              top: c.cy - esp / 2,
              width: t,
              height: esp,
              backgroundColor: BRANCO,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: c.cx - esp / 2,
              top: c.vDir < 0 ? c.cy - off - t : c.cy + off,
              width: esp,
              height: t,
              backgroundColor: BRANCO,
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
  pagina: { fontFamily: "Helvetica", position: "relative", backgroundColor: NAVY },
});

/** Moldura arredondada ao redor do recorte. O halo suave (duas camadas
 * translúcidas) dá presença extra quando há espaço de sobra (A3); no A4,
 * onde a margem é apertadíssima, halo é desligado pra não comer o espaço
 * que o conteúdo de marketing precisa. */
function FramePresenca({
  cutX,
  cutY,
  espessura,
  raio,
  halo = 0,
  cutW = CUTOUT_W,
  cutH = CUTOUT_H,
}: {
  cutX: number;
  cutY: number;
  espessura: number; // mm — grossura do traço da moldura
  raio: number; // mm — raio das quinas
  halo?: number; // mm — quanto o halo externo passa da moldura (0 = sem halo)
  cutW?: number; // mm — largura do recorte (padrão: tela do VisionTab)
  cutH?: number; // mm — altura do recorte (padrão: tela do VisionTab)
}) {
  const padFrame = espessura * 1.6; // frame um pouco por fora da linha de corte
  return (
    <>
      {halo > 0 && (
        <>
          <View
            style={{
              position: "absolute",
              left: mm(cutX - padFrame - halo),
              top: mm(cutY - padFrame - halo),
              width: mm(cutW + 2 * (padFrame + halo)),
              height: mm(cutH + 2 * (padFrame + halo)),
              borderRadius: mm(raio + halo),
              backgroundColor: VERDE,
              opacity: 0.08,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: mm(cutX - padFrame - halo / 2),
              top: mm(cutY - padFrame - halo / 2),
              width: mm(cutW + 2 * (padFrame + halo / 2)),
              height: mm(cutH + 2 * (padFrame + halo / 2)),
              borderRadius: mm(raio + halo / 2),
              backgroundColor: VERDE,
              opacity: 0.1,
            }}
          />
        </>
      )}
      {/* moldura sólida */}
      <View
        style={{
          position: "absolute",
          left: mm(cutX - padFrame),
          top: mm(cutY - padFrame),
          width: mm(cutW + 2 * padFrame),
          height: mm(cutH + 2 * padFrame),
          borderRadius: mm(raio),
          borderWidth: mm(espessura),
          borderColor: VERDE,
        }}
      />
    </>
  );
}

/** Texto rotacionado 90°, centralizado numa faixa estreita e alta — usado
 * nas laterais do A4, onde não cabe texto na horizontal. */
function TextoLateral({
  x,
  y,
  largura,
  altura,
  texto,
  cor = VERDE,
}: {
  x: number;
  y: number;
  largura: number; // mm — largura real da faixa (horizontal, na página)
  altura: number; // mm — altura real da faixa (vertical, na página)
  texto: string;
  cor?: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: mm(x),
        top: mm(y),
        width: mm(largura),
        height: mm(altura),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          width: mm(altura),
          textAlign: "center",
          fontSize: 13,
          fontWeight: 700,
          color: cor,
          letterSpacing: 3,
          transform: "rotate(-90deg)",
        }}
      >
        {texto}
      </Text>
    </View>
  );
}

function MoldA4({ qrDataUri }: { qrDataUri: string }) {
  const W = 297;
  const H = 210;
  const cutX = (W - CUTOUT_W) / 2; // 19.5mm
  const cutY = (H - CUTOUT_H) / 2; // 20.5mm

  return (
    <Page size={[mm(W), mm(H)]} style={{ ...stylesComuns.pagina, backgroundColor: NAVY_CLARO }}>
      {/* só a linha de corte real do recorte — sem filete externo, sem
          moldura extra ao redor, pra não parecer que tem mais de um corte */}
      <View
        style={{
          position: "absolute",
          left: mm(cutX),
          top: mm(cutY),
          width: mm(CUTOUT_W),
          height: mm(CUTOUT_H),
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: BRANCO,
        }}
      />

      {/* ---------- faixa superior: logo + tagline ---------- */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: mm(W),
          paddingHorizontal: mm(7),
          paddingTop: mm(3),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: mm(1.4) }}>
            <IconeSvg w={mm(16)} h={mm(13.3)} />
            <Text style={{ fontSize: 28, fontWeight: 700 }}>
              <Text style={{ color: VERDE }}>i</Text>
              <Text style={{ color: BRANCO }}>FREE</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 23, fontWeight: 700, color: BRANCO }}>
            Entrou. <Text style={{ color: VERDE }}>Trabalhou.</Text> Recebeu.
          </Text>
        </View>
      </View>

      {/* instrução de traje — ancorada a uma distância fixa do recorte (não
          depende do tamanho da faixa da logo acima, pra nunca sobrepor nem
          encostar na área da câmera do tablet, colada logo acima da tela) */}
      <View style={{ position: "absolute", left: 0, width: mm(W), bottom: mm(H - cutY + 6), alignItems: "center" }}>
        <View
          style={{
            width: mm(140),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: VERDE,
            borderRadius: 999,
            paddingVertical: mm(2.4),
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY }}>
            INICIE O TURNO DEVIDAMENTE TRAJADO
          </Text>
        </View>
      </View>

      {/* instrução de traje (encerramento) — mesma lógica, ancorada a uma
          distância fixa abaixo do recorte */}
      <View style={{ position: "absolute", left: 0, width: mm(W), top: mm(cutY + CUTOUT_H + 2), alignItems: "center" }}>
        <View
          style={{
            width: mm(178),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: VERDE,
            borderRadius: 999,
            paddingVertical: mm(2),
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY }}>
            ENCERRE O TURNO COM O MESMO TRAJE QUE INICIOU
          </Text>
        </View>
      </View>

      {/* ---------- faixa inferior: resposta + QR ---------- */}
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: mm(W),
          height: mm(H - cutY - CUTOUT_H),
          paddingHorizontal: mm(7),
          paddingBottom: mm(1),
          justifyContent: "flex-end",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ flex: 1, marginRight: mm(6), fontSize: 15, fontWeight: 700, color: BRANCO }}>
            É o <Text style={{ color: VERDE }}>i</Text>FREE — Controle digital de freelancers com foto, sem papel.
          </Text>
          <View
            style={{
              flexShrink: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: mm(3.5),
              backgroundColor: BRANCO,
              borderRadius: mm(3),
              padding: mm(3),
            }}
          >
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 9.5, color: TINTA, fontWeight: 700 }}>Quer isso no seu negócio?</Text>
              <Text style={{ fontSize: 13.5, color: VERDE_FUNDO, fontWeight: 700 }}>ifree.app.br</Text>
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, sem prop alt */}
            <Image src={qrDataUri} style={{ width: mm(18), height: mm(18) }} />
          </View>
        </View>
      </View>

      {/* ---------- faixas laterais: frase de marca na vertical ---------- */}
      <TextoLateral
        x={2}
        y={cutY}
        largura={cutX - 2}
        altura={CUTOUT_H}
        texto="ENTROU · TRABALHOU · RECEBEU"
      />
      <TextoLateral
        x={cutX + CUTOUT_W}
        y={cutY}
        largura={cutX - 2}
        altura={CUTOUT_H}
        texto="SEU TEMPO · SUA HORA · SUA LIBERDADE"
        cor={BRANCO}
      />
    </Page>
  );
}

function MoldA3({ qrDataUri }: { qrDataUri: string }) {
  const W = 420;
  const H = 297;
  const margem = 7;
  const cutX = (W - CUTOUT_W) / 2;
  const cutY = (H - CUTOUT_H) / 2;

  return (
    <Page size={[mm(W), mm(H)]} style={{ ...stylesComuns.pagina, backgroundColor: NAVY_CLARO }}>
      {/* filete fino ao redor da folha */}
      <View
        style={{
          position: "absolute",
          left: mm(margem),
          top: mm(margem),
          width: mm(W - 2 * margem),
          height: mm(H - 2 * margem),
          borderWidth: 1.2,
          borderColor: VERDE,
          opacity: 0.6,
        }}
      />

      {/* marca d'água do ícone, painel esquerdo */}
      <View style={{ position: "absolute", left: mm(margem - 10), top: mm(cutY + CUTOUT_H / 2 - 55), opacity: 0.07 }}>
        <IconeSvg w={mm(95)} h={mm(79)} />
      </View>

      <FramePresenca cutX={cutX} cutY={cutY} espessura={3.4} raio={7} halo={9} />

      {/* recorte tracejado — guia de corte exata */}
      <View
        style={{
          position: "absolute",
          left: mm(cutX),
          top: mm(cutY),
          width: mm(CUTOUT_W),
          height: mm(CUTOUT_H),
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: BRANCO,
        }}
      />
      <MarcasDeCorte x={mm(cutX)} y={mm(cutY)} w={mm(CUTOUT_W)} h={mm(CUTOUT_H)} />

      {/* faixa superior: logo + tagline / manifesto / instrução de traje (colada no recorte) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: mm(margem),
          width: mm(W),
          height: mm(cutY - margem),
          paddingHorizontal: mm(margem + 16),
          justifyContent: "space-between",
          paddingTop: mm(2),
          paddingBottom: mm(11),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: mm(2) }}>
            <IconeSvg w={mm(26)} h={mm(21.7)} />
            <Text style={{ fontSize: 36, fontWeight: 700 }}>
              <Text style={{ color: VERDE }}>i</Text>
              <Text style={{ color: BRANCO }}>FREE</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: 700, color: BRANCO }}>
            Entrou. <Text style={{ color: VERDE }}>Trabalhou.</Text> Recebeu.
          </Text>
        </View>

        <Text style={{ fontSize: 27, fontWeight: 700, color: BRANCO, textAlign: "center" }}>
          Seu tempo. Sua hora. <Text style={{ color: VERDE }}>Sua liberdade.</Text>
        </Text>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: mm(158),
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: VERDE,
              borderRadius: 999,
              paddingVertical: mm(3.6),
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
              INICIE O TURNO DEVIDAMENTE TRAJADO
            </Text>
          </View>
        </View>
      </View>

      {/* faixa inferior: instrução de traje (colada no recorte) / passo a passo / explicação + QR */}
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: mm(margem),
          width: mm(W),
          height: mm(H - margem - cutY - CUTOUT_H),
          paddingHorizontal: mm(margem + 16),
          justifyContent: "space-between",
          paddingTop: mm(4),
          paddingBottom: mm(2),
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: mm(202),
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: VERDE,
              borderRadius: 999,
              paddingVertical: mm(3.6),
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
              ENCERRE O TURNO COM O MESMO TRAJE QUE INICIOU
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: mm(11), backgroundColor: "#16233A", borderRadius: mm(4), paddingVertical: mm(4), paddingHorizontal: mm(7) }}>
            {[
              ["1", "Bate o CPF"],
              ["2", "Tira a foto"],
              ["3", "Assina na tela"],
            ].map(([n, label]) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: mm(2.5) }}>
                <View style={{ width: mm(9), height: mm(9), borderRadius: mm(4.5), backgroundColor: VERDE, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{n}</Text>
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: 700, color: BRANCO }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ flex: 1, marginRight: mm(8), fontSize: 17, fontWeight: 700, color: BRANCO }}>
            É o <Text style={{ color: VERDE }}>i</Text>FREE — Controle digital de freelancers com foto, sem papel.
          </Text>
          <View
            style={{
              flexShrink: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: mm(6),
              backgroundColor: BRANCO,
              borderRadius: mm(5),
              padding: mm(5),
            }}
          >
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Quer isso no seu negócio?</Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: VERDE_FUNDO }}>ifree.app.br</Text>
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, sem prop alt */}
            <Image src={qrDataUri} style={{ width: mm(26), height: mm(26) }} />
          </View>
        </View>
      </View>

      <Text style={{ position: "absolute", left: mm(margem + 5), bottom: mm(2), fontSize: 6.5, color: "#6D82A1" }}>
        Recorte interno: {CUTOUT_W} × {CUTOUT_H}mm (tela) · VisionTab T3011
      </Text>
    </Page>
  );
}

/** Moldura em A4 retrato (vertical) pro Samsung Galaxy Tab A SM-P355M —
 * esse tablet é usado em pé (câmera no lado curto), diferente do VisionTab
 * (deitado). Mesma estrutura visual do A3 (moldura com halo + marcas de
 * corte + guia de 3 passos), só que numa folha bem mais estreita, então
 * tudo empilhado em vez de lado a lado. */
function MoldGalaxyTabAP355MVertical({ qrDataUri }: { qrDataUri: string }) {
  const W = 210;
  const H = 297;
  const margem = 7;
  const cutX = (W - CUTOUT_W_P355M) / 2;
  const cutY = (H - CUTOUT_H_P355M) / 2;

  return (
    <Page size={[mm(W), mm(H)]} style={{ ...stylesComuns.pagina, backgroundColor: NAVY_CLARO }}>
      {/* filete fino ao redor da folha */}
      <View
        style={{
          position: "absolute",
          left: mm(margem),
          top: mm(margem),
          width: mm(W - 2 * margem),
          height: mm(H - 2 * margem),
          borderWidth: 1.2,
          borderColor: VERDE,
          opacity: 0.6,
        }}
      />

      <FramePresenca
        cutX={cutX}
        cutY={cutY}
        cutW={CUTOUT_W_P355M}
        cutH={CUTOUT_H_P355M}
        espessura={3}
        raio={6}
        halo={7}
      />

      {/* recorte tracejado — guia de corte exata */}
      <View
        style={{
          position: "absolute",
          left: mm(cutX),
          top: mm(cutY),
          width: mm(CUTOUT_W_P355M),
          height: mm(CUTOUT_H_P355M),
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: BRANCO,
        }}
      />
      <MarcasDeCorte x={mm(cutX)} y={mm(cutY)} w={mm(CUTOUT_W_P355M)} h={mm(CUTOUT_H_P355M)} />

      {/* faixa superior: logo + tagline */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: mm(W),
          paddingHorizontal: mm(7),
          paddingTop: mm(5),
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: mm(2) }}>
            <IconeSvg w={mm(20)} h={mm(16.7)} />
            <Text style={{ fontSize: 30, fontWeight: 700 }}>
              <Text style={{ color: VERDE }}>i</Text>
              <Text style={{ color: BRANCO }}>FREE</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: 700, color: BRANCO, textAlign: "center", marginTop: mm(3) }}>
            Entrou. <Text style={{ color: VERDE }}>Trabalhou.</Text> Recebeu.
          </Text>
        </View>
      </View>

      {/* instrução de traje — ancorada a uma distância fixa do recorte,
          não depende do tamanho da faixa da logo acima */}
      <View style={{ position: "absolute", left: 0, width: mm(W), bottom: mm(H - cutY + 6), alignItems: "center" }}>
        <View
          style={{
            width: mm(160),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: VERDE,
            borderRadius: 999,
            paddingVertical: mm(2.6),
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: NAVY }}>
            INICIE O TURNO DEVIDAMENTE TRAJADO
          </Text>
        </View>
      </View>

      {/* instrução de traje (encerramento) — mesma lógica, abaixo do recorte */}
      <View style={{ position: "absolute", left: 0, width: mm(W), top: mm(cutY + CUTOUT_H_P355M + 5), alignItems: "center" }}>
        <View
          style={{
            width: mm(175),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: VERDE,
            borderRadius: 999,
            paddingVertical: mm(2.6),
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: NAVY }}>
            ENCERRE O TURNO COM O MESMO TRAJE QUE INICIOU
          </Text>
        </View>
      </View>

      {/* faixa inferior: passo a passo / explicação + QR */}
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: mm(margem),
          width: mm(W),
          height: mm(H - margem - cutY - CUTOUT_H_P355M),
          paddingHorizontal: mm(7),
          paddingBottom: mm(2),
          justifyContent: "flex-end",
        }}
      >
        <View style={{ alignItems: "center", marginBottom: mm(3) }}>
          <View style={{ flexDirection: "row", gap: mm(6), backgroundColor: "#16233A", borderRadius: mm(4), paddingVertical: mm(2), paddingHorizontal: mm(6) }}>
            {[
              ["1", "Bate o CPF"],
              ["2", "Tira a foto"],
              ["3", "Assina na tela"],
            ].map(([n, label]) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: mm(2) }}>
                <View style={{ width: mm(8), height: mm(8), borderRadius: mm(4), backgroundColor: VERDE, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>{n}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: 700, color: BRANCO }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 12.5, fontWeight: 700, color: BRANCO, textAlign: "center", marginBottom: mm(3) }}>
            É o <Text style={{ color: VERDE }}>i</Text>FREE — Controle digital de freelancers com foto, sem papel.
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: mm(4),
              backgroundColor: BRANCO,
              borderRadius: mm(4),
              padding: mm(3),
            }}
          >
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>Quer isso no seu negócio?</Text>
              <Text style={{ fontSize: 13.5, fontWeight: 700, color: VERDE_FUNDO }}>ifree.app.br</Text>
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, sem prop alt */}
            <Image src={qrDataUri} style={{ width: mm(14), height: mm(14) }} />
          </View>
        </View>
      </View>

      <Text style={{ position: "absolute", left: mm(margem + 5), bottom: mm(2), fontSize: 6.5, color: "#6D82A1" }}>
        Recorte interno: {CUTOUT_W_P355M} × {CUTOUT_H_P355M}mm (tela) · Galaxy Tab A SM-P355M
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

  const bufferP355M = await renderToBuffer(
    <Document>
      <MoldGalaxyTabAP355MVertical qrDataUri={qrDataUri} />
    </Document>
  );
  await fs.writeFile(path.join(outDir, "moldura-tablet-galaxy-tab-a-p355m-A4-vertical.pdf"), bufferP355M);

  console.log("OK:", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
