"use client";

import { useState, useTransition } from "react";
import { gerarCobrancaMensalidade } from "./actions";

export default function GerarPixForm({
  empresaId,
  cobrancaInicial,
}: {
  empresaId: number;
  cobrancaInicial: { qrCode: string; qrCodeImagemUrl: string | null; expiraEm: string } | null;
}) {
  const [cobranca, setCobranca] = useState(cobrancaInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pending, startTransition] = useTransition();

  function gerar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await gerarCobrancaMensalidade(empresaId);
      if (!resultado) return;
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      setCobranca(resultado);
    });
  }

  async function copiar() {
    if (!cobranca) return;
    await navigator.clipboard.writeText(cobranca.qrCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (cobranca) {
    return (
      <div className="flex flex-col gap-3">
        {cobranca.qrCodeImagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cobranca.qrCodeImagemUrl}
            alt="QR code do PIX"
            className="mx-auto w-48 h-48 rounded-lg border border-stone-200"
          />
        )}
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Pix copia e cola
          <textarea
            readOnly
            value={cobranca.qrCode}
            rows={3}
            className="border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono text-stone-700 resize-none"
            onFocus={(e) => e.target.select()}
          />
        </label>
        <button
          type="button"
          onClick={copiar}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
        >
          {copiado ? "Copiado!" : "Copiar código"}
        </button>
        <p className="text-xs text-stone-500 text-center">
          Assim que o pagamento cair, esta tela libera sozinha.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={gerar}
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Gerando..." : "Gerar PIX da mensalidade"}
      </button>
    </div>
  );
}
