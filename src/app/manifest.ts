import type { MetadataRoute } from "next";

/** Manifest do painel (dono/empresa cliente) — permite "Adicionar à tela
 * inicial" no celular do dono/gestor, diferente do manifest dinâmico do
 * totem (src/app/t/[token]/manifest.webmanifest/route.ts, kiosk fullscreen
 * por token). Aqui é "standalone" (mantém o app instalável, mas sem forçar
 * fullscreen) e escopo é o site inteiro. Ícone próprio "iFREE Empresas"
 * (azul, arte mandada pelo Thiago em 2026-09-30) — NÃO reaproveita
 * /brand/icones-app/icon-512.png porque esse arquivo também alimenta
 * LogoIcon (src/components/Logo.tsx), usado no site inteiro (inclusive a
 * home pública); teria trocado a logo do site inteiro pra azul junto. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iFREE",
    short_name: "iFREE",
    description: "Sua hora, seu jeito, seu dinheiro na hora. Controle de freelancers/extras, do check-in ao PIX.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Preto pra casar com a arte de splash nova (ver SplashScreen.tsx) —
    // esse background_color é o que o Android pinta ANTES do JS carregar;
    // deixar branco aqui criaria um flash branco->preto na abertura.
    background_color: "#000000",
    theme_color: "#00C896",
    icons: [
      { src: "/brand/icones-app/icon-empresas-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icones-app/icon-empresas-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/icones-app/icon-empresas-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
