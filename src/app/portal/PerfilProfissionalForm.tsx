"use client";

import { useActionState, useState } from "react";
import { atualizarPerfilProfissional } from "./actions";
import type { CategoriaSugestoes } from "@/lib/habilidades";
import { BIOGRAFIA_MINIMO_CARACTERES } from "@/lib/perfil-completude";

type Cor = "brand" | "navy";

const TEMA: Record<Cor, { texto: string; barra: string; marcado: string; caixa: string }> = {
  brand: {
    texto: "text-brand-700",
    barra: "bg-brand-500",
    marcado: "bg-brand-500 border-brand-500 text-navy-900 font-medium",
    caixa: "bg-brand-50/60 border-brand-100",
  },
  navy: {
    texto: "text-navy-700",
    barra: "bg-navy-600",
    marcado: "bg-navy-700 border-navy-700 text-white font-medium",
    caixa: "bg-navy-50 border-navy-100",
  },
};

function GrupoChips({
  itens,
  selecionados,
  onToggle,
  tema,
}: {
  itens: readonly string[];
  selecionados: string[];
  onToggle: (item: string) => void;
  tema: (typeof TEMA)[Cor];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {itens.map((item) => {
        const marcado = selecionados.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`rounded-full border text-xs px-2.5 py-1 transition-colors ${
              marcado ? tema.marcado : "border-stone-300 text-stone-600 hover:border-stone-400"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

function SeletorChips({
  titulo,
  subtitulo,
  cor,
  categorias,
  selecionados,
  onChange,
  name,
}: {
  titulo: string;
  subtitulo: string;
  cor: Cor;
  categorias: readonly CategoriaSugestoes[];
  selecionados: string[];
  onChange: (novos: string[]) => void;
  name: string;
}) {
  const [novoItem, setNovoItem] = useState("");
  const tema = TEMA[cor];

  function alternar(item: string) {
    onChange(
      selecionados.includes(item)
        ? selecionados.filter((s) => s !== item)
        : [...selecionados, item]
    );
  }

  function adicionar() {
    const item = novoItem.trim();
    if (!item || selecionados.includes(item)) return;
    onChange([...selecionados, item]);
    setNovoItem("");
  }

  // Itens já marcados que não pertencem a nenhuma categoria sugerida —
  // ou porque a pessoa digitou algo customizado, ou porque vieram de
  // antes dessa lista ter virado categorizada. Mostrados à parte, senão
  // somem da tela mesmo continuando marcados.
  const todosSugeridos = new Set(categorias.flatMap((c) => c.itens));
  const customizados = selecionados.filter((s) => !todosSugeridos.has(s));

  return (
    <div className={`flex flex-col gap-4 rounded-xl border p-4 ${tema.caixa}`}>
      <div>
        <h3 className={`text-base font-bold ${tema.texto}`}>{titulo}</h3>
        <p className="text-xs text-stone-500 mt-0.5">{subtitulo}</p>
      </div>

      {categorias.map((cat) => (
        <div key={cat.categoria} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-1 rounded-full ${tema.barra}`} />
            <span className={`text-xs font-bold uppercase tracking-wide ${tema.texto}`}>
              {cat.categoria}
            </span>
          </div>
          <GrupoChips itens={cat.itens} selecionados={selecionados} onToggle={alternar} tema={tema} />
        </div>
      ))}

      {customizados.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-stone-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Adicionados por você
            </span>
          </div>
          <GrupoChips itens={customizados} selecionados={selecionados} onToggle={alternar} tema={tema} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="Não está na lista? Digite aqui"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={adicionar}
          className="rounded-lg border border-stone-300 bg-white text-sm px-3 py-1.5 hover:bg-stone-50"
        >
          + Adicionar
        </button>
      </div>
      {selecionados.map((item) => (
        <input key={item} type="hidden" name={name} value={item} />
      ))}
    </div>
  );
}

function arraysIguais(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

type SexoValor = "MASCULINO" | "FEMININO" | "PREFIRO_NAO_DIZER";

const OPCOES_SEXO: readonly [SexoValor, string][] = [
  ["MASCULINO", "Masculino"],
  ["FEMININO", "Feminino"],
  ["PREFIRO_NAO_DIZER", "Prefiro não dizer"],
];

export default function PerfilProfissionalForm({
  dadosIniciais,
  habilidadesSugeridas,
  vagasSugeridas,
}: {
  dadosIniciais: {
    biografia: string;
    habilidades: string[];
    vagasDesejadas: string[];
    sexo: SexoValor | null;
  };
  habilidadesSugeridas: readonly CategoriaSugestoes[];
  vagasSugeridas: readonly CategoriaSugestoes[];
}) {
  const [state, formAction, pending] = useActionState(atualizarPerfilProfissional, undefined);
  const [habilidades, setHabilidades] = useState(dadosIniciais.habilidades);
  const [vagasDesejadas, setVagasDesejadas] = useState(dadosIniciais.vagasDesejadas);
  const [biografia, setBiografia] = useState(dadosIniciais.biografia);
  const [sexo, setSexo] = useState<SexoValor | null>(dadosIniciais.sexo);

  // Resincroniza durante a renderização se o dado do banco mudar depois da
  // primeira montagem (ex.: página se atualiza sozinha após salvar outro
  // card desta mesma tela) — sem isso os chips ficavam presos no valor de
  // quando a tela abriu.
  const [iniciaisAnteriores, setIniciaisAnteriores] = useState(dadosIniciais);
  if (
    !arraysIguais(dadosIniciais.habilidades, iniciaisAnteriores.habilidades) ||
    !arraysIguais(dadosIniciais.vagasDesejadas, iniciaisAnteriores.vagasDesejadas) ||
    dadosIniciais.biografia !== iniciaisAnteriores.biografia ||
    dadosIniciais.sexo !== iniciaisAnteriores.sexo
  ) {
    setIniciaisAnteriores(dadosIniciais);
    setHabilidades(dadosIniciais.habilidades);
    setVagasDesejadas(dadosIniciais.vagasDesejadas);
    setBiografia(dadosIniciais.biografia);
    setSexo(dadosIniciais.sexo);
  }

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900 text-sm">Perfil profissional</h2>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Biografia
        <textarea
          name="biografia"
          value={biografia}
          onChange={(e) => setBiografia(e.target.value)}
          rows={4}
          required
          minLength={BIOGRAFIA_MINIMO_CARACTERES}
          placeholder="Conte um pouco sobre sua experiência, o que você gosta de fazer, seu jeito de trabalhar..."
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <span
          className={`text-xs ${biografia.trim().length >= BIOGRAFIA_MINIMO_CARACTERES ? "text-stone-500" : "text-amber-600"}`}
        >
          {biografia.trim().length}/{BIOGRAFIA_MINIMO_CARACTERES} caracteres mínimos
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-stone-700">
          Gênero <span className="text-stone-400 font-normal">(usado só pra personalizar seu avatar)</span>
        </span>
        <input type="hidden" name="sexo" value={sexo ?? ""} />
        <div className="flex gap-2 flex-wrap">
          {OPCOES_SEXO.map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setSexo(valor)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                sexo === valor
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SeletorChips
        titulo="🧰 Habilidades"
        subtitulo="O que você já sabe fazer"
        cor="brand"
        categorias={habilidadesSugeridas}
        selecionados={habilidades}
        onChange={setHabilidades}
        name="habilidades"
      />

      <SeletorChips
        titulo="🎯 Vagas desejadas"
        subtitulo="O que você gostaria de exercer"
        cor="navy"
        categorias={vagasSugeridas}
        selecionados={vagasDesejadas}
        onChange={setVagasDesejadas}
        name="vagasDesejadas"
      />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Perfil atualizado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors self-start"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
