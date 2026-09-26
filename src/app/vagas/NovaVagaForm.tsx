"use client";

import { useActionState, useRef, useState } from "react";
import { criarVaga } from "./actions";
import { TODOS_OS_CARGOS } from "@/lib/habilidades";
import HabilidadesPicker from "./HabilidadesPicker";
import TurnoCheckboxes from "./TurnoCheckboxes";
import type { CategoriaVaga } from "@/generated/prisma/enums";

const CATEGORIAS: { valor: CategoriaVaga; label: string; emoji: string }[] = [
  { valor: "RESTAURANTE", label: "Restaurante", emoji: "🍽️" },
  { valor: "EVENTO", label: "Evento", emoji: "🎉" },
  { valor: "OUTRO", label: "Outro", emoji: "💼" },
];

// Card de vaga é pequeno (ícone/logo de ~44px) — 500px de lado já sobra de
// resolução, mantém o payload do form leve. Mesmo espírito de
// comprimirSeImagem em UploadAssinadoForm.tsx, só que sempre imagem (não
// aceita PDF aqui).
const LADO_MAXIMO_PX = 500;
const QUALIDADE_JPEG = 0.85;

async function comprimirImagem(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  return canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);
}

export default function NovaVagaForm({ localizacaoPadrao }: { localizacaoPadrao: string }) {
  const [aberto, setAberto] = useState(false);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);
  const [state, formAction, pending] = useActionState(criarVaga, undefined);
  const [categoria, setCategoria] = useState<CategoriaVaga>("OUTRO");
  const [tipoImagem, setTipoImagem] = useState<"ICONE" | "LOGO">("ICONE");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [erroLogo, setErroLogo] = useState<string | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  // Antes disso, depois de publicar a tela "travava" — o form ficava
  // aberto do mesmo jeito, sem nenhum sinal de que funcionou. Reage à
  // mudança de `state` durante a própria renderização (mesmo padrão já
  // usado em ExtraDiarioForm/DisponibilidadeToggle, evita useEffect):
  // fecha o formulário, limpa os campos de escolha visual e mostra um
  // aviso de sucesso até a pessoa decidir publicar outra.
  const [stateAnterior, setStateAnterior] = useState(state);
  if (state !== stateAnterior) {
    setStateAnterior(state);
    if (state?.sucesso) {
      setAberto(false);
      setMostrarSucesso(true);
      setCategoria("OUTRO");
      setTipoImagem("ICONE");
      setLogoPreview(null);
    }
  }

  if (!aberto) {
    return (
      <div className="flex flex-col gap-2">
        {mostrarSucesso && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            ✅ Vaga anunciada com sucesso!
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setMostrarSucesso(false);
            setAberto(true);
          }}
          className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors"
        >
          + Publicar nova vaga
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (tipoImagem === "LOGO" && !logoPreview) {
          e.preventDefault();
          setErroLogo("Escolha uma imagem ou volte pro ícone ilustrado.");
        }
      }}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900">Nova vaga</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Categoria</label>
        <input type="hidden" name="categoria" value={categoria} />
        <div className="flex gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setCategoria(c.valor)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                categoria === c.valor
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-stone-500">Imagem da vaga</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipoImagem("ICONE")}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              tipoImagem === "ICONE"
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            🎨 Ícone ilustrado
          </button>
          <button
            type="button"
            onClick={() => setTipoImagem("LOGO")}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              tipoImagem === "LOGO"
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            🖼️ Meu logo
          </button>
        </div>

        {tipoImagem === "ICONE" && (
          <p className="text-xs text-stone-500">
            Mostra um ícone colorido de acordo com a categoria escolhida acima.
          </p>
        )}

        {tipoImagem === "LOGO" && (
          <div className="flex items-center gap-3">
            <input
              ref={inputLogoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (!arquivo) return;
                setErroLogo(null);
                try {
                  const dataUrl = await comprimirImagem(arquivo);
                  setLogoPreview(dataUrl);
                } catch {
                  setErroLogo("Não consegui ler essa imagem — tenta outro arquivo.");
                }
              }}
            />
            <input type="hidden" name="logoDataUrl" value={logoPreview ?? ""} />
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview de dataURL local, sem sentido usar next/image aqui
              <img src={logoPreview} alt="" className="h-12 w-12 rounded-xl object-cover border border-stone-200" />
            ) : (
              <span className="h-12 w-12 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-300 text-xs">
                Logo
              </span>
            )}
            <button
              type="button"
              onClick={() => inputLogoRef.current?.click()}
              className="rounded-lg border border-stone-300 text-sm px-3 py-2 hover:bg-stone-50"
            >
              {logoPreview ? "Trocar imagem" : "Escolher imagem"}
            </button>
          </div>
        )}
        {erroLogo && <span className="text-xs text-red-600">{erroLogo}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Cargo</label>
        <input
          name="cargo"
          list="cargos-sugeridos"
          required
          autoFocus
          placeholder="Ex: Garçom/Garçonete, Cozinheiro(a)..."
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <datalist id="cargos-sugeridos">
          {TODOS_OS_CARGOS.map((cargo) => (
            <option key={cargo} value={cargo} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Descrição da vaga</label>
        <textarea
          name="descricao"
          required
          rows={4}
          placeholder="Turno, dias, o que a pessoa vai fazer, requisitos..."
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Localização (opcional)</label>
        <input
          name="localizacao"
          defaultValue={localizacaoPadrao}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome fantasia pra essa vaga (opcional)</label>
        <input
          name="nomeFantasia"
          placeholder="Ex: Bar do Zé — se vazio, mostra a razão social da empresa"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-stone-500">
          É o nome que o candidato vai ver, no lugar da razão social — útil
          se ela não for reconhecível pra quem procura vaga.
        </p>
      </div>

      <TurnoCheckboxes />

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="possibilidadeEfetivacao"
          className="h-4 w-4 accent-brand-600"
        />
        📈 Com possibilidade de efetivação (virar CLT depois)
      </label>

      <HabilidadesPicker nome="habilidadesProcuradas" />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Publicando..." : "Publicar vaga"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
