"use client";

import { useState, type ReactNode } from "react";
import CandidaturaCardV2 from "./CandidaturaCardV2";
import type { Sexo } from "@/generated/prisma/enums";
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
  };
  reputacaoCard: ReactNode;
};

/** Mesma lógica de src/app/vagas/[id]/FiltroCandidaturas.tsx (v1, não
 * tocado), usando CandidaturaCardV2 em vez do card do v1. */
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

  const temMatch = itens.some((i) => i.match);
  const visiveis = mostrarTodas || !temMatch ? itens : itens.filter((i) => i.match);

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
            : `Mostrar todas as candidaturas (${itens.length})`}
        </button>
      )}

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma candidatura ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((c) => (
            <CandidaturaCardV2
              key={c.id}
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
          ))}
        </ul>
      )}
    </div>
  );
}
