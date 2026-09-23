"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza a tela sozinha a cada N ms, sem recarregar a página (via
 * router.refresh(), que só busca dados novos do servidor — o estado local
 * dos componentes cliente, tipo QR code já gerado ou seleção de
 * checkboxes, continua intacto). Usado em /dashboard e /pagamentos pra
 * quem deixa a tela aberta acompanhando em tempo real: turnos abrindo,
 * PIX automático confirmando, depósito caindo. */
export default function AutoRefresh({ intervaloMs = 5_000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return null;
}
