"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogoIcon } from "@/components/Logo";

/** Boundary de erro pra toda rota abaixo do layout raiz. Sem isso, qualquer
 * exceção não tratada numa página cai na tela genérica do Next — feia,
 * sem marca, sem explicação. Aqui a pessoa vê algo com cara do sistema e
 * um jeito claro de tentar de novo, sem precisar recarregar a aba na mão.
 *
 * "Tentar de novo" dá reload de verdade (window.location.reload), não o
 * reset() que o Next passa pra cá — reset() só manda re-renderizar o MESMO
 * componente com o MESMO estado do processo/conexão que já falhou, então
 * numa falha que persiste (não um erro de digitação de dado, e sim algo
 * tipo conexão momentânea) ele reproduz o erro de novo sem visivelmente
 * mudar nada na tela — parece que o botão "não faz nada". Reportado pelo
 * Thiago em 2026-09-22: só um F5 de verdade resolvia. reload() força uma
 * request nova do zero (mesmo efeito do F5 que ele já confirmou que
 * funciona), então usa isso direto em vez de reset(). */
export default function ErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro não tratado numa página:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16 gap-4">
      <LogoIcon size={44} />
      <h1 className="text-xl font-semibold text-navy-900">
        Algo deu errado por um instante
      </h1>
      <p className="text-stone-600 text-sm max-w-sm">
        Não foi um problema com os seus dados — foi uma falha momentânea de
        conexão. Tenta de novo; se persistir, avisa o suporte.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Tentar de novo
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-stone-300 text-stone-700 px-4 py-2 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Ir pro painel
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-stone-400 mt-2">Código: {error.digest}</p>
      )}
    </div>
  );
}
