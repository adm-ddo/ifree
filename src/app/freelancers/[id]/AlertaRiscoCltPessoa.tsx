"use client";

import Link from "next/link";
import { useTransition } from "react";
import { dispensarRiscoClt } from "../actions";

const LINK_DECLARACAO_BASE = "/ged/pessoas";

/** Risco de vínculo CLT (3+ turnos na semana sem declaração de ciência da
 * oferta CLT gerada, ver src/lib/riscoClt.ts) — mostrado na própria
 * página do freelancer com dois estados:
 *
 * 1. Ainda não dispensado: card de alerta cheio, com os dois caminhos
 *    (gerar a declaração ou descartar/assumir o risco por enquanto).
 * 2. Já dispensado: lembrete mais discreto, mas PERMANENTE — continua
 *    aparecendo toda vez que o dono abrir esta página, mesmo que a
 *    semana atual não tenha mais 3+ turnos, até a declaração ser gerada
 *    de verdade (ou a pessoa virar CLT). Descartar não resolve nada, só
 *    tira o aviso do topo do painel — este lembrete aqui é o que
 *    garante que não caia no esquecimento. */
export default function AlertaRiscoCltPessoa({
  pessoaId,
  pessoaNome,
  responsavelGed,
  turnosNaSemana,
  dispensadoEmLabel,
}: {
  pessoaId: number;
  pessoaNome: string;
  responsavelGed: boolean;
  turnosNaSemana: number;
  dispensadoEmLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const linkDeclaracao = `${LINK_DECLARACAO_BASE}/${pessoaId}/gerar/TERMO_CIENCIA?termoSlug=opcao-autonomo-apos-oferta-clt`;

  if (dispensadoEmLabel) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          ⚠️ Você optou por assumir o risco de vínculo CLT de <strong>{pessoaNome.split(" ")[0]}</strong> em{" "}
          {dispensadoEmLabel} — ainda sem a declaração de ciência gerada.
        </p>
        {responsavelGed && (
          <Link
            href={linkDeclaracao}
            className="text-sm text-brand-700 hover:underline font-medium shrink-0"
          >
            📋 Gerar declaração →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
      <p className="text-sm text-amber-900">
        ⚠️ <strong>{pessoaNome}</strong> trabalhou {turnosNaSemana}x essa semana como extra — trabalho
        constante/habitual pode caracterizar vínculo empregatício (CLT art. 9º), mesmo sem carteira
        assinada. Pra reduzir esse risco, ofereça contratação CLT ou registre que ela foi oferecida e
        recusada.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {responsavelGed && (
          <Link
            href={linkDeclaracao}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            📋 Gerar declaração
          </Link>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => dispensarRiscoClt(pessoaId))}
          className="rounded-lg border border-amber-300 text-amber-800 text-sm px-4 py-2 hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          {pending ? "Descartando..." : "Descartar (assumir o risco)"}
        </button>
      </div>
    </div>
  );
}
