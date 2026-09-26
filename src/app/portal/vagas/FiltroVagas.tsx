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

/// Mesmas cores/emoji de CATEGORIA_INFO em VagaCard.tsx (cada categoria já
/// tem sua identidade visual lá no badge do card) — aqui só aplicadas no
/// estado ATIVO da aba, pra bater o olho de qual filtro tá ligado sem
/// precisar ler o texto.
const ABAS_CATEGORIA: { valor: CategoriaVaga | "TODAS"; label: string; emoji: string; ativoClasse: string }[] = [
  { valor: "TODAS", label: "Todos", emoji: "✨", ativoClasse: "bg-navy-900 border-navy-900 text-white" },
  { valor: "RESTAURANTE", label: "Restaurantes", emoji: "🍽️", ativoClasse: "bg-amber-500 border-amber-500 text-white" },
  { valor: "EVENTO", label: "Eventos", emoji: "🎉", ativoClasse: "bg-purple-500 border-purple-500 text-white" },
  { valor: "OUTRO", label: "Outros", emoji: "💼", ativoClasse: "bg-stone-600 border-stone-600 text-white" },
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
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {ABAS_CATEGORIA.map((aba) => {
          const ativo = categoria === aba.valor;
          return (
            <button
              key={aba.valor}
              type="button"
              onClick={() => setCategoria(aba.valor)}
              className={`flex items-center justify-center sm:justify-start gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                ativo
                  ? `${aba.ativoClasse} shadow-sm`
                  : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              <span className="text-base leading-none">{aba.emoji}</span>
              {aba.label}
            </button>
          );
        })}
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
