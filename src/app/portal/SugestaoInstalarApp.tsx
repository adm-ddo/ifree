"use client";

import { useEffect, useState } from "react";

const CHAVE_DISPENSADO = "portal-a2hs-dispensado";

/// Chrome/Android dispara esse evento em vez de instalar direto — dá pra
/// guardar e chamar .prompt() depois, na hora que a pessoa clicar no
/// nosso próprio botão (o navegador não deixa mostrar o prompt nativo sem
/// uma interação explícita). Não existe tipagem oficial no lib.dom ainda.
type EventoAntesDeInstalar = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Sugestão de instalar o Portal como app ("iFREE Conecta", ver
 * manifest.webmanifest/route.ts) — pedido do Thiago em 2026-09-26. Dois
 * caminhos bem diferentes por causa de plataforma:
 * - Android/Chrome: escuta `beforeinstallprompt`, mostra um botão que
 *   chama `.prompt()` — instala de verdade com 1 toque.
 * - iOS/Safari: não existe esse evento, a única forma é manual
 *   (Compartilhar → Adicionar à Tela de Início) — só mostra o texto
 *   explicando o caminho.
 * Nunca aparece se já estiver rodando instalado (modo standalone) nem se
 * a pessoa já dispensou uma vez (localStorage, por aparelho — não é dado
 * que precise sincronizar entre dispositivos). */
export default function SugestaoInstalarApp() {
  const [prompt, setPrompt] = useState<EventoAntesDeInstalar | null>(null);
  const [modo, setModo] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE_DISPENSADO)) return;
    } catch {
      // Storage bloqueado (aba anônima, config do navegador) — segue sem
      // lembrar a dispensa, não é crítico o suficiente pra travar nada.
    }

    const emStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (emStandalone) return;

    const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ehIOS) {
      setModo("ios");
      return;
    }

    function aoPedirInstalacao(e: Event) {
      e.preventDefault();
      setPrompt(e as EventoAntesDeInstalar);
      setModo("android");
    }
    window.addEventListener("beforeinstallprompt", aoPedirInstalacao);
    return () => window.removeEventListener("beforeinstallprompt", aoPedirInstalacao);
  }, []);

  function dispensar() {
    setModo(null);
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      // Idem — só não lembra da próxima vez, sem quebrar nada.
    }
  }

  async function instalar() {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    dispensar();
  }

  if (!modo) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex items-start gap-3">
      <span className="text-2xl shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-800">Instale o iFREE Conecta no seu celular</p>
        {modo === "ios" ? (
          <p className="text-xs text-brand-700 mt-0.5">
            Toque no ícone de <strong>Compartilhar</strong> (o quadrado com a seta pra cima) e depois em{" "}
            <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
          </p>
        ) : (
          <p className="text-xs text-brand-700 mt-0.5">
            Acesso rápido direto da tela inicial, sem precisar abrir o navegador.
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {modo === "android" && (
          <button
            type="button"
            onClick={instalar}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            Instalar
          </button>
        )}
        <button type="button" onClick={dispensar} className="text-xs text-brand-700 underline">
          Agora não
        </button>
      </div>
    </div>
  );
}
