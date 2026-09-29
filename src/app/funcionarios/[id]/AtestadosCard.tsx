"use client";

import { useState, useTransition } from "react";
import { registrarAtestado, excluirAtestado } from "../actions";

// Mesma técnica de UploadAssinadoForm.tsx (src/app/ged/pessoas/[pessoaId]/)
// — comprime a foto tirada do celular antes de enviar, pra não estourar o
// limite de corpo do Server Action.
const LADO_MAXIMO_PX = 2000;
const QUALIDADE_JPEG = 0.85;

async function comprimirSeImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG));
    if (!blob) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

const LABEL_TIPO: Record<string, string> = {
  ATESTADO_MEDICO: "Atestado médico",
  LICENCA: "Licença",
  OUTRO: "Outro",
};

export type AtestadoListado = {
  id: number;
  dataInicioLabel: string;
  dataFimLabel: string;
  tipo: string;
  temArquivo: boolean;
  registradoPorEmail: string;
  registradoEmLabel: string;
};

export default function AtestadosCard({
  pessoaId,
  atestados,
}: {
  pessoaId: number;
  atestados: AtestadoListado[];
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  function enviar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const arquivo = formData.get("arquivo") as File | null;
      if (arquivo && arquivo.size > 0) {
        formData.set("arquivo", await comprimirSeImagem(arquivo));
      }
      const resultado = await registrarAtestado(pessoaId, formData);
      if (resultado?.erro) {
        setErro(resultado.erro);
        return;
      }
      setAberto(false);
    });
  }

  function excluir(atestadoId: number, periodo: string) {
    if (!confirm(`Excluir o atestado de ${periodo}? Essa ação não pode ser desfeita.`)) return;
    setExcluindoId(atestadoId);
    excluirAtestado(pessoaId, atestadoId).finally(() => setExcluindoId(null));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy-900">Atestados e afastamentos</h2>
        {!aberto && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 hover:bg-stone-50"
          >
            + Inserir atestado
          </button>
        )}
      </div>
      <p className="text-xs text-stone-500">
        Registre o período coberto por um atestado médico ou licença trazido pelo funcionário — os dias
        deixam de aparecer como lacuna no espelho de ponto. O motivo médico não é guardado aqui (dado
        sensível); o papel físico ou a foto anexada é que valem como prova.
      </p>

      {aberto && (
        <form
          action={enviar}
          className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"
        >
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              De
              <input
                type="date"
                name="dataInicio"
                required
                className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Até
              <input
                type="date"
                name="dataFim"
                required
                className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Tipo
            <select
              name="tipo"
              defaultValue="ATESTADO_MEDICO"
              required
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ATESTADO_MEDICO">Atestado médico</option>
              <option value="LICENCA">Licença</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Foto ou arquivo do atestado
            <input
              type="file"
              name="arquivo"
              accept="application/pdf,image/*"
              className="text-sm"
            />
          </label>

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {pending ? "Salvando..." : "Salvar atestado"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              disabled={pending}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {atestados.length === 0 ? (
        <p className="text-xs text-stone-400">Nenhum atestado registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {atestados.map((a) => {
            const periodo = a.dataInicioLabel === a.dataFimLabel ? a.dataInicioLabel : `${a.dataInicioLabel} a ${a.dataFimLabel}`;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {periodo} · {LABEL_TIPO[a.tipo] ?? a.tipo}
                  </p>
                  <p className="text-xs text-stone-500">
                    Registrado por {a.registradoPorEmail} em {a.registradoEmLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.temArquivo && (
                    <a
                      href={`/funcionarios/atestados/${a.id}/arquivo?ver=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Ver anexo
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => excluir(a.id, periodo)}
                    disabled={excluindoId === a.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {excluindoId === a.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
