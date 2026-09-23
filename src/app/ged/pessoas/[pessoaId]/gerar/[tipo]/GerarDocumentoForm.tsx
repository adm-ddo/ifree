"use client";

import { useActionState, useEffect, useState } from "react";
import { gerarDocumentoGed } from "../../../../actions";
import type { TipoDocumentoGed } from "@/generated/prisma/enums";

// Precisam ser iguais a MODELO_ADVERTENCIA_GENERICA_ID/
// MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID/MODELO_SUSPENSAO_MOTIVO_LIVRE_ID
// em src/lib/ged.ts — não importados direto porque esse arquivo tem
// "server-only" (não pode entrar no bundle do cliente).
const MODELO_GENERICA = "generica";
const MODELO_SUSPENSAO_FALTA_INJUSTIFICADA = "falta-injustificada";
const MODELO_SUSPENSAO_MOTIVO_LIVRE = "motivo-livre";

export default function GerarDocumentoForm({
  pessoaId,
  tipo,
  modelosPadrao,
  termosCiencia,
  termoSlugInicial,
}: {
  pessoaId: number;
  tipo: TipoDocumentoGed;
  modelosPadrao: { nome: string; corpoTexto: string }[];
  termosCiencia: { slug: string; nome: string }[];
  /// Pré-seleciona o termo quando a página é aberta a partir de um atalho
  /// direto (ex.: ?termoSlug=... vindo do botão em /freelancers/[id]) —
  /// evita a pessoa precisar achar o termo certo numa lista.
  termoSlugInicial?: string;
}) {
  const [state, formAction, pending] = useActionState(
    gerarDocumentoGed.bind(null, pessoaId, tipo),
    undefined
  );

  useEffect(() => {
    if (state?.documentoId) {
      window.open(`/ged/documentos/${state.documentoId}/pdf`, "_blank");
    }
  }, [state?.documentoId]);

  const precisaModelo = tipo === "ADVERTENCIA";
  const [modeloEscolhido, setModeloEscolhido] = useState("");
  const [modeloSuspensao, setModeloSuspensao] = useState(MODELO_SUSPENSAO_FALTA_INJUSTIFICADA);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm max-w-lg">
      {tipo === "SUSPENSAO" && (
        <>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Modelo
            <select
              name="modeloSuspensao"
              required
              value={modeloSuspensao}
              onChange={(e) => setModeloSuspensao(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={MODELO_SUSPENSAO_FALTA_INJUSTIFICADA}>Falta injustificada</option>
              <option value={MODELO_SUSPENSAO_MOTIVO_LIVRE}>Motivo livre (escrever agora)</option>
            </select>
          </label>

          {modeloSuspensao === MODELO_SUSPENSAO_FALTA_INJUSTIFICADA ? (
            <>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Data da falta
                <input
                  type="date"
                  name="dataFalta"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Período/turno da ausência
                <input
                  type="text"
                  name="periodoTurno"
                  required
                  placeholder="Ex.: manhã, turno das 18h às 22h"
                  className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <p className="text-xs text-stone-500">
                O histórico de advertências/suspensões anteriores dessa pessoa é incluído automaticamente no documento.
              </p>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Motivo
              <textarea
                name="motivo"
                required
                rows={3}
                placeholder="Descreva o motivo da suspensão"
                className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Dias de suspensão
            <input
              type="number"
              name="dias"
              min={1}
              required
              defaultValue={1}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </>
      )}

      {tipo === "TERMO_CIENCIA" && (
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Qual termo
          <select
            name="termoSlug"
            required
            defaultValue={termoSlugInicial ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {termosCiencia.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      {precisaModelo && (
        <>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Modelo
            <select
              name="modeloId"
              required
              value={modeloEscolhido}
              onChange={(e) => setModeloEscolhido(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="" disabled>
                Selecione...
              </option>
              <option value={MODELO_GENERICA}>Motivo livre (escrever agora)</option>
              {modelosPadrao.map((m, i) => (
                <option key={i} value={`padrao:${i}`}>
                  {m.nome} (padrão do sistema)
                </option>
              ))}
            </select>
          </label>
          {modeloEscolhido === MODELO_GENERICA && (
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Motivo
              <textarea
                name="motivo"
                required
                rows={3}
                placeholder="Descreva o motivo da advertência"
                className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          )}
        </>
      )}

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        {tipo === "SUSPENSAO" ? "Período de início" : "Data"}
        <input
          type="date"
          name="data"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.erro}</p>
      )}
      {state?.documentoId && (
        <>
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            Documento gerado! Abriu numa nova aba — se não abriu,{" "}
            <a href={`/ged/documentos/${state.documentoId}/pdf`} target="_blank" rel="noopener noreferrer" className="underline">
              clique aqui
            </a>
            .
          </p>
          {(tipo === "ADVERTENCIA" || tipo === "SUSPENSAO") && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              É altamente recomendável ler o documento gerado 100% novamente
              antes de entregar, para confirmar que ele condiz com a
              realidade e a necessidade da {tipo === "ADVERTENCIA" ? "advertência" : "suspensão"}.
            </p>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Gerando..." : "Gerar documento"}
      </button>
    </form>
  );
}
