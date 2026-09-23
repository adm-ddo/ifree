"use client";

import { useState, useTransition } from "react";
import { gerarCobrancaMensalidade } from "./actions";
import AutoRefresh from "@/components/AutoRefresh";
import SeloAsaas from "@/components/SeloAsaas";
import type { StatusCobranca } from "@/generated/prisma/enums";

export default function GerarPixForm({
  empresaId,
  proximoVencimentoLabel,
  cobrancaInicial,
  ultimaCobranca,
}: {
  empresaId: number;
  proximoVencimentoLabel: string | null;
  cobrancaInicial: {
    idTransacaoExterna: string;
    qrCode: string;
    qrCodeImagemUrl: string | null;
    expiraEm: string;
  } | null;
  /// Última cobrança da empresa (QUALQUER status), atualizada a cada
  /// refresh da página (ver AutoRefresh) — usada só pra detectar se o Pix
  /// que ESTA tela está mostrando (`cobranca.idTransacaoExterna`) é o mesmo
  /// que acabou de ser confirmado, comparando por id em vez de "sumiu da
  /// pendência" (que dispararia até antes de qualquer refresh acontecer,
  /// já que `cobrancaInicial` só reflete o estado no carregamento).
  ultimaCobranca: { idTransacaoExterna: string | null; status: StatusCobranca } | null;
}) {
  const [cobranca, setCobranca] = useState(cobrancaInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmado =
    Boolean(cobranca) &&
    ultimaCobranca?.idTransacaoExterna === cobranca?.idTransacaoExterna &&
    ultimaCobranca?.status === "PAGA";

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

  if (confirmado) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-700 font-medium text-center">
        ✅ Pagamento confirmado! Assinatura renovada
        {proximoVencimentoLabel ? ` até ${proximoVencimentoLabel}` : ""}.
      </div>
    );
  }

  if (cobranca) {
    return (
      <div className="flex flex-col gap-3">
        {/* Precisa estar aqui (não em page.tsx) — "Gerar PIX" é uma ação
         * client-side que só atualiza este componente via setCobranca,
         * sem re-renderizar o Server Component pai. Decidir o AutoRefresh
         * lá em cima olharia pro estado de ANTES do clique (sem cobrança
         * nenhuma ainda) e nunca chegaria a montar — foi exatamente por
         * isso que a tela ficava "congelada" depois de gerar o Pix. */}
        <AutoRefresh intervaloMs={5000} />
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          ⏳ Aguardando confirmação do Pix — a tela atualiza sozinha assim
          que cair.
        </p>
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
        <SeloAsaas porte="pequeno" className="self-center" />
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
