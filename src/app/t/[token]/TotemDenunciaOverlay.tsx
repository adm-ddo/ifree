"use client";

import { useEffect, useState } from "react";
import TotemNovaDenunciaForm from "./TotemNovaDenunciaForm";
import TotemAcompanharPanel from "./TotemAcompanharPanel";
import { gerarQrCodeDenuncia } from "./actions";

type Tela = "menu" | "nova" | "acompanhar";

// Renova um pouco antes dos 5min de validade do QR acabarem (ver
// QR_DENUNCIA_TTL_SEGUNDOS em src/lib/etica.ts), pra quem fica olhando o
// menu sempre ver um código ainda válido, sem precisar apertar nada.
const QR_RENOVACAO_MS = 4 * 60 * 1000;

/** QR code de validade curta pra continuar a denúncia no próprio celular
 * — pra quem prefere não usar o tablet compartilhado. Só aparece no menu
 * (não faz sentido nas telas de formulário/acompanhamento). Sem nada
 * salvo no banco: cada geração é só uma função pura (gerarQrCodeDenuncia),
 * então renovar sozinho de tempos em tempos não tem custo nenhum. */
function QrDenunciaBox({ tokenDenuncia }: { tokenDenuncia: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const resultado = await gerarQrCodeDenuncia(tokenDenuncia);
      if (!cancelado) setDataUrl(resultado.dataUrl);
    }
    carregar();
    const id = setInterval(carregar, QR_RENOVACAO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [tokenDenuncia]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2 border-t border-stone-200 pt-4 mt-1">
      <p className="text-sm text-stone-500 text-center">
        Prefere fazer pelo seu celular, com calma? Escaneie o QR code:
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada na hora, não é asset estático pro next/image otimizar */}
      <img src={dataUrl} alt="QR code para continuar a denúncia pelo celular" className="w-40 h-40" />
      <p className="text-xs text-stone-400 text-center">
        Expira em alguns minutos — se não der tempo, é só voltar aqui e escanear de novo.
      </p>
    </div>
  );
}

/** Hub da denúncia embutido no totem — abre por cima da tela de check-in
 * (nunca navega pra fora) porque o tablet é compartilhado: se algum botão
 * levasse pra /denuncia/[token] normal, o tablet ficaria "preso" lá até
 * alguém lembrar de voltar manualmente, travando o check-in de todo mundo
 * depois. Por isso "fazer denúncia" e "acompanhar" (e a volta de cada um)
 * só trocam a variável `tela` deste componente — aoVoltar (prop, do
 * TotemFlow) só é chamado quando a pessoa realmente quer sair de volta
 * pro check-in. */
export default function TotemDenunciaOverlay({
  tokenDenuncia,
  aoVoltar,
}: {
  tokenDenuncia: string;
  aoVoltar: () => void;
}) {
  const [tela, setTela] = useState<Tela>("menu");

  if (tela === "nova") {
    return (
      <TotemNovaDenunciaForm
        tokenDenuncia={tokenDenuncia}
        aoVoltar={() => setTela("menu")}
        aoConcluir={aoVoltar}
      />
    );
  }

  if (tela === "acompanhar") {
    return <TotemAcompanharPanel tokenDenuncia={tokenDenuncia} aoVoltar={aoVoltar} />;
  }

  return (
    <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
      <h1 className="text-2xl font-semibold text-navy-900 text-center">Canal de Ética</h1>
      <p className="text-lg text-stone-600 text-center">
        Canal confidencial pra relatar assédio, discriminação, riscos à
        sua saúde/segurança no trabalho ou qualquer outra irregularidade.
      </p>

      <button
        type="button"
        onClick={() => setTela("nova")}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 transition-colors"
      >
        📢 Fazer uma denúncia
      </button>
      <button
        type="button"
        onClick={() => setTela("acompanhar")}
        className="rounded-lg border border-stone-300 text-xl font-medium py-4 hover:bg-stone-50 transition-colors"
      >
        🔍 Já denunciei, quero acompanhar
      </button>

      <QrDenunciaBox tokenDenuncia={tokenDenuncia} />

      <button type="button" onClick={aoVoltar} className="text-lg text-stone-500 hover:text-stone-700 underline">
        Voltar ao check-in
      </button>
    </div>
  );
}
