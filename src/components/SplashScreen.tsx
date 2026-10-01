"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DURACAO_VISIVEL_MS = 900;
const DURACAO_FADE_MS = 300;

/** Mostra a arte "iFREE Empresas" azul (public/splash-ifree-empresas.webp)
 * — mesma arte do ícone do app (ver manifest.ts) — pra não ficar o ícone
 * azul na tela inicial e, ao abrir, piscar uma splash verde (pedido do
 * Thiago em 2026-09-30: "não fica o ícone azul da empresa e aí quando o
 * app entra muda pra aquela tela verde, vamos manter só esse logo pra
 * empresa"). Aparece em tela cheia por um instante quando o painel é
 * aberto como app instalado no celular
 * (display-mode: standalone/PWA "Adicionar à tela inicial") — é o pedido
 * do Thiago de ter essa imagem na abertura do app dos clientes-empresa.
 * Só existe display-mode standalone quando o manifest raiz (src/app/
 * manifest.ts) está instalado; numa aba de navegador comum isso nunca
 * dispara, então não incomoda quem só acessa pelo browser.
 *
 * Mesma lista de rotas excluídas do ChromeGate (totem/manual/conecta/
 * pitch/portal) — são experiências próprias, sem relação com o painel do
 * dono/empresa cliente. */
export default function SplashScreen() {
  const pathname = usePathname();
  const [fase, setFase] = useState<"oculta" | "visivel" | "saindo">("oculta");

  const rotaExcluida =
    pathname?.startsWith("/t/") ||
    pathname?.startsWith("/manual") ||
    pathname?.startsWith("/conecta") ||
    pathname?.startsWith("/pitch") ||
    pathname?.startsWith("/portal");

  useEffect(() => {
    if (rotaExcluida) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    // setFase("visivel") entra num setTimeout(0) em vez de rodar direto no
    // corpo do efeito — evita disparar um novo render síncrono de dentro do
    // efeito (regra react-hooks/set-state-in-effect), sem mudar o
    // comportamento visível (a troca ainda acontece essencialmente na hora).
    const t0 = setTimeout(() => setFase("visivel"), 0);
    const t1 = setTimeout(() => setFase("saindo"), DURACAO_VISIVEL_MS);
    const t2 = setTimeout(() => setFase("oculta"), DURACAO_VISIVEL_MS + DURACAO_FADE_MS);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rotaExcluida || fase === "oculta") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity ease-out ${
        fase === "saindo" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${DURACAO_FADE_MS}ms` }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- splash some
          por menos de 1s, antes do app React terminar de montar; não vale
          a pena puxar o pipeline de otimização do next/image pra isso */}
      <img
        src="/splash-ifree-empresas.webp"
        alt=""
        className="w-full max-w-md px-8"
      />
    </div>
  );
}
