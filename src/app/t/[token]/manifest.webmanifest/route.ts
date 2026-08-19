import { NextResponse } from "next/server";
import { resolverTotemAtivo } from "@/lib/totem";

/** Manifest dinâmico por totem — cada token tem o próprio, com start_url e
 * scope fixados naquele link específico. É o que faz "Adicionar à tela
 * inicial" no tablet abrir direto nesse totem, em tela cheia, sem barra de
 * endereço — bem mais parecido com um app de verdade do que uma aba de
 * navegador. (O convention especial `app/manifest.ts` do Next só funciona
 * na raiz do app, por isso isso aqui é uma route handler comum.) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const totem = await resolverTotemAtivo(token);
  const nomeEmpresa = totem?.empresaNome ?? "iFREE";

  const manifest = {
    name: `iFREE Totem — ${nomeEmpresa}`,
    short_name: "iFREE Totem",
    description: "Check-in de freelancers/extras via CPF ou CNPJ.",
    start_url: `/t/${token}`,
    scope: `/t/${token}`,
    display: "fullscreen",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#00C896",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, max-age=300",
    },
  });
}
