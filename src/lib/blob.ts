import "server-only";
import { put, get } from "@vercel/blob";

/** Sobe uma imagem capturada no totem (foto ou assinatura, ambas vêm do
 * client como data URL "data:image/png;base64,...") pro Vercel Blob e
 * devolve a URL. Acesso `private` de propósito — são foto e assinatura de
 * uma pessoa real, não algo que deveria ficar acessível por link público
 * indefinidamente; exibir essas imagens depois (PDF, admin) vai exigir
 * `get()`/URL assinada, não a URL crua. `addRandomSuffix` evita colisão
 * entre dois turnos que caiam no mesmo milissegundo. */
export async function uploadDataUrl(
  caminho: string,
  dataUrl: string
): Promise<string> {
  const [prefixo, base64 = ""] = dataUrl.split(",");
  const contentType = /^data:([^;]+);base64$/.exec(prefixo)?.[1] ?? "image/png";
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(caminho, buffer, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });

  return blob.url;
}

/** Baixa um blob privado (foto ou assinatura) e devolve como data URL, pra
 * embutir em HTML (página de detalhe do turno) ou no PDF do contrato/recibo
 * sem expor a URL crua — só quem já passou por requireTenant() com a
 * checagem de posse do turno chega a essa função. */
export async function baixarComoDataUrl(url: string): Promise<string> {
  const resultado = await get(url, { access: "private" });
  if (!resultado?.stream) {
    throw new Error("Não foi possível carregar a imagem do turno.");
  }
  const buffer = Buffer.from(await new Response(resultado.stream).arrayBuffer());
  const contentType = resultado.blob.contentType || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
