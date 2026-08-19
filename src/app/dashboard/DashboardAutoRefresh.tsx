"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza o dashboard sozinho a cada 30s, sem recarregar a página —
 * pensado pra ficar aberto numa tela mostrando quem está em turno agora em
 * tempo real, sem alguém precisar apertar F5. */
export default function DashboardAutoRefresh({ intervaloMs = 30_000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return null;
}
