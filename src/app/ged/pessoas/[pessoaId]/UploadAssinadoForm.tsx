"use client";

import { useTransition, useState, useRef } from "react";
import { uploadDocumentoAssinado, removerArquivoAssinado } from "../../actions";

// Limita o lado maior e comprime como JPEG antes de enviar — foto tirada
// direto da câmera do celular vem em vários MB, e o Server Action do
// Next.js recusa corpo grande (ver bodySizeLimit em next.config.ts). Maior
// que o usado em CameraCapture.tsx (foto de crachá) porque aqui é foto de
// documento assinado — precisa continuar legível em zoom.
const LADO_MAXIMO_PX = 2000;
const QUALIDADE_JPEG = 0.85;

async function comprimirSeImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG)
    );
    if (!blob) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Formato que o navegador não sabe decodificar (ex.: HEIC em algum
    // Android) — manda o original em vez de travar o envio.
    return arquivo;
  }
}

export default function UploadAssinadoForm({
  documentoId,
  jaAnexado,
}: {
  documentoId: number;
  /// Já existe um arquivo assinado anexado a este documento — troca os
  /// botões de "anexar" (primeira vez) por "trocar/remover" (já tem algo
  /// pra gerenciar), e liga a confirmação antes de sobrescrever.
  jaAnexado: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function enviar(arquivo: File) {
    setErro(null);
    startTransition(async () => {
      const arquivoFinal = await comprimirSeImagem(arquivo);
      const dados = new FormData();
      dados.set("arquivo", arquivoFinal);
      const resultado = await uploadDocumentoAssinado(documentoId, dados);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  function remover() {
    if (!confirm("Remover o arquivo assinado anexado? O documento gerado continua existindo, só o comprovante escaneado some.")) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await removerArquivoAssinado(documentoId);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  // Input nativo escondido em vez de exibido: o navegador renderiza
  // "Nenhum arquivo escolhido" com largura variável por sistema/idioma, e
  // isso era o que estourava a linha em telas estreitas. Um botão de
  // largura fixa não tem esse problema — clicar já dispara o seletor do
  // sistema (que no celular inclui câmera/digitalizar).
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (!arquivo) return;
          // Só pede confirmação quando já existia um anexo (ia sobrescrever
          // algo) — na primeira vez, anexar direto sem perguntar nada.
          if (jaAnexado && !confirm(`Substituir o arquivo assinado atual por "${arquivo.name}"? O anterior será perdido.`)) {
            return;
          }
          enviar(arquivo);
        }}
      />

      {jaAnexado ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-stone-300 text-xs px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50 shrink-0"
          >
            {pending ? "Enviando..." : "🔄 Trocar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remover}
            className="rounded-lg border border-red-200 text-red-600 text-xs px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 shrink-0"
          >
            🗑️ Remover
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shrink-0"
        >
          {pending ? "Enviando..." : "📷 Anexar assinado"}
        </button>
      )}

      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
