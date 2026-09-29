"use client";

import { useState, type ReactNode } from "react";
import CandidaturaCard from "./CandidaturaCard";
import type { ExtraMarcadoItem } from "./ExtraMarcadoEmpresa";

type Item = {
  id: number;
  status: "ENVIADA" | "ACEITA" | "RECUSADA";
  match: boolean;
  criadoEm: Date;
  conversaId: number | null;
  extrasMarcados: ExtraMarcadoItem[];
  pessoa: {
    id: number;
    nome: string;
    telefone: string;
    biografia: string | null;
    habilidades: string[];
    vagasDesejadas: string[];
    meiosTransporte: string[];
    fotoDataUrl: string | null;
  };
  reputacaoCard: ReactNode;
};

/** Por padrão só mostra quem deu match — mais limpo pra empresa olhar de
 * cara os candidatos mais aderentes. O toggle revela todo mundo que se
 * candidatou, já que nem todo candidato bom necessariamente preencheu
 * habilidades suficientes pro match bater. */
function CardDaLista({
  vagaId,
  vaga,
  c,
}: {
  vagaId: number;
  vaga: { turnoDia: boolean; turnoNoite: boolean };
  c: Item;
}) {
  return (
    <CandidaturaCard
      vagaId={vagaId}
      vaga={vaga}
      candidatura={{
        id: c.id,
        status: c.status,
        match: c.match,
        criadoEm: c.criadoEm,
        extrasMarcados: c.extrasMarcados,
      }}
      conversaId={c.conversaId}
      pessoa={c.pessoa}
      reputacaoCard={c.reputacaoCard}
    />
  );
}

/** Por padrão só mostra quem deu match — mais limpo pra empresa olhar de
 * cara os candidatos mais aderentes. O toggle revela todo mundo que se
 * candidatou, já que nem todo candidato bom necessariamente preencheu
 * habilidades suficientes pro match bater. Quem foi RECUSADA fica numa
 * seção própria, colapsada, separada da lista ativa (ENVIADA/ACEITA) —
 * pedido do Thiago em 2026-09-29: antes ficava tudo junto na mesma lista,
 * sem jeito de reconsiderar quem tinha sido recusada. */
export default function FiltroCandidaturas({
  vagaId,
  vaga,
  itens,
}: {
  vagaId: number;
  vaga: { turnoDia: boolean; turnoNoite: boolean };
  itens: Item[];
}) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [mostrarRecusados, setMostrarRecusados] = useState(false);

  const ativas = itens.filter((i) => i.status !== "RECUSADA");
  const recusadas = itens.filter((i) => i.status === "RECUSADA");

  const temMatch = ativas.some((i) => i.match);
  const visiveis = mostrarTodas || !temMatch ? ativas : ativas.filter((i) => i.match);

  return (
    <div className="flex flex-col gap-3">
      {temMatch && (
        <button
          type="button"
          onClick={() => setMostrarTodas((v) => !v)}
          className="text-sm text-brand-700 hover:underline self-start"
        >
          {mostrarTodas
            ? "🎯 Mostrar só quem deu match"
            : `Mostrar todas as candidaturas (${ativas.length})`}
        </button>
      )}

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma candidatura ativa no momento.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visiveis.map((c) => (
            <CardDaLista key={c.id} vagaId={vagaId} vaga={vaga} c={c} />
          ))}
        </ul>
      )}

      {recusadas.length > 0 && (
        <div className="mt-2 flex flex-col gap-3 border-t border-stone-200 pt-3">
          <button
            type="button"
            onClick={() => setMostrarRecusados((v) => !v)}
            className="text-sm text-stone-500 hover:underline self-start"
          >
            {mostrarRecusados ? "▾" : "▸"} Recusados ({recusadas.length})
          </button>
          {mostrarRecusados && (
            <ul className="flex flex-col gap-4">
              {recusadas.map((c) => (
                <CardDaLista key={c.id} vagaId={vagaId} vaga={vaga} c={c} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
