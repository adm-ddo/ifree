import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import QRCode from "qrcode";
import pngToIco from "png-to-ico";

const VERDE = "#00C896";
const VERDE_MEIO = "#00B285";
const VERDE_FUNDO = "#009E77";
const TINTA = "#14171A";
const NAVY = "#0D1B2A";
const BRANCO = "#FFFFFF";
const FONTE = "Arial Black, Arial, Helvetica, sans-serif";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "brand");

async function escrever(rel: string, conteudo: Buffer | string) {
  const dest = path.join(OUT, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, conteudo);
  return dest;
}

/** Peças internas do ícone (sem moldura <svg>), reaproveitadas em todas as variantes. */
function pecasIcone({ cor, mono }: { cor: string; mono: boolean }) {
  if (mono) {
    // versão 1 cor: sem mostrador preenchido (miolo vazado) e asa lisa.
    return `
      <path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill="${cor}" />
      <path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill="${cor}" />
      <path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill="${cor}" />
      <circle cx="44" cy="50" r="32" fill="none" stroke="${cor}" stroke-width="11" />
      <rect x="41" y="25" width="6" height="13" rx="3" fill="${cor}" />
      <rect x="41" y="62" width="6" height="13" rx="3" fill="${cor}" />
      <rect x="19" y="47" width="13" height="6" rx="3" fill="${cor}" />
      <rect x="56" y="47" width="13" height="6" rx="3" fill="${cor}" />
      <path d="M 38 48 L 44 55 L 55 35" fill="none" stroke="${cor}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
    `;
  }
  return `
    <path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill="${VERDE_FUNDO}" />
    <path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill="${VERDE_MEIO}" />
    <path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill="${VERDE}" />
    <circle cx="44" cy="50" r="32" fill="none" stroke="${VERDE}" stroke-width="11" />
    <circle cx="44" cy="50" r="26.5" fill="${BRANCO}" />
    <rect x="41" y="25" width="6" height="13" rx="3" fill="${TINTA}" />
    <rect x="41" y="62" width="6" height="13" rx="3" fill="${TINTA}" />
    <rect x="19" y="47" width="13" height="6" rx="3" fill="${TINTA}" />
    <rect x="56" y="47" width="13" height="6" rx="3" fill="${TINTA}" />
    <path d="M 38 48 L 44 55 L 55 35" fill="none" stroke="${TINTA}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
  `;
}

function svgIcone({ cor, mono = false }: { cor?: string; mono?: boolean } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">${pecasIcone({
    cor: cor ?? TINTA,
    mono,
  })}</svg>`;
}

/** Lockup horizontal: ícone + "iFREE" + tagline opcional. viewBox 0 0 900 220
 * com a frase; sem ela o canvas de 900 sobra vazio à direita (o conteúdo
 * real — ícone+wordmark — só ocupa uns 650px), então usa um viewBox bem
 * mais estreito (0 0 660 200) nesse caso, cortado rente ao conteúdo. */
function svgHorizontal({ corTexto, comTagline = true }: { corTexto: string; comTagline?: boolean }): string {
  const larguraViewBox = comTagline ? 900 : 705;
  const alturaViewBox = comTagline ? 220 : 205;
  const tagline = comTagline
    ? `<text x="228" y="172" font-family="${FONTE}" font-weight="700" font-size="26" letter-spacing="0.3" fill="${corTexto}" opacity="0.92">Entrou. Trabalhou. Recebeu.</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraViewBox} ${alturaViewBox}">
    <g transform="translate(10,25) scale(1.5)">${pecasIcone({ cor: TINTA, mono: false })}</g>
    <text x="222" y="130" font-family="${FONTE}" font-weight="900" font-size="118" letter-spacing="-3">
      <tspan fill="${VERDE}">i</tspan><tspan fill="${corTexto}">FREE</tspan>
    </text>
    ${tagline}
  </svg>`;
}

/** Lockup empilhado (ícone em cima, wordmark+tagline embaixo, centralizado) — pra avatar/capa quadrada. viewBox 0 0 480 520. */
function svgEmpilhado({ corTexto }: { corTexto: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 520">
    <g transform="translate(60,40) scale(3)">${pecasIcone({ cor: TINTA, mono: false })}</g>
    <text x="240" y="420" text-anchor="middle" font-family="${FONTE}" font-weight="900" font-size="86" letter-spacing="-2">
      <tspan fill="${VERDE}">i</tspan><tspan fill="${corTexto}">FREE</tspan>
    </text>
    <text x="240" y="460" text-anchor="middle" font-family="${FONTE}" font-weight="700" font-size="22" fill="${corTexto}" opacity="0.92">Entrou. Trabalhou. Recebeu.</text>
  </svg>`;
}

async function pngDe(svg: string, largura: number, fundo?: string): Promise<Buffer> {
  let img = sharp(Buffer.from(svg), { density: 300 }).resize({ width: largura }).ensureAlpha();
  if (fundo) {
    img = img.flatten({ background: fundo });
  }
  return img.png({ palette: false }).toBuffer();
}

/** Encaixa o ícone (não-quadrado, por causa da asa) num canvas N×N — obrigatório
 * pra favicon/ícone de app, que exige proporção 1:1. */
async function pngQuadrado(svg: string, tamanho: number, fundo?: string): Promise<Buffer> {
  const img = sharp(Buffer.from(svg), { density: 300 })
    .resize({
      width: tamanho,
      height: tamanho,
      fit: "contain",
      background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha();
  return img.png({ palette: false }).toBuffer();
}

async function jpgDe(svg: string, largura: number, fundo: string): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 300 })
    .resize({ width: largura })
    .flatten({ background: fundo })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function main() {
  // ---------- SVG (fonte de verdade, vetorial) ----------
  await escrever("logo/svg/icone-cor.svg", svgIcone());
  await escrever("logo/svg/icone-mono-preto.svg", svgIcone({ cor: TINTA, mono: true }));
  await escrever("logo/svg/icone-mono-branco.svg", svgIcone({ cor: BRANCO, mono: true }));
  await escrever("logo/svg/horizontal-cor.svg", svgHorizontal({ corTexto: TINTA }));
  await escrever("logo/svg/horizontal-branco.svg", svgHorizontal({ corTexto: BRANCO }));
  // Sem a frase "Entrou. Trabalhou. Recebeu." — só ícone + wordmark, pra uso
  // em lugares apertados (assinatura de e-mail, avatar, cabeçalho de doc)
  // onde a tagline não cabe ou não faz sentido.
  await escrever(
    "logo/svg/horizontal-sem-frase-cor.svg",
    svgHorizontal({ corTexto: TINTA, comTagline: false })
  );
  await escrever(
    "logo/svg/horizontal-sem-frase-branco.svg",
    svgHorizontal({ corTexto: BRANCO, comTagline: false })
  );
  await escrever("logo/svg/empilhado-cor.svg", svgEmpilhado({ corTexto: TINTA }));

  // ---------- PNG transparente (várias resoluções) ----------
  const iconeCorSvg = svgIcone();
  const iconeMonoPretoSvg = svgIcone({ cor: TINTA, mono: true });
  const iconeMonoBrancoSvg = svgIcone({ cor: BRANCO, mono: true });
  const horizontalCorSvg = svgHorizontal({ corTexto: TINTA });
  const horizontalBrancoSvg = svgHorizontal({ corTexto: BRANCO });
  const horizontalSemFraseCorSvg = svgHorizontal({ corTexto: TINTA, comTagline: false });
  const horizontalSemFraseBrancoSvg = svgHorizontal({ corTexto: BRANCO, comTagline: false });
  const empilhadoCorSvg = svgEmpilhado({ corTexto: TINTA });

  for (const largura of [256, 512, 1024, 2048]) {
    await escrever(`logo/png/icone-cor-${largura}.png`, await pngDe(iconeCorSvg, largura));
    await escrever(`logo/png/icone-mono-preto-${largura}.png`, await pngDe(iconeMonoPretoSvg, largura));
    await escrever(`logo/png/icone-mono-branco-${largura}.png`, await pngDe(iconeMonoBrancoSvg, largura));
  }
  for (const largura of [1000, 2000, 3000]) {
    await escrever(`logo/png/horizontal-cor-${largura}.png`, await pngDe(horizontalCorSvg, largura));
    await escrever(`logo/png/horizontal-branco-${largura}.png`, await pngDe(horizontalBrancoSvg, largura));
    await escrever(
      `logo/png/horizontal-sem-frase-cor-${largura}.png`,
      await pngDe(horizontalSemFraseCorSvg, largura)
    );
    await escrever(
      `logo/png/horizontal-sem-frase-branco-${largura}.png`,
      await pngDe(horizontalSemFraseBrancoSvg, largura)
    );
  }
  await escrever("logo/png/empilhado-cor-1200.png", await pngDe(empilhadoCorSvg, 1200));

  // ---------- JPG (fundo sólido, pra quem não aceita transparência) ----------
  await escrever("logo/jpg/icone-cor-fundo-branco-1024.jpg", await jpgDe(iconeCorSvg, 1024, BRANCO));
  await escrever("logo/jpg/horizontal-cor-fundo-branco-2000.jpg", await jpgDe(horizontalCorSvg, 2000, BRANCO));
  await escrever("logo/jpg/horizontal-branco-fundo-navy-2000.jpg", await jpgDe(horizontalBrancoSvg, 2000, NAVY));
  await escrever(
    "logo/jpg/horizontal-sem-frase-cor-fundo-branco-2000.jpg",
    await jpgDe(horizontalSemFraseCorSvg, 2000, BRANCO)
  );
  await escrever(
    "logo/jpg/horizontal-sem-frase-branco-fundo-navy-2000.jpg",
    await jpgDe(horizontalSemFraseBrancoSvg, 2000, NAVY)
  );
  await escrever("logo/jpg/empilhado-cor-fundo-branco-1200.jpg", await jpgDe(empilhadoCorSvg, 1200, BRANCO));

  // ---------- Ícones de app / favicon ----------
  const tamanhosApp = [16, 32, 48, 96, 180, 192, 512];
  const pngsApp: Record<number, Buffer> = {};
  for (const tam of tamanhosApp) {
    pngsApp[tam] = await pngQuadrado(iconeCorSvg, tam);
    await escrever(`icones-app/icon-${tam}.png`, pngsApp[tam]);
  }
  // maskable: mesmo ícone com fundo branco sólido e ~20% de margem de segurança
  // (Android adaptive icons cortam em círculo — sem a margem, a asa é cortada)
  const iconeComMargem = await sharp(Buffer.from(iconeCorSvg), { density: 300 })
    .resize({ width: Math.round(512 * 0.72), height: Math.round(512 * 0.6), fit: "contain", background: BRANCO })
    .extend({
      top: Math.round(512 * 0.2),
      bottom: Math.round(512 * 0.2),
      left: Math.round(512 * 0.14),
      right: Math.round(512 * 0.14),
      background: BRANCO,
    })
    .resize(512, 512, { fit: "contain", background: BRANCO })
    .png({ palette: false })
    .toBuffer();
  await escrever("icones-app/icon-512-maskable.png", iconeComMargem);

  const favicoBuf = await pngToIco([pngsApp[16], pngsApp[32], pngsApp[48]]);
  await escrever("icones-app/favicon.ico", favicoBuf);

  // Atualiza os ícones reais do app Next.js (convenção de arquivo em src/app/)
  await fs.writeFile(path.join(ROOT, "src", "app", "icon.svg"), iconeCorSvg);
  await fs.writeFile(path.join(ROOT, "src", "app", "favicon.ico"), favicoBuf);
  await fs.writeFile(path.join(ROOT, "src", "app", "apple-icon.png"), pngsApp[180]);

  // ---------- QR code pro ifree.app.br ----------
  const qrPng = await QRCode.toBuffer("https://ifree.app.br", {
    margin: 1,
    width: 1000,
    color: { dark: NAVY, light: "#FFFFFFFF" },
  });
  const qrSvg = await QRCode.toString("https://ifree.app.br", {
    type: "svg",
    margin: 1,
    color: { dark: NAVY, light: "#FFFFFFFF" },
  });
  await escrever("qrcode/ifree-qrcode.png", qrPng);
  await escrever("qrcode/ifree-qrcode.svg", qrSvg);

  console.log("Kit de marca gerado em", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
