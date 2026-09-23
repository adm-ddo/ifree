import type { MetadataRoute } from "next";

/** Manifest do painel (dono/empresa cliente) — permite "Adicionar à tela
 * inicial" no celular do dono/gestor, diferente do manifest dinâmico do
 * totem (src/app/t/[token]/manifest.webmanifest/route.ts, kiosk fullscreen
 * por token). Aqui é "standalone" (mantém o app instalável, mas sem forçar
 * fullscreen) e escopo é o site inteiro. Os ícones são os mesmos PNGs em
 * alta resolução usados no totem/apple-icon (ver public/brand/icones-app/),
 * garantindo que o ícone/splash gerado pelo Android use a arte real, não o
 * SVG (que alguns Android renderizam borrado como maskable). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iFREE",
    short_name: "iFREE",
    description: "Sua hora, seu jeito, seu dinheiro na hora. Controle de freelancers/extras, do check-in ao PIX.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#00C896",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/icones-app/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icones-app/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icones-app/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
