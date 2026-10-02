"use client";

import { useState, type ReactNode } from "react";
import CandidaturaCardV2 from "./CandidaturaCardV2";
import type { Sexo, SeloFreelancer } from "@/generated/prisma/enums";
import type { ExtraMarcadoItem } from "@/app/vagas/[id]/ExtraMarcadoEmpresa";

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
    temFoto: boolean;
    sexo: Sexo | null;
    selo: SeloFreelancer;
  };
  reputacaoCard: ReactNode;
};

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
    <CandidaturaCardV2
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

/** Mesma lógica de src/app/vagas/[id]/FiltroCandidaturas.tsx (v1, não
 * tocado), usando CandidaturaCardV2 em vez do card do v1. Quem foi
 * RECUSADA fica numa seção própria colapsada, separada da lista ativa. */
export default function FiltroCandidaturasV2({
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
          className="text-xs font-bold text-brand-700 self-start"
        >
          {mostrarTodas
            ? "🎯 Mostrar só quem deu match"
            : `Mostrar todas as candidaturas (${ativas.length})`}
        </button>
      )}

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma candidatura ativa no momento.</p>
      ) : (
        <ul className="flex flex-col gap-3">
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
            className="text-xs font-bold text-stone-500 self-start"
          >
            {mostrarRecusados ? "▾" : "▸"} Recusados ({recusadas.length})
          </button>
          {mostrarRecusados && (
            <ul className="flex flex-col gap-3">
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
