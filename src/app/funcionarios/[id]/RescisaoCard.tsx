"use client";

import { useActionState, useState } from "react";
import { registrarRescisao, cancelarRescisao, marcarRescisaoDocumentosAssinados } from "../actions";
import { calcularPrazoLimiteRescisao } from "@/lib/rescisao";
import type { IniciativaRescisao, TipoAvisoPrevioRescisao } from "@/generated/prisma/enums";

function formatarDataUTC(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Mesma leitura de "YYYY-MM-DD" pro meio-dia UTC usada só aqui, no
 * preview client-side — evita depender de instanteBrasil (server-only por
 * convenção de import, embora a função em si não seja) só pra uma conta
 * que não precisa ir ao banco. Meio-dia (não meia-noite) pra nunca vazar
 * pro dia anterior/seguinte por causa de fuso do navegador do usuário. */
function paraDataUTC(valorInput: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valorInput);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

/// Slug do catálogo TERMOS_CIENCIA_PADRAO (src/lib/ged.ts) pra cada
/// combinação de iniciativa+aviso prévio — usado só pra montar o link de
/// "gerar documento" pré-selecionando o termo certo (?termoSlug=...),
/// mesmo mecanismo já usado em ConverterParaCltButton.tsx.
const SLUG_DOCUMENTO_POR_AVISO: Record<TipoAvisoPrevioRescisao, string> = {
  FUNCIONARIO_CUMPRE: "pedido-demissao-cumpre-aviso",
  FUNCIONARIO_DISPENSADO: "pedido-demissao-dispensado-aviso",
  EMPRESA_SAIDA_2H: "aviso-previo-empresa-saida-2h",
  EMPRESA_SETE_DIAS: "aviso-previo-empresa-7-dias",
  EMPRESA_INDENIZADO: "aviso-previo-empresa-indenizado",
};

const LABEL_AVISO_PREVIO: Record<TipoAvisoPrevioRescisao, string> = {
  FUNCIONARIO_CUMPRE: "Funcionário vai cumprir o aviso prévio",
  FUNCIONARIO_DISPENSADO: "Funcionário pediu dispensa do aviso prévio",
  EMPRESA_SAIDA_2H: "Aviso trabalhado, saindo 2h mais cedo por dia",
  EMPRESA_SETE_DIAS: "Aviso trabalhado, com 7 dias corridos de folga",
  EMPRESA_INDENIZADO: "Aviso indenizado (não vai ser cumprido)",
};

export default function RescisaoCard({
  pessoaId,
  pessoaNome,
  jaRescindido,
  dataRescisaoValue,
  registradaPorEmail,
  registradaEmLabel,
  emPeriodoExperiencia,
  contratoFimLabel,
  rescisaoIniciativa,
  rescisaoAvisoPrevio,
  rescisaoDataPedidoLabel,
  documentosAssinados,
}: {
  pessoaId: number;
  pessoaNome: string;
  jaRescindido: boolean;
  /// "YYYY-MM-DD" da rescisão já registrada, ou "" se nunca registrada —
  /// também usado como valor inicial do input quando ainda não registrada
  /// (sugestão = hoje, decidida na page).
  dataRescisaoValue: string;
  registradaPorEmail: string | null;
  registradaEmLabel: string | null;
  /// true quando a pessoa ainda não foi efetivada — muda o texto de apoio
  /// pra deixar claro que essa rescisão conta como "não efetivação".
  emPeriodoExperiencia: boolean;
  contratoFimLabel: string | null;
  rescisaoIniciativa: IniciativaRescisao | null;
  rescisaoAvisoPrevio: TipoAvisoPrevioRescisao | null;
  rescisaoDataPedidoLabel: string | null;
  documentosAssinados: boolean;
}) {
  const [state, formAction, pending] = useActionState(registrarRescisao, undefined);
  const [dataEscolhida, setDataEscolhida] = useState(dataRescisaoValue);
  const [iniciativa, setIniciativa] = useState<IniciativaRescisao>("FUNCIONARIO");
  const [avisoPrevio, setAvisoPrevio] = useState<TipoAvisoPrevioRescisao>("FUNCIONARIO_CUMPRE");
  const [cancelando, setCancelando] = useState(false);
  const [erroCancelar, setErroCancelar] = useState<string | null>(null);
  const [marcandoAssinado, setMarcandoAssinado] = useState(false);
  const [erroMarcarAssinado, setErroMarcarAssinado] = useState<string | null>(null);

  const dataParaPreview = paraDataUTC(dataEscolhida);
  const preview = dataParaPreview ? calcularPrazoLimiteRescisao(dataParaPreview) : null;

  if (jaRescindido) {
    const slugDocumento = rescisaoAvisoPrevio ? SLUG_DOCUMENTO_POR_AVISO[rescisaoAvisoPrevio] : null;

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm max-w-lg">
        <div>
          <h2 className="font-semibold text-navy-900">Contrato rescindido</h2>
          <p className="text-xs text-stone-600 mt-1">
            Último dia de trabalho: <strong>{dataRescisaoValue.split("-").reverse().join("/")}</strong>
            {emPeriodoExperiencia && " — não efetivado (durante o período de experiência)"}.
          </p>
          {rescisaoIniciativa && (
            <p className="text-xs text-stone-600 mt-1">
              {rescisaoIniciativa === "FUNCIONARIO" ? "Pedido do funcionário" : "Iniciativa da empresa"}
              {rescisaoAvisoPrevio && ` — ${LABEL_AVISO_PREVIO[rescisaoAvisoPrevio]}`}.
              {rescisaoDataPedidoLabel && rescisaoIniciativa === "EMPRESA" && ` Decisão em ${rescisaoDataPedidoLabel}.`}
            </p>
          )}
          {registradaPorEmail && registradaEmLabel && (
            <p className="text-xs text-stone-500 mt-1">
              Registrado por {registradaPorEmail} em {registradaEmLabel}.
            </p>
          )}
        </div>

        {preview && (
          <div className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            <strong>Prazo limite pra assinatura/pagamento da rescisão: {formatarDataUTC(preview.prazoLimite)}</strong>
            {preview.antecipado && (
              <span className="block text-xs text-red-700 mt-0.5">
                Antecipado — os 10 dias corridos {preview.motivoAntecipacao} ({formatarDataUTC(preview.prazoBrutoDezDias)}).
              </span>
            )}
          </div>
        )}

        {slugDocumento && (
          <a
            href={`/ged/pessoas/${pessoaId}/gerar/TERMO_CIENCIA?termoSlug=${slugDocumento}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-700 bg-white border border-brand-200 rounded-lg px-3 py-2 hover:bg-brand-50 text-center"
          >
            📄 Gerar documento de rescisão
          </a>
        )}

        {documentosAssinados ? (
          <p className="text-xs text-stone-500">✅ Documentos já marcados como assinados.</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              setErroMarcarAssinado(null);
              setMarcandoAssinado(true);
              marcarRescisaoDocumentosAssinados(pessoaId)
                .then((r) => {
                  if (r?.erro) setErroMarcarAssinado(r.erro);
                })
                .finally(() => setMarcandoAssinado(false));
            }}
            disabled={marcandoAssinado}
            className="text-xs text-brand-700 hover:underline self-start disabled:opacity-50"
          >
            {marcandoAssinado ? "Marcando..." : "✔️ Marcar documentos como assinados"}
          </button>
        )}
        {erroMarcarAssinado && <p className="text-xs text-red-600">{erroMarcarAssinado}</p>}

        <button
          type="button"
          onClick={() => {
            if (!confirm(`Cancelar o registro de rescisão de ${pessoaNome}? O vínculo volta a ficar ativo.`)) return;
            setErroCancelar(null);
            setCancelando(true);
            cancelarRescisao(pessoaId)
              .then((r) => {
                if (r?.erro) setErroCancelar(r.erro);
              })
              .finally(() => setCancelando(false));
          }}
          disabled={cancelando}
          className="text-xs text-stone-500 hover:underline self-start disabled:opacity-50"
        >
          {cancelando ? "Cancelando..." : "Cancelar rescisão (foi engano)"}
        </button>
        {erroCancelar && <p className="text-xs text-red-600">{erroCancelar}</p>}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Rescisão</h2>
        <p className="text-xs text-stone-500 mt-1">
          {emPeriodoExperiencia
            ? `Pra não efetivar essa pessoa (ela não passou no período de experiência${contratoFimLabel ? `, que vai até ${contratoFimLabel}` : ""}), registre aqui o desligamento — pode ser antes do fim previsto (antecipar) ou na própria data.`
            : "Registre o desligamento pra calcular o prazo legal de pagamento/assinatura e gerar o documento certo."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-stone-700">Quem está pedindo?</span>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm text-stone-700">
            <input
              type="radio"
              name="iniciativa"
              value="FUNCIONARIO"
              checked={iniciativa === "FUNCIONARIO"}
              onChange={() => {
                setIniciativa("FUNCIONARIO");
                setAvisoPrevio("FUNCIONARIO_CUMPRE");
              }}
            />
            Funcionário
          </label>
          <label className="flex items-center gap-1.5 text-sm text-stone-700">
            <input
              type="radio"
              name="iniciativa"
              value="EMPRESA"
              checked={iniciativa === "EMPRESA"}
              onChange={() => {
                setIniciativa("EMPRESA");
                setAvisoPrevio("EMPRESA_SAIDA_2H");
              }}
            />
            Empresa
          </label>
        </div>
      </div>

      <input type="hidden" name="avisoPrevio" value={avisoPrevio} />

      {iniciativa === "FUNCIONARIO" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-stone-700">Vai cumprir o aviso prévio?</span>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                checked={avisoPrevio === "FUNCIONARIO_CUMPRE"}
                onChange={() => setAvisoPrevio("FUNCIONARIO_CUMPRE")}
              />
              Sim, vai cumprir
            </label>
            <label className="flex items-center gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                checked={avisoPrevio === "FUNCIONARIO_DISPENSADO"}
                onChange={() => setAvisoPrevio("FUNCIONARIO_DISPENSADO")}
              />
              Não, pede dispensa
            </label>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-stone-700">Como fica o aviso prévio?</span>
            <label className="flex items-start gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                className="mt-0.5"
                checked={avisoPrevio === "EMPRESA_SAIDA_2H"}
                onChange={() => setAvisoPrevio("EMPRESA_SAIDA_2H")}
              />
              Trabalhado, saindo 2h mais cedo todo dia
            </label>
            <label className="flex items-start gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                className="mt-0.5"
                checked={avisoPrevio === "EMPRESA_SETE_DIAS"}
                onChange={() => setAvisoPrevio("EMPRESA_SETE_DIAS")}
              />
              Trabalhado, com 7 dias corridos de folga
            </label>
            <label className="flex items-start gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                className="mt-0.5"
                checked={avisoPrevio === "EMPRESA_INDENIZADO"}
                onChange={() => setAvisoPrevio("EMPRESA_INDENIZADO")}
              />
              Não vai ser cumprido (indenizado)
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[12rem]">
            Data do pedido/decisão
            <input
              type="date"
              name="dataPedido"
              required
              defaultValue={dataRescisaoValue}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[12rem]">
        Último dia efetivamente trabalhado
        <input
          type="date"
          name="dataRescisao"
          value={dataEscolhida}
          onChange={(e) => setDataEscolhida(e.target.value)}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {preview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong>Prazo limite pra assinatura/pagamento: {formatarDataUTC(preview.prazoLimite)}</strong>
          {preview.antecipado && (
            <span className="block text-xs text-amber-700 mt-0.5">
              Antecipado — 10 dias corridos {preview.motivoAntecipacao} ({formatarDataUTC(preview.prazoBrutoDezDias)}).
            </span>
          )}
        </div>
      )}

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (
            !confirm(
              `Confirmar a rescisão de ${pessoaNome} em ${dataEscolhida.split("-").reverse().join("/")}? Ela deixa de conseguir bater ponto nesta empresa.`
            )
          ) {
            e.preventDefault();
          }
        }}
        className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Registrando..." : "Registrar rescisão"}
      </button>
    </form>
  );
}
