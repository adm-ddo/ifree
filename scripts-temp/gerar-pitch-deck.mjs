import pptxgen from "pptxgenjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== Paleta da marca =====
const NAVY = "0D1B2A";
const NAVY_CLARO = "16304A";
const VERDE = "00C896";
const VERDE_ESCURO = "00815F";
const VERDE_SOFT = "E1F7EF";
const BRANCO = "FFFFFF";
const TINTA = "14171A";
const CINZA = "525C68";
const CINZA_CLARO = "8A93A0";
const LINHA = "DCE1E7";

const FONTE = "Arial";

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "iFREE";
pptx.company = "iFREE";
pptx.title = "iFREE — Apresentação para investidores";

const W = 13.333;
const H = 7.5;
const MARGEM = 0.7;

// ===================== Helpers =====================

function fundoNavy(slide) {
  slide.background = { color: NAVY };
}

function fundoBranco(slide) {
  slide.background = { color: BRANCO };
}

/** Selo do ícone iFREE — um círculo verde com "i" navy dentro, aproximação
 * simples do ícone real (relógio+asa) que fica boa em qualquer resolução
 * de tela sem depender de imagem externa. */
function logoSelo(slide, { x, y, tamanho = 0.5, corFundo = VERDE, corTexto = NAVY }) {
  slide.addShape(pptx.shapes.OVAL, {
    x, y, w: tamanho, h: tamanho,
    fill: { color: corFundo },
    line: { type: "none" },
  });
  slide.addText("i", {
    x, y, w: tamanho, h: tamanho,
    fontFace: FONTE, fontSize: tamanho * 34, bold: true, color: corTexto,
    align: "center", valign: "middle",
  });
}

function wordmark(slide, { x, y, tamanho = 28, corBase = BRANCO }) {
  slide.addText(
    [
      { text: "i", options: { color: VERDE, bold: true } },
      { text: "FREE", options: { color: corBase, bold: true } },
    ],
    { x, y, w: 3, h: tamanho / 40 + 0.3, fontFace: FONTE, fontSize: tamanho, valign: "middle" }
  );
}

/** Rodapé discreto padrão de todo slide de conteúdo (exceto capa/fechamento). */
function rodape(slide, numero, corTexto = CINZA_CLARO) {
  logoSelo(slide, { x: MARGEM, y: H - 0.55, tamanho: 0.26, corFundo: VERDE, corTexto: NAVY });
  slide.addText("iFREE", {
    x: MARGEM + 0.32, y: H - 0.57, w: 1.5, h: 0.3,
    fontFace: FONTE, fontSize: 11, bold: true, color: corTexto, valign: "middle",
  });
  slide.addText(String(numero).padStart(2, "0"), {
    x: W - MARGEM - 0.5, y: H - 0.57, w: 0.5, h: 0.3,
    fontFace: FONTE, fontSize: 11, color: corTexto, align: "right", valign: "middle",
  });
}

/** Cabeçalho padrão dos slides de conteúdo: eyebrow + título grande. */
function cabecalho(slide, { eyebrow, titulo, corEyebrow = VERDE_ESCURO, corTitulo = NAVY, larguraTitulo = 11.9 }) {
  slide.addText(eyebrow.toUpperCase(), {
    x: MARGEM, y: 0.55, w: larguraTitulo, h: 0.35,
    fontFace: FONTE, fontSize: 13, bold: true, color: corEyebrow, charSpacing: 2,
  });
  slide.addText(titulo, {
    x: MARGEM, y: 0.88, w: larguraTitulo, h: 0.9,
    fontFace: FONTE, fontSize: 30, bold: true, color: corTitulo,
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: MARGEM, y: 1.72, w: 0.55, h: 0.045,
    fill: { color: VERDE }, line: { type: "none" },
  });
}

// ===================== Slide 1 — Capa =====================
{
  const s = pptx.addSlide();
  fundoNavy(s);

  // marca d'água sutil: anel grande no canto
  s.addShape(pptx.shapes.OVAL, {
    x: 8.7, y: -2.2, w: 7, h: 7,
    fill: { type: "none" }, line: { color: VERDE_ESCURO, width: 1.4, transparency: 70 },
  });
  s.addShape(pptx.shapes.OVAL, {
    x: 9.6, y: -1.3, w: 5.2, h: 5.2,
    fill: { type: "none" }, line: { color: VERDE, width: 1, transparency: 80 },
  });

  logoSelo(s, { x: MARGEM, y: 0.9, tamanho: 0.62 });
  wordmark(s, { x: MARGEM + 0.75, y: 0.83, tamanho: 30 });

  s.addText("O controle de quem trabalha\npra você, na palma da mão.", {
    x: MARGEM, y: 2.75, w: 10.8, h: 2.1,
    fontFace: FONTE, fontSize: 42, bold: true, color: BRANCO, lineSpacingMultiple: 1.08,
  });
  s.addText([
    { text: "Extras e funcionários — do check-in ao PIX, ", options: { color: CINZA_CLARO } },
    { text: "sem papel, sem planilha, sem disputa.", options: { color: VERDE } },
  ], {
    x: MARGEM, y: 4.55, w: 9.5, h: 0.6,
    fontFace: FONTE, fontSize: 18,
  });

  s.addText("Apresentação para investidores  ·  2026", {
    x: MARGEM, y: H - 0.95, w: 8, h: 0.4,
    fontFace: FONTE, fontSize: 12, color: CINZA_CLARO,
  });
}

// ===================== Slide 2 — O problema =====================
{
  const s = pptx.addSlide();
  fundoBranco(s);
  cabecalho(s, { eyebrow: "O problema", titulo: "Controlar extras hoje é feito no olho" });

  const dores = [
    ["Papel ou grupo de WhatsApp", "Entrada e saída anotadas à mão, fácil de esquecer ou perder."],
    ["Cálculo manual do valor", "Hora × valor feito de cabeça ou em planilha — sujeito a erro."],
    ["PIX sem comprovação", "Paga-se sem registro de quem trabalhou, quando, e por quanto tempo."],
    ["Disputa de valor", "\"Quanto eu ia receber?\" vira discussão sem nenhum registro pra consultar."],
  ];

  const colW = 5.7, gapX = 0.5, top = 2.15, rowH = 1.15;
  dores.forEach(([titulo, texto], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MARGEM + col * (colW + gapX);
    const y = top + row * (rowH + 0.35);
    s.addShape(pptx.shapes.RECTANGLE, { x, y, w: 0.06, h: rowH, fill: { color: VERDE }, line: { type: "none" } });
    s.addText(titulo, { x: x + 0.3, y, w: colW - 0.3, h: 0.4, fontFace: FONTE, fontSize: 17, bold: true, color: NAVY });
    s.addText(texto, { x: x + 0.3, y: y + 0.42, w: colW - 0.3, h: rowH - 0.42, fontFace: FONTE, fontSize: 13, color: CINZA, lineSpacingMultiple: 1.15 });
  });

  s.addShape(pptx.shapes.RECTANGLE, { x: MARGEM, y: 5.85, w: 11.9, h: 1.05, fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.08 });
  s.addText([
    { text: "O problema não é falta de gente pra contratar — ", options: { color: BRANCO } },
    { text: "é falta de controle de quem já foi contratado.", options: { color: VERDE, bold: true } },
  ], {
    x: MARGEM + 0.4, y: 5.85, w: 11.1, h: 1.05, fontFace: FONTE, fontSize: 18, valign: "middle",
  });

  rodape(s, 2);
}

// ===================== Slide 3 — A solução =====================
{
  const s = pptx.addSlide();
  fundoNavy(s);
  s.addText("A SOLUÇÃO", { x: MARGEM, y: 0.55, w: 11.9, h: 0.35, fontFace: FONTE, fontSize: 13, bold: true, color: VERDE, charSpacing: 2 });
  s.addText("Um tablet na entrada substitui\na planilha e o papel", {
    x: MARGEM, y: 0.88, w: 11.9, h: 1.6, fontFace: FONTE, fontSize: 30, bold: true, color: BRANCO, lineSpacingMultiple: 1.05,
  });

  const passos = [
    ["1", "Bate o CPF", "A pessoa se identifica no tablet — sem app, sem senha, sem depender do celular pessoal."],
    ["2", "Tira uma foto", "Toda entrada e saída fica registrada com foto — prova de quem esteve lá e quando."],
    ["3", "Sistema calcula e paga", "Valor certo na hora, contrato e recibo prontos. Empresa só confirma o PIX."],
  ];
  const colW = 3.7, gap = 0.35, top = 3.0;
  passos.forEach(([n, titulo, texto], i) => {
    const x = MARGEM + i * (colW + gap);
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: top, w: colW, h: 3.1, fill: { color: NAVY_CLARO }, line: { color: "23425F", width: 1 }, rectRadius: 0.12,
    });
    s.addShape(pptx.shapes.OVAL, { x: x + 0.35, y: top + 0.35, w: 0.55, h: 0.55, fill: { color: VERDE }, line: { type: "none" } });
    s.addText(n, { x: x + 0.35, y: top + 0.35, w: 0.55, h: 0.55, fontFace: FONTE, fontSize: 20, bold: true, color: NAVY, align: "center", valign: "middle" });
    s.addText(titulo, { x: x + 0.35, y: top + 1.05, w: colW - 0.7, h: 0.45, fontFace: FONTE, fontSize: 18, bold: true, color: BRANCO });
    s.addText(texto, { x: x + 0.35, y: top + 1.55, w: colW - 0.7, h: 1.4, fontFace: FONTE, fontSize: 12.5, color: CINZA_CLARO, lineSpacingMultiple: 1.2 });
  });

  rodape(s, 3, CINZA_CLARO);
}

// ===================== Slide 4 — Como funciona =====================
{
  const s = pptx.addSlide();
  fundoBranco(s);
  cabecalho(s, { eyebrow: "Como funciona", titulo: "Dois fluxos, um só sistema" });

  const colW = 5.7, gapX = 0.5, top = 2.15;
  const blocos = [
    {
      titulo: "Extra — pago por turno via PIX",
      cor: VERDE_SOFT, corTitulo: VERDE_ESCURO,
      passos: ["Documento + cadastro (1ª vez)", "Foto + escolhe a função", "Lê termos e assina o contrato", "Trabalha", "Foto de saída + assina o recibo", "Valor calculado → PIX manual hoje"],
    },
    {
      titulo: "Funcionário CLT — controle de jornada",
      cor: "EAEDF1", corTitulo: NAVY,
      passos: ["Cadastro feito pela empresa", "Bate entrada com foto", "Intervalo (se configurado)", "Trabalha", "Bate saída com foto", "Nenhum valor exibido em nenhuma etapa"],
    },
  ];
  blocos.forEach((b, i) => {
    const x = MARGEM + i * (colW + gapX);
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: top, w: colW, h: 4.5, fill: { color: b.cor }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(b.titulo, { x: x + 0.35, y: top + 0.3, w: colW - 0.7, h: 0.6, fontFace: FONTE, fontSize: 16, bold: true, color: b.corTitulo });
    b.passos.forEach((p, j) => {
      const y = top + 1.05 + j * 0.53;
      s.addShape(pptx.shapes.OVAL, { x: x + 0.35, y: y + 0.03, w: 0.16, h: 0.16, fill: { color: b.corTitulo }, line: { type: "none" } });
      s.addText(p, { x: x + 0.65, y, w: colW - 1.0, h: 0.42, fontFace: FONTE, fontSize: 12.5, color: TINTA, valign: "middle" });
    });
  });

  rodape(s, 4);
}

// ===================== Slide 5 — Funcionalidades =====================
{
  const s = pptx.addSlide();
  fundoBranco(s);
  cabecalho(s, { eyebrow: "Produto", titulo: "Tudo que uma operação real precisa" });

  const itens = [
    ["Painel em tempo real", "Quem está trabalhando agora, turnos do dia, pendências — tudo ao vivo."],
    ["Freelancers & Funcionários", "Extra pago por PIX e funcionário CLT com controle de jornada, no mesmo sistema."],
    ["Pagamentos & PIX", "Cálculo automático por hora ou diária, pendências claras, marcação de pago."],
    ["Financeiro", "Total devido agora, separado por frequência de pagamento, relatórios por período."],
    ["Relatórios", "Custo por função, por pessoa, por dia/semana/mês — com exportação em PDF."],
    ["Multiempresa & equipe", "Um login gerencia várias empresas; acessos extras sem dividir senha."],
    ["Totens seguros", "Link único por tablet, token criptográfico, revogável a qualquer momento."],
    ["Backup automático 3x/dia", "Cópia completa dos dados, retida por 30 dias, sem intervenção manual."],
  ];

  const cols = 4, rows = 2, colW = 2.85, rowH = 2.15, gapX = 0.18, gapY = 0.25, top = 2.15;
  itens.forEach(([titulo, texto], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = MARGEM + col * (colW + gapX);
    const y = top + row * (rowH + gapY);
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: colW, h: rowH, fill: { color: "F7F8FA" }, line: { color: LINHA, width: 1 }, rectRadius: 0.08 });
    s.addShape(pptx.shapes.OVAL, { x: x + 0.25, y: y + 0.25, w: 0.4, h: 0.4, fill: { color: VERDE_SOFT }, line: { type: "none" } });
    s.addShape(pptx.shapes.OVAL, { x: x + 0.36, y: y + 0.36, w: 0.18, h: 0.18, fill: { color: VERDE_ESCURO }, line: { type: "none" } });
    s.addText(titulo, { x: x + 0.22, y: y + 0.78, w: colW - 0.44, h: 0.55, fontFace: FONTE, fontSize: 13, bold: true, color: NAVY });
    s.addText(texto, { x: x + 0.22, y: y + 1.28, w: colW - 0.44, h: rowH - 1.4, fontFace: FONTE, fontSize: 10.5, color: CINZA, lineSpacingMultiple: 1.15 });
  });

  rodape(s, 5);
}

// ===================== Slide 6 — Diferenciais =====================
{
  const s = pptx.addSlide();
  fundoNavy(s);
  cabecalho(s, { eyebrow: "Diferenciais", titulo: "Por que o iFREE não é só mais um app de ponto", corEyebrow: VERDE, corTitulo: BRANCO });

  const itens = [
    ["Prova, não promessa", "Foto e assinatura em cada entrada e saída — acaba a disputa de \"quanto eu ia receber\"."],
    ["Extra e CLT no mesmo sistema", "Serve quem paga por turno via PIX e quem só precisa controlar jornada de funcionário fixo."],
    ["Pensado pro Brasil", "PIX, CPF e fuso horário brasileiro no núcleo do produto — não é uma adaptação de sistema gringo."],
    ["Construído em cima de uso real", "Cada funcionalidade nasceu de uma operação de verdade rodando, não de suposição de mercado."],
  ];
  const colW = 5.7, gapX = 0.5, top = 2.15, rowH = 1.9;
  itens.forEach(([titulo, texto], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MARGEM + col * (colW + gapX);
    const y = top + row * (rowH + 0.3);
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: colW, h: rowH, fill: { color: NAVY_CLARO }, line: { color: "23425F", width: 1 }, rectRadius: 0.1 });
    s.addText(titulo, { x: x + 0.35, y: y + 0.28, w: colW - 0.7, h: 0.5, fontFace: FONTE, fontSize: 16, bold: true, color: VERDE });
    s.addText(texto, { x: x + 0.35, y: y + 0.82, w: colW - 0.7, h: rowH - 1.0, fontFace: FONTE, fontSize: 13, color: CINZA_CLARO, lineSpacingMultiple: 1.2 });
  });

  rodape(s, 6, CINZA_CLARO);
}

// ===================== Slide 7 — Mercado =====================
{
  const s = pptx.addSlide();
  fundoBranco(s);
  cabecalho(s, { eyebrow: "Mercado", titulo: "Um problema que milhões de negócios sentem todo dia" });

  const cards = [
    ["R$ 495 bi", "faturados por bares e restaurantes no Brasil em 2025 (Abrasel)"],
    ["1,5 milhão", "estabelecimentos de alimentação com CNPJ ativo no Brasil (Receita Federal)"],
    ["R$ 141 bi", "movimentados pelo mercado de eventos no Brasil em 2025 (Abrape)"],
    ["38,5 milhões", "trabalhadores informais no Brasil — o universo de onde vêm os \"extras\" (IBGE/PNAD)"],
  ];
  const colW = 2.85, gapX = 0.18, top = 2.15, cardH = 1.9;
  cards.forEach(([numero, texto], i) => {
    const x = MARGEM + i * (colW + gapX);
    s.addShape(pptx.shapes.RECTANGLE, { x, y: top, w: colW, h: cardH, fill: { color: "F7F8FA" }, line: { type: "none" } });
    s.addShape(pptx.shapes.RECTANGLE, { x, y: top, w: colW, h: 0.06, fill: { color: VERDE }, line: { type: "none" } });
    s.addText(numero, { x: x + 0.2, y: top + 0.25, w: colW - 0.4, h: 0.6, fontFace: FONTE, fontSize: 24, bold: true, color: NAVY });
    s.addText(texto, { x: x + 0.2, y: top + 0.9, w: colW - 0.4, h: cardH - 1.0, fontFace: FONTE, fontSize: 10.5, color: CINZA, lineSpacingMultiple: 1.15 });
  });

  s.addText("Do bar de bairro à rede de eventos: qualquer negócio que contrata gente por turno, diária ou jornada fixa é cliente em potencial. Começamos por food service e eventos — o resto do mercado (varejo, construção, indústria) vem depois.", {
    x: MARGEM, y: 4.5, w: 11.9, h: 1.0, fontFace: FONTE, fontSize: 14, color: NAVY, lineSpacingMultiple: 1.3, italic: true,
  });

  s.addShape(pptx.shapes.RECTANGLE, { x: MARGEM, y: 5.75, w: 11.9, h: 1.1, fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.08 });
  s.addText([
    { text: "TAM: ", options: { bold: true, color: VERDE } },
    { text: "food service + eventos no Brasil.  ", options: { color: BRANCO } },
    { text: "SAM: ", options: { bold: true, color: VERDE } },
    { text: "negócios que já contratam extra hoje.  ", options: { color: BRANCO } },
    { text: "SOM: ", options: { bold: true, color: VERDE } },
    { text: "restaurantes, bares e produtoras de eventos de médio porte.", options: { color: BRANCO } },
  ], { x: MARGEM + 0.35, y: 5.75, w: 11.2, h: 1.1, fontFace: FONTE, fontSize: 13, valign: "middle" });

  rodape(s, 7);
}

// ===================== Slide 8 — Tração =====================
{
  const s = pptx.addSlide();
  fundoBranco(s);
  cabecalho(s, { eyebrow: "Tração", titulo: "Não é protótipo — está rodando de verdade" });

  const marcos = [
    ["Em produção real", "Sistema processando check-ins, turnos e pagamentos de verdade, todos os dias, desde agosto de 2026."],
    ["5 empresas em piloto simultâneo", "Teste ao vivo em 5 operações diferentes já neste fim de semana — dados reais chegando de vários perfis de negócio ao mesmo tempo."],
    ["Dois modelos validados", "Extras pagos por PIX e funcionários CLT com controle de jornada rodando lado a lado, no mesmo cliente."],
  ];
  const colW = 3.7, gap = 0.35, top = 2.2;
  marcos.forEach(([titulo, texto], i) => {
    const x = MARGEM + i * (colW + gap);
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: top, w: colW, h: 3.1, fill: { color: VERDE_SOFT }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(titulo, { x: x + 0.3, y: top + 0.3, w: colW - 0.6, h: 0.85, fontFace: FONTE, fontSize: 17, bold: true, color: VERDE_ESCURO, lineSpacingMultiple: 1.05 });
    s.addText(texto, { x: x + 0.3, y: top + 1.25, w: colW - 0.6, h: 1.7, fontFace: FONTE, fontSize: 12.5, color: TINTA, lineSpacingMultiple: 1.25 });
  });

  s.addText("Cada linha de produto deste material nasceu de um problema visto de perto numa operação de verdade — não de uma hipótese de mercado.", {
    x: MARGEM, y: 5.65, w: 11.9, h: 0.7, fontFace: FONTE, fontSize: 13, italic: true, color: CINZA,
  });

  rodape(s, 8);
}

// ===================== Slide 9 — Modelo de negócio =====================
{
  const s = pptx.addSlide();
  fundoNavy(s);
  cabecalho(s, { eyebrow: "Modelo de negócio", titulo: "Receita recorrente, por totem ativo", corEyebrow: VERDE, corTitulo: BRANCO });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: MARGEM, y: 2.15, w: 5.9, h: 4.4, fill: { color: VERDE }, line: { type: "none" }, rectRadius: 0.12 });
  s.addText("1 totem ativo\n=\n1 mensalidade", { x: MARGEM + 0.4, y: 2.5, w: 5.1, h: 1.7, fontFace: FONTE, fontSize: 26, bold: true, color: NAVY, align: "center", lineSpacingMultiple: 1.1 });
  s.addText("Simples de entender pro cliente, e cresce junto com o negócio dele: mais unidades, mais tablets, mais receita — sem precisar mudar o modelo.", {
    x: MARGEM + 0.4, y: 4.35, w: 5.1, h: 1.9, fontFace: FONTE, fontSize: 14, color: NAVY_CLARO, lineSpacingMultiple: 1.3,
  });

  const pontosX = MARGEM + 6.3;
  const pontos = [
    "Receita previsível — recorrência mensal, não por transação",
    "Escala com o cliente — de 1 totem a redes com dezenas de unidades",
    "Modelo em validação — preço final sendo ajustado com os 5 pilotos atuais",
  ];
  pontos.forEach((p, i) => {
    const y = 2.3 + i * 1.4;
    s.addShape(pptx.shapes.OVAL, { x: pontosX, y: y + 0.06, w: 0.16, h: 0.16, fill: { color: VERDE }, line: { type: "none" } });
    s.addText(p, { x: pontosX + 0.35, y: y - 0.15, w: 5.2, h: 1.1, fontFace: FONTE, fontSize: 14, color: BRANCO, lineSpacingMultiple: 1.25, valign: "top" });
  });

  rodape(s, 9, CINZA_CLARO);
}

// ===================== Slide 10 — Roadmap =====================
{
  const s = pptx.addSlide();
  fundoBranco(s);
  cabecalho(s, { eyebrow: "Visão de futuro", titulo: "Da validação à escala" });

  const fases = [
    ["Agora", "Fechar o piloto com as 5 empresas, validar precificação por totem e coletar os primeiros números de uso real em escala."],
    ["Próximos passos", "PIX automático de verdade (hoje o envio é manual), abrir pra outros segmentos além de food service e eventos."],
    ["Visão de longo prazo", "Certificação oficial de ponto eletrônico (REP-P) como produto à parte, pra quem precisa de validade jurídica plena."],
  ];
  const colW = 3.7, gap = 0.35, top = 2.2;
  fases.forEach(([fase, texto], i) => {
    const x = MARGEM + i * (colW + gap);
    s.addShape(pptx.shapes.OVAL, { x, y: top, w: 0.5, h: 0.5, fill: { color: NAVY }, line: { type: "none" } });
    s.addText(String(i + 1), { x, y: top, w: 0.5, h: 0.5, fontFace: FONTE, fontSize: 18, bold: true, color: VERDE, align: "center", valign: "middle" });
    if (i < fases.length - 1) {
      s.addShape(pptx.shapes.RECTANGLE, { x: x + 0.6, y: top + 0.22, w: colW + gap - 0.7, h: 0.03, fill: { color: LINHA }, line: { type: "none" } });
    }
    s.addText(fase, { x, y: top + 0.7, w: colW, h: 0.5, fontFace: FONTE, fontSize: 16, bold: true, color: NAVY });
    s.addText(texto, { x, y: top + 1.25, w: colW, h: 2.2, fontFace: FONTE, fontSize: 12.5, color: CINZA, lineSpacingMultiple: 1.25 });
  });

  rodape(s, 10);
}

// ===================== Slide 11 — Por que agora =====================
{
  const s = pptx.addSlide();
  fundoNavy(s);
  cabecalho(s, { eyebrow: "Por que agora", titulo: "O momento certo pra esse produto", corEyebrow: VERDE, corTitulo: BRANCO });

  const itens = [
    ["PIX já é hábito nacional", "Pagar na hora, direto pro CPF de qualquer um, deixou de ser novidade — é expectativa."],
    ["Fiscalização trabalhista em alta", "Negócios sentem cada vez mais a necessidade de prova e registro, mesmo pra quem é dispensado de ponto formal."],
    ["Informalidade ainda é maioria real", "38,5 milhões de trabalhadores informais no Brasil — e quase nenhum tem um registro digital do seu próprio trabalho."],
    ["Produto já validado em operação", "Não é uma aposta de mercado — é um sistema que já roda, sendo testado por 5 empresas ao mesmo tempo."],
  ];
  const colW = 5.7, gapX = 0.5, top = 2.15, rowH = 1.9;
  itens.forEach(([titulo, texto], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MARGEM + col * (colW + gapX);
    const y = top + row * (rowH + 0.3);
    s.addText(titulo, { x, y, w: colW, h: 0.5, fontFace: FONTE, fontSize: 16, bold: true, color: VERDE });
    s.addText(texto, { x, y: y + 0.5, w: colW, h: rowH - 0.5, fontFace: FONTE, fontSize: 13, color: CINZA_CLARO, lineSpacingMultiple: 1.25 });
  });

  rodape(s, 11, CINZA_CLARO);
}

// ===================== Slide 12 — Fechamento =====================
{
  const s = pptx.addSlide();
  fundoNavy(s);

  s.addShape(pptx.shapes.OVAL, { x: -2, y: 4, w: 7, h: 7, fill: { type: "none" }, line: { color: VERDE_ESCURO, width: 1.4, transparency: 75 } });

  logoSelo(s, { x: MARGEM, y: 0.9, tamanho: 0.55 });
  wordmark(s, { x: MARGEM + 0.68, y: 0.85, tamanho: 26 });

  s.addText("Vamos conversar.", {
    x: MARGEM, y: 2.6, w: 10.5, h: 1.1, fontFace: FONTE, fontSize: 38, bold: true, color: BRANCO,
  });
  s.addText("Buscamos parceiros que acreditem em resolver, de verdade, um problema que 1,5 milhão de negócios brasileiros sentem todo dia.", {
    x: MARGEM, y: 3.75, w: 9.3, h: 1.0, fontFace: FONTE, fontSize: 16, color: CINZA_CLARO, lineSpacingMultiple: 1.3,
  });

  s.addShape(pptx.shapes.RECTANGLE, { x: MARGEM, y: 5.1, w: 0.5, h: 0.04, fill: { color: VERDE }, line: { type: "none" } });
  s.addText("Thiago Dier", { x: MARGEM, y: 5.35, w: 6, h: 0.4, fontFace: FONTE, fontSize: 16, bold: true, color: BRANCO });
  s.addText("thiagodier@gmail.com  ·  ifree.app.br", { x: MARGEM, y: 5.75, w: 6, h: 0.4, fontFace: FONTE, fontSize: 13, color: VERDE });
}

// Fora de public/ de propósito — é material confidencial (pitch de
// investidor), não pode ficar acessível publicamente pelo site.
const destino = path.resolve(
  process.env.USERPROFILE ?? process.env.HOME ?? __dirname,
  "Desktop",
  "iFREE - Pitch Investidores",
  "ifree-pitch-investidores.pptx"
);
await pptx.writeFile({ fileName: destino });
console.log("OK:", destino);
