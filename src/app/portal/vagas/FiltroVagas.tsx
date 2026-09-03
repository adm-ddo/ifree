"use client";

import { useState } from "react";
import VagaCard from "./VagaCard";

type Item = {
  id: number;
  cargo: string;
  empresaNome: string;
  descricao: string;
  localizacao: string | null;
  jaCandidatou: boolean;
  ehMatch: boolean;
  conversaId: number | null;
};

/** Por padrão só mostra vagas com match — não faz muito sentido pro
 * freelancer ver vaga nenhuma a ver com o que ele sabe fazer. O toggle
 * revela todas as vagas abertas, caso ele queira olhar mesmo assim (ex.:
 * pra ver o que tem no mercado, ou porque ainda não preencheu bastante
 * habilidade no perfil pra dar match em nada). */
export default function FiltroVagas({ itens }: { itens: Item[] }) {
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const temMatch = itens.some((i) => i.ehMatch);
  const visiveis = mostrarTodas || !temMatch ? itens : itens.filter((i) => i.ehMatch);

  return (
    <div className="flex flex-col gap-3">
      {temMatch && (
        <button
          type="button"
          onClick={() => setMostrarTodas((v) => !v)}
          className="text-sm text-brand-700 hover:underline self-start"
        >
          {mostrarTodas
            ? "🎯 Mostrar só as que combinam comigo"
            : `Mostrar todas as vagas (${itens.length})`}
        </button>
      )}

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma vaga aberta no momento.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((vaga) => (
            <VagaCard
              key={vaga.id}
              vaga={{
                id: vaga.id,
                cargo: vaga.cargo,
                empresaNome: vaga.empresaNome,
                descricao: vaga.descricao,
                localizacao: vaga.localizacao,
              }}
              jaCandidatou={vaga.jaCandidatou}
              ehMatch={vaga.ehMatch}
              conversaId={vaga.conversaId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
