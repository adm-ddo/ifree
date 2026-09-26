"use client";

import { useMemo, useState } from "react";
import VagaCard from "./VagaCard";
import type { CategoriaVaga } from "@/generated/prisma/enums";

type Item = {
  id: number;
  cargo: string;
  categoria: CategoriaVaga;
  logoUrl: string | null;
  possibilidadeEfetivacao: boolean;
  empresaNome: string;
  empresaCidade: string | null;
  descricao: string;
  localizacao: string | null;
  turnoDia: boolean;
  turnoNoite: boolean;
  jaCandidatou: boolean;
  ehMatch: boolean;
  conversaId: number | null;
  linkRota: string | null;
};

const ABAS_CATEGORIA: { valor: CategoriaVaga | "TODAS"; label: string }[] = [
  { valor: "TODAS", label: "Todos" },
  { valor: "RESTAURANTE", label: "Restaurantes" },
  { valor: "EVENTO", label: "Eventos" },
  { valor: "OUTRO", label: "Outros" },
];

/** Por padrão só mostra vagas com match — não faz muito sentido pro
 * freelancer ver vaga nenhuma a ver com o que ele sabe fazer. O toggle
 * revela todas as vagas abertas, caso ele queira olhar mesmo assim (ex.:
 * pra ver o que tem no mercado, ou porque ainda não preencheu bastante
 * habilidade no perfil pra dar match em nada). Categoria e cidade são
 * filtros à parte, combináveis com esse — tudo em memória sobre a lista
 * já carregada (poucas vagas abertas de cada vez, não justifica reconsultar
 * o banco a cada clique). */
export default function FiltroVagas({ itens }: { itens: Item[] }) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaVaga | "TODAS">("TODAS");
  const [cidade, setCidade] = useState<string>("TODAS");

  const temMatch = itens.some((i) => i.ehMatch);
  const cidadesDisponiveis = useMemo(
    () =>
      [...new Set(itens.map((i) => i.empresaCidade?.trim()).filter((c): c is string => Boolean(c)))].sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [itens]
  );

  const visiveis = itens.filter((i) => {
    if ((mostrarTodas || !temMatch ? false : !i.ehMatch)) return false;
    if (categoria !== "TODAS" && i.categoria !== categoria) return false;
    if (cidade !== "TODAS" && i.empresaCidade !== cidade) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ABAS_CATEGORIA.map((aba) => (
          <button
            key={aba.valor}
            type="button"
            onClick={() => setCategoria(aba.valor)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              categoria === aba.valor
                ? "bg-navy-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {temMatch && (
          <button
            type="button"
            onClick={() => setMostrarTodas((v) => !v)}
            className="text-sm text-brand-700 hover:underline"
          >
            {mostrarTodas ? "🎯 Mostrar só as que combinam comigo" : `Mostrar todas as vagas (${itens.length})`}
          </button>
        )}

        {cidadesDisponiveis.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-stone-600 ml-auto">
            📍
            <select
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="TODAS">Todas as cidades</option>
              {cidadesDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma vaga encontrada com esse filtro.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiveis.map((vaga) => (
            <VagaCard
              key={vaga.id}
              vaga={{
                id: vaga.id,
                cargo: vaga.cargo,
                categoria: vaga.categoria,
                logoUrl: vaga.logoUrl,
                possibilidadeEfetivacao: vaga.possibilidadeEfetivacao,
                empresaNome: vaga.empresaNome,
                empresaCidade: vaga.empresaCidade,
                descricao: vaga.descricao,
                localizacao: vaga.localizacao,
                turnoDia: vaga.turnoDia,
                turnoNoite: vaga.turnoNoite,
              }}
              jaCandidatou={vaga.jaCandidatou}
              ehMatch={vaga.ehMatch}
              conversaId={vaga.conversaId}
              linkRota={vaga.linkRota}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
