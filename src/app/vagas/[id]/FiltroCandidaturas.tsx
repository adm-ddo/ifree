"use client";

import { useState, type ReactNode } from "react";
import CandidaturaCard from "./CandidaturaCard";

type Item = {
  id: number;
  status: "ENVIADA" | "ACEITA" | "RECUSADA";
  match: boolean;
  criadoEm: Date;
  conversaId: number | null;
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
export default function FiltroCandidaturas({ vagaId, itens }: { vagaId: number; itens: Item[] }) {
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const temMatch = itens.some((i) => i.match);
  const visiveis = mostrarTodas || !temMatch ? itens : itens.filter((i) => i.match);

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
            : `Mostrar todas as candidaturas (${itens.length})`}
        </button>
      )}

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma candidatura ainda.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visiveis.map((c) => (
            <CandidaturaCard
              key={c.id}
              vagaId={vagaId}
              candidatura={{ id: c.id, status: c.status, match: c.match, criadoEm: c.criadoEm }}
              conversaId={c.conversaId}
              pessoa={c.pessoa}
              reputacaoCard={c.reputacaoCard}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
