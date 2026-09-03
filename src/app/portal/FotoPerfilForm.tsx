"use client";

import { useState } from "react";
import { atualizarFotoPerfil } from "./actions";
import CameraCapture from "@/components/CameraCapture";

/** Foto é sempre tirada na hora, pela câmera do próprio aparelho — nunca
 * escolhida da galeria — pra empresa saber que é uma foto real e atual da
 * pessoa, mesmo padrão de confiança já usado no totem (CameraCapture.tsx,
 * reaproveitado aqui sem alteração). */
export default function FotoPerfilForm({ fotoDataUrl }: { fotoDataUrl: string | null }) {
  const [preview, setPreview] = useState(fotoDataUrl);
  const [mostrarCamera, setMostrarCamera] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  async function handleCapture(dataUrl: string) {
    setErro(null);
    const resultado = await atualizarFotoPerfil(dataUrl);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      setTentativa((t) => t + 1);
    } else {
      setPreview(dataUrl);
      setMostrarCamera(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, não faz sentido pelo next/image
          <img src={preview} alt="Foto de perfil" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl text-stone-300">👤</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setMostrarCamera(true)}
          className="text-sm text-brand-700 hover:underline self-start"
        >
          {preview ? "📷 Trocar foto" : "📷 Tirar foto"}
        </button>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>

      {mostrarCamera && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4">
            <h2 className="font-semibold text-navy-900 text-sm">Tire sua foto de perfil</h2>
            <CameraCapture key={tentativa} onCapture={handleCapture} />
            <button
              type="button"
              onClick={() => setMostrarCamera(false)}
              className="text-sm text-stone-600 hover:underline self-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
