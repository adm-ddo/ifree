import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import QRCode from "qrcode";

// Mesma paleta e peças de ícone de gerar-kit-marca.tsx — scripts em
// scripts-temp são intencionalmente independentes entre si (sem import
// cruzado), então duplica-se o essencial em vez de criar um módulo
// compartilhado só pra uso local.
const VERDE = "#00C896";
const VERDE_MEIO = "#00B285";
const VERDE_FUNDO = "#009E77";
const TINTA = "#14171A";
const NAVY = "#0D1B2A";
const NAVY_CLARO = "#16304A";
const BRANCO = "#FFFFFF";
const FONTE = "Arial Black, Arial, Helvetica, sans-serif";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "brand", "telas-tablet");
const URL_SITE = "https://ifree.app.br";

async function escrever(rel: string, conteudo: Buffer) {
  const dest = path.join(OUT, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, conteudo);
  return dest;
}

function pecasIcone(cor: string): string {
  return `
    <path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill="${VERDE_FUNDO}" />
    <path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill="${VERDE_MEIO}" />
    <path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill="${VERDE}" />
    <circle cx="44" cy="50" r="32" fill="none" stroke="${VERDE}" stroke-width="11" />
    <circle cx="44" cy="50" r="26.5" fill="${BRANCO}" />
    <rect x="41" y="25" width="6" height="13" rx="3" fill="${cor}" />
    <rect x="41" y="62" width="6" height="13" rx="3" fill="${cor}" />
    <rect x="19" y="47" width="13" height="6" rx="3" fill="${cor}" />
    <rect x="56" y="47" width="13" height="6" rx="3" fill="${cor}" />
    <path d="M 38 48 L 44 55 L 55 35" fill="none" stroke="${cor}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
  `;
}

/** Ícone só como silhueta (pra marca d'água gigante de fundo — sem
 * contraste de cores internas, só a forma, bem apagado). */
function iconeSilhueta(opacidade: number): string {
  return `<g opacity="${opacidade}">${pecasIcone(BRANCO)}</g>`;
}

async function qrDataUri(): Promise<string> {
  const buf = await QRCode.toBuffer(URL_SITE, {
    margin: 0,
    width: 400,
    color: { dark: NAVY, light: "#FFFFFFFF" },
  });
  return `data:image/png;base64,${buf.toString("base64")}`;
}

type Dimensoes = { w: number; h: number; nome: string };

const VISIONTAB: Dimensoes = { w: 1920, h: 1200, nome: "visiontab-t3011" };
const GALAXY_P355M: Dimensoes = { w: 768, h: 1024, nome: "galaxy-tab-a-p355m" };

/** Lockup empilhado (ícone em cima, wordmark+tagline embaixo) — mesma
 * proporção interna de svgEmpilhado em gerar-kit-marca.tsx (viewBox
 * 480×520, já comprovada sem sobreposição), só reaproveitada aqui como um
 * grupo escalável em vez de um SVG próprio. `larguraAlvo` é a largura em
 * px que o ícone deve ocupar no canvas final. */
function lockupEmpilhado(larguraAlvo: number): { svg: string; alturaUsada: number } {
  const escala = larguraAlvo / 360; // 360 = largura do ícone em svgEmpilhado (scale(3) * 120)
  return {
    svg: `
      <g transform="translate(60,40) scale(3)">${pecasIcone(TINTA)}</g>
      <text x="240" y="420" text-anchor="middle" font-family="${FONTE}" font-weight="900" font-size="86" letter-spacing="-2">
        <tspan fill="${VERDE}">i</tspan><tspan fill="${BRANCO}">FREE</tspan>
      </text>
      <text x="240" y="460" text-anchor="middle" font-family="${FONTE}" font-weight="700" font-size="22" fill="${BRANCO}" opacity="0.92">Entrou. Trabalhou. Recebeu.</text>
    `,
    alturaUsada: 460 * escala, // até a baseline da tagline, em px do canvas final
  };
}

/** Tela de protetor de tela — propaganda passiva, roda enquanto o tablet
 * fica ocioso entre um turno e outro. */
function svgProtetorTela(dim: Dimensoes, qr: string): string {
  const { w, h } = dim;
  const paisagem = w > h;

  const lockupLargura = paisagem ? w * 0.22 : w * 0.44;
  const lockup = lockupEmpilhado(lockupLargura);
  const lockupEscala = lockupLargura / 360;
  const lockupTopo = paisagem ? h * 0.14 : h * 0.1;

  const sublineY = lockupTopo + lockup.alturaUsada + (paisagem ? 46 : 40);
  const sublineSize = paisagem ? 26 : 22;

  const qrTam = paisagem ? 190 : 170;
  const qrY = sublineY + (paisagem ? 90 : 80);
  const qrX = w / 2 - qrTam / 2;

  const ctaSize = paisagem ? 26 : 22;
  const urlSize = paisagem ? 34 : 30;
  const ctaY = qrY + qrTam * 1.24 + ctaSize * 1.6;
  const urlY = ctaY + urlSize * 1.3;

  const watermarkTam = Math.min(w, h) * 0.95;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="fundo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${NAVY_CLARO}" />
        <stop offset="1" stop-color="${NAVY}" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#fundo)" />

    <g transform="translate(${w - watermarkTam * 0.55}, ${h - watermarkTam * 0.6}) scale(${watermarkTam / 120})">
      ${iconeSilhueta(0.05)}
    </g>

    <g transform="translate(${w / 2 - lockupLargura / 2}, ${lockupTopo}) scale(${lockupEscala})">
      ${lockup.svg}
    </g>

    <text x="${w / 2}" y="${sublineY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="${sublineSize}" fill="${BRANCO}" opacity="0.75">
      Controle digital de freelancers com foto, sem papel.
    </text>

    <rect x="${qrX - qrTam * 0.12}" y="${qrY - qrTam * 0.12}" width="${qrTam * 1.24}" height="${qrTam * 1.24}" rx="${qrTam * 0.1}" fill="${BRANCO}" />
    <image href="${qr}" x="${qrX}" y="${qrY}" width="${qrTam}" height="${qrTam}" />
    <text x="${w / 2}" y="${ctaY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${ctaSize}" fill="${BRANCO}" opacity="0.85">
      Quer isso no seu negócio? Aponte a câmera:
    </text>
    <text x="${w / 2}" y="${urlY}" text-anchor="middle" font-family="${FONTE}" font-weight="900" font-size="${urlSize}" fill="${VERDE}">
      ifree.app.br
    </text>
  </svg>`;
}

/** Lockup horizontal (ícone + wordmark lado a lado, sem tagline) — mesma
 * proporção interna de svgHorizontal em gerar-kit-marca.tsx (viewBox
 * 900×220), reaproveitada como grupo escalável. */
function lockupHorizontal(larguraAlvo: number): { svg: string; larguraUsada: number } {
  const escala = larguraAlvo / 350; // 350 ≈ ponto onde o texto "FREE" termina no viewBox 900×220
  return {
    svg: `
      <g transform="translate(10,25) scale(1.5)">${pecasIcone(TINTA)}</g>
      <text x="222" y="130" font-family="${FONTE}" font-weight="900" font-size="118" letter-spacing="-3">
        <tspan fill="${VERDE}">i</tspan><tspan fill="${BRANCO}" opacity="0.92">FREE</tspan>
      </text>
    `,
    larguraUsada: 350 * escala,
  };
}

/** Papel de parede da tela inicial — precisa ficar visualmente quieto no
 * meio, onde os ícones de app do Android vão sentar em cima; a marca fica
 * discreta, encostada no canto superior esquerdo (longe da grade central
 * de ícones e do dock inferior), crescendo pra dentro do canvas — nunca
 * pra fora da borda. */
function svgFundoTela(dim: Dimensoes): string {
  const { w, h } = dim;
  const escala = Math.min(w, h) / 1080;
  const watermarkTam = Math.min(w, h) * 0.9;

  const margem = escala * 48;
  const lockupLargura = escala * 220;
  const lockup = lockupHorizontal(lockupLargura);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${NAVY_CLARO}" />
        <stop offset="1" stop-color="${NAVY}" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#fundo)" />

    <g transform="translate(${w / 2 - watermarkTam / 2}, ${h / 2 - watermarkTam / 2}) scale(${watermarkTam / 120})">
      ${iconeSilhueta(0.035)}
    </g>

    <g transform="translate(${margem}, ${margem}) scale(${lockupLargura / 350})">
      ${lockup.svg}
    </g>
  </svg>`;
}

async function pngExato(svg: string, w: number, h: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 300 })
    .resize({ width: w, height: h, fit: "fill" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function main() {
  const qr = await qrDataUri();

  for (const dim of [VISIONTAB, GALAXY_P355M]) {
    const protetor = svgProtetorTela(dim, qr);
    const fundo = svgFundoTela(dim);

    const arquivoProtetor = await pngExato(protetor, dim.w, dim.h);
    const arquivoFundo = await pngExato(fundo, dim.w, dim.h);

    await escrever(`protetor-tela-${dim.nome}-${dim.w}x${dim.h}.jpg`, arquivoProtetor);
    await escrever(`fundo-tela-${dim.nome}-${dim.w}x${dim.h}.jpg`, arquivoFundo);
  }

  console.log("OK:", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
