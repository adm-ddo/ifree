"use client";

import { useEffect, useRef, useState } from "react";

/** Ativa o "modo kiosk" no navegador: mantém a tela acesa (Wake Lock),
 * bloqueia seleção de texto/menu de contexto/pull-to-refresh, e oferece um
 * botão pra entrar em tela cheia (não dá pra forçar isso sem toque da
 * pessoa — é limitação de segurança do navegador, não dá pra contornar).
 *
 * Isso reduz atrito acidental num tablet fixo, mas NÃO é a proteção real
 * contra alguém sair do app — essa parte é o "fixar tela" do próprio
 * Android/iOS (ver instruções passadas separadamente pro dono). */
export default function TotemKioskGuard() {
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // classe no <html> pra escopar as regras de CSS do modo kiosk só nas
  // rotas do totem (ver globals.css), sem afetar o painel administrativo.
  useEffect(() => {
    document.documentElement.classList.add("totem-kiosk");
    return () => document.documentElement.classList.remove("totem-kiosk");
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function pedirWakeLock() {
      try {
        const sentinel = await navigator.wakeLock?.request("screen");
        if (cancelado) {
          sentinel?.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel ?? null;
      } catch {
        // Sem suporte no navegador, ou negado — segue sem travar a tela.
      }
    }

    pedirWakeLock();

    // O wake lock é liberado sozinho quando a aba perde visibilidade —
    // precisa pedir de novo quando ela volta a ficar visível.
    function aoMudarVisibilidade() {
      if (document.visibilityState === "visible") pedirWakeLock();
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    function aoMudarTelaCheia() {
      setEmTelaCheia(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    aoMudarTelaCheia();
    return () => document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
  }, []);

  useEffect(() => {
    function bloquearMenu(e: Event) {
      e.preventDefault();
    }
    document.addEventListener("contextmenu", bloquearMenu);
    return () => document.removeEventListener("contextmenu", bloquearMenu);
  }, []);

  // Garante que o campo em foco não fique escondido atrás do teclado
  // virtual — nem todo navegador reduz a área da página quando o teclado
  // abre, então rolamos o campo pra dentro da vista como reforço.
  useEffect(() => {
    function aoFocar(e: FocusEvent) {
      const alvo = e.target;
      if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement)) return;
      // espera o teclado terminar de abrir antes de rolar, senão a posição
      // calculada fica errada (a tela ainda não reduziu de tamanho)
      setTimeout(() => {
        alvo.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 300);
    }
    document.addEventListener("focusin", aoFocar);
    return () => document.removeEventListener("focusin", aoFocar);
  }, []);

  if (emTelaCheia) return null;

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }}
      className="fixed bottom-3 right-3 z-20 rounded-full bg-navy-900/80 text-white text-xs px-3 py-2 shadow-lg"
    >
      ⛶ Tela cheia
    </button>
  );
}
