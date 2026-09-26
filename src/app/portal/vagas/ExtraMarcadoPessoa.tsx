"use client";

import { useState, useTransition } from "react";
import { confirmarExtraMarcado, recusarExtraMarcado } from "./actions";
import { formatarDataSemHora } from "@/lib/data";

export type ExtraMarcadoPendente = {
  id: number;
  data: Date;
  turnoTipo: "DIA" | "NOITE";
  status: "AGUARDANDO_PESSOA" | "CONFIRMADO";
  empresaNome: string;
};

/** Card de um Extra Marcado pendente ou já confirmado, na tela de vagas do
 * Portal — o aviso de reputação (⚠️) só aparece depois que ela clica em
 * "Confirmar" pela primeira vez, nunca escondido: pedido do Thiago em
 * 2026-09-26, ela precisa ver a consequência de faltar ANTES de confirmar,
 * não descobrir depois. Confirmar de verdade (confirmarExtraMarcado) só
 * roda no segundo clique, dentro do aviso. */
export default function ExtraMarcadoPessoa({ extra }: { extra: ExtraMarcadoPendente }) {
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (extra.status === "CONFIRMADO") {
    return (
      <li className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-1">
        <p className="text-sm font-semibold text-navy-900">
          ✅ Extra combinado com {extra.empresaNome}
        </p>
        <p className="text-sm text-stone-700">
          {formatarDataSemHora(extra.data)} · {extra.turnoTipo === "DIA" ? "☀️ Turno do dia" : "🌙 Turno da noite"}
        </p>
        <p className="text-xs text-stone-500">
          Chegue nesse dia/turno e bata seu CPF no totem — se não aparecer, isso pesa na sua reputação.
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold text-navy-900">🤝 {extra.empresaNome} marcou um extra pra você</p>
      <p className="text-sm text-stone-700">
        {formatarDataSemHora(extra.data)} · {extra.turnoTipo === "DIA" ? "☀️ Turno do dia" : "🌙 Turno da noite"}
      </p>

      {!mostrarAviso ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMostrarAviso(true)}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            🤝 Confirmar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => recusarExtraMarcado(extra.id))}
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Não vou poder ir
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col gap-2">
          <p className="text-sm text-red-800">
            ⚠️ Ao confirmar, você está se comprometendo a ir nesse dia/turno. Se não aparecer depois de
            confirmar, o sistema marca falta automaticamente e sua reputação cai — é o principal fator que
            as empresas olham antes de te chamar de novo.
          </p>
          {erro && <p className="text-sm text-red-700 font-medium">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setErro(null);
                  try {
                    await confirmarExtraMarcado(extra.id);
                  } catch {
                    setErro("Não foi possível confirmar agora — tenta de novo.");
                  }
                })
              }
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {pending ? "Confirmando..." : "Sim, vou e confirmo"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarAviso(false)}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
