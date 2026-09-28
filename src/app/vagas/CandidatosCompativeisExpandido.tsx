"use client";

import { useState, useTransition } from "react";
import { buscarMaisCandidatosCompativeis } from "./actions";
import type { BuscarMaisCandidatosResultado } from "./candidatosCompativeis";
import LinhaCandidatoCompativel from "./LinhaCandidatoCompativel";

/** Botão "Buscar mais pessoas compatíveis" abaixo da lista recente
 * (MatchesRecentesBanner.tsx, só últimas 24h) — carrega sob demanda os
 * matches entre 24h e 72h de idade, 10 por página (ver
 * buscarMaisCandidatosCompativeis em ./actions.ts). Fica fechado até o
 * primeiro clique de propósito: a maioria das visitas não precisa disso,
 * não vale a pena consultar o banco toda vez que a tela de vagas carrega. */
export default function CandidatosCompativeisExpandido({ perfilHrefBase }: { perfilHrefBase: string }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<BuscarMaisCandidatosResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function carregar(pagina: number) {
    startTransition(async () => {
      setErro(null);
      try {
        const resultado = await buscarMaisCandidatosCompativeis(pagina);
        setDados(resultado);
      } catch {
        setErro("Não foi possível buscar agora — tenta de novo.");
      }
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAberto(true);
          carregar(1);
        }}
        className="text-xs font-medium text-brand-700 underline self-start"
      >
        🔍 Buscar mais pessoas compatíveis (até 72h de cadastro)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-brand-200 pt-2 mt-1">
      {pending && !dados && <p className="text-xs text-stone-500">Buscando...</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {dados && dados.itens.length === 0 && (
        <p className="text-xs text-stone-500">Nada encontrado entre 24h e 72h de cadastro.</p>
      )}

      {dados && dados.itens.length > 0 && (
        <>
          <ul className="flex flex-col">
            {dados.itens.map((item) => (
              <LinhaCandidatoCompativel key={item.id} item={item} perfilHrefBase={perfilHrefBase} />
            ))}
          </ul>

          {dados.totalPaginas > 1 && (
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                disabled={pending || dados.paginaAtual <= 1}
                onClick={() => carregar(dados.paginaAtual - 1)}
                className="text-brand-700 underline disabled:opacity-40 disabled:no-underline"
              >
                ← Anterior
              </button>
              <span className="text-stone-500">
                Página {dados.paginaAtual} de {dados.totalPaginas}
              </span>
              <button
                type="button"
                disabled={pending || dados.paginaAtual >= dados.totalPaginas}
                onClick={() => carregar(dados.paginaAtual + 1)}
                className="text-brand-700 underline disabled:opacity-40 disabled:no-underline"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
