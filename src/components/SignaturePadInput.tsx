"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export default function SignaturePadInput({
  onConfirm,
  confirmLabel = "Confirmar assinatura",
}: {
  onConfirm: (dataUrl: string) => void;
  confirmLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function ajustarTamanho() {
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
    }

    ajustarTamanho();
    const pad = new SignaturePad(canvas, {
      penColor: "#1c1917",
      // traço mais fino, mais parecido com caneta do que com marcador —
      // o dedo nunca vai ter a precisão física de uma ponta de caneta,
      // mas um traço mais fino já parece bem mais fiel ao movimento.
      minWidth: 0.6,
      maxWidth: 1.8,
      // minDistance mais baixo registra mais pontos do traço (o padrão
      // ignora pontos a menos de 5px de distância, o que "corta caminho"
      // em curvas mais lentas/detalhadas, comuns em assinatura com dedo).
      minDistance: 1,
    });
    pad.addEventListener("endStroke", () => setVazio(pad.isEmpty()));
    padRef.current = pad;

    window.addEventListener("resize", ajustarTamanho);
    return () => {
      window.removeEventListener("resize", ajustarTamanho);
      pad.off();
    };
  }, []);

  function limpar() {
    padRef.current?.clear();
    setVazio(true);
  }

  function confirmar() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    onConfirm(pad.toDataURL("image/png"));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <canvas
        ref={canvasRef}
        className="w-full max-w-lg h-56 rounded-xl border-2 border-stone-300 bg-white touch-none"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={limpar}
          className="rounded-xl border border-stone-300 text-lg px-6 py-3 text-stone-700 hover:bg-stone-50"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={vazio}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-lg font-medium px-8 py-3 disabled:opacity-50 transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
