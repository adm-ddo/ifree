import { NextResponse } from "next/server";

/** Manifest do Portal do freelancer ("iFREE Conecta") — mesmo espírito do
 * manifest dinâmico do totem (src/app/t/[token]/manifest.webmanifest/route.ts),
 * só que estático (não tem token nenhum aqui) e apontando pra tela de
 * login em vez de pro painel logo de cara: quem "adiciona à tela inicial"
 * a partir do Portal quer um atalho rápido pra entrar, não necessariamente
 * já está logado no aparelho que vai instalar. `scope` fica em todo
 * `/portal` (mais amplo que start_url) pra continuar em modo app depois
 * do login, quando o freelancer navega pro resto do Portal. */
export async function GET() {
  const manifest = {
    name: "iFREE Conecta",
    short_name: "iFREE Conecta",
    description: "Vagas, candidaturas e conversas com empresas que usam o iFREE.",
    start_url: "/portal/entrar",
    scope: "/portal",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#00C896",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/icones-app/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icones-app/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icones-app/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
