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

/** Sobe um arquivo de verdade escolhido no picker do sistema operacional
 * (ex.: scan de advertência assinada, modelo de papel próprio da
 * empresa) — diferente de uploadDataUrl, que espera uma data URL vinda
 * de canvas (câmera/assinatura do totem). Next.js aceita `File` nativo
 * dentro de FormData em server actions, então quem chama só precisa de
 * `formData.get("arquivo") as File` num `<form action={...}>` com
 * `<input type="file" name="arquivo">`, sem plumbing extra no client. */
export async function uploadArquivo(caminho: string, arquivo: File): Promise<string> {
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const blob = await put(caminho, buffer, {
    access: "private",
    contentType: arquivo.type || "application/octet-stream",
    addRandomSuffix: true,
  });

  return blob.url;
}

const EXTENSAO_POR_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

/** Devolve a extensão de arquivo (com ponto) correspondente a um
 * content-type salvo no upload — usada na hora do download pra devolver
 * o modelo de papel customizado no mesmo formato em que a empresa
 * enviou (.pdf, .doc/.docx etc.), em vez de um arquivo sem extensão que
 * o navegador não sabe identificar. Content-type sem mapeamento
 * conhecido devolve string vazia (sem extensão, mesmo comportamento de
 * antes) — o Content-Type da resposta continua correto de qualquer
 * forma. */
export function extensaoPorContentType(contentType: string): string {
  return EXTENSAO_POR_CONTENT_TYPE[contentType] ?? "";
}

/** Baixa um blob privado e devolve pra exibição inline (`<img src=...>`),
 * diferente de baixarComoResponse (que força download). Cache privado e
 * curto no navegador — é uma foto de pessoa real, não deveria virar
 * cacheável por CDN/proxy intermediário. */
export async function servirComoImagem(url: string): Promise<Response> {
  const resultado = await get(url, { access: "private" });
  if (!resultado?.stream) {
    throw new Error("Não foi possível carregar a imagem.");
  }
  const contentType = resultado.blob.contentType || "image/png";
  return new Response(resultado.stream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

/** Serve um blob privado como download direto (scan assinado, modelo de
 * papel customizado) — diferente de baixarComoDataUrl, que é pra embutir
 * em PDF/HTML; aqui o arquivo pode ser grande (PDF de várias páginas),
 * então evita inflar em base64. Só quem já passou pela checagem de posse
 * do recurso (ownership check na rota) chega a chamar isso.
 *
 * `disposicao: "inline"` faz o navegador exibir o arquivo (imagem/PDF)
 * direto na aba em vez de baixar — mesmo endpoint, só troca o cabeçalho;
 * o padrão continua "attachment" pra não mudar o comportamento de quem já
 * usa isto pra baixar de verdade (ex.: modelo de papel customizado). */
export async function baixarComoResponse(
  url: string,
  nomeArquivo: string,
  disposicao: "attachment" | "inline" = "attachment"
): Promise<Response> {
  const resultado = await get(url, { access: "private" });
  if (!resultado?.stream) {
    throw new Error("Não foi possível carregar o arquivo.");
  }
  const contentType = resultado.blob.contentType || "application/octet-stream";
  return new Response(resultado.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposicao}; filename="${nomeArquivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
