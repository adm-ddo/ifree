"use client";

import { useTransition } from "react";
import {
  removerAcessoEquipe,
  alternarResponsavelEtica,
  alternarResponsavelGed,
  alternarResponsavelPgr,
  alternarModuloEquipe,
} from "./actions";
import { MODULOS_EQUIPE, type ModuloEquipe } from "@/lib/modulosEquipe";

type Membro = {
  usuarioId: number;
  nomeCompleto: string | null;
  email: string;
  responsavelEtica: boolean;
  responsavelGed: boolean;
  responsavelPgr: boolean;
  modulosPermitidos: ModuloEquipe[];
};

/** Uma linha por pessoa com acesso à empresa ATUAL — antes disso cada
 * linha varria "sessao.minhasEmpresas" inteira (fazia sentido pro dono
 * gerenciando várias empresas próprias de uma vez, mas confundia o
 * master dentro de uma empresa de cliente: aparecia acesso/módulo de
 * empresas que não tinham nada a ver com a que ele estava vendo).
 * Simplificado pra uma empresa só — a mesma tela já está dentro do
 * contexto certo (mesmo espírito de Configurações). */
export default function MembroRow({ membro }: { membro: Membro }) {
  const [pending, startTransition] = useTransition();
  const modulosDoMembro = new Set(membro.modulosPermitidos);

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-navy-900">{membro.nomeCompleto || membro.email}</p>
          {membro.nomeCompleto && <p className="text-xs text-stone-500">{membro.email}</p>}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Remover o acesso de ${membro.nomeCompleto || membro.email} a esta empresa?`)) return;
            startTransition(async () => {
              await removerAcessoEquipe(membro.usuarioId);
            });
          }}
          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 shrink-0"
        >
          Remover acesso
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2">
        <span className="text-xs text-stone-500">🧩 Módulos:</span>
        {MODULOS_EQUIPE.map((modulo) => {
          const liberado = modulosDoMembro.has(modulo.chave);
          return (
            <button
              key={modulo.chave}
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await alternarModuloEquipe(membro.usuarioId, modulo.chave, !liberado);
                });
              }}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                liberado
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-stone-300 text-stone-500 hover:bg-stone-50"
              }`}
            >
              {liberado ? "✓ " : ""}
              {modulo.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2">
        <ToggleSensivel
          icone="⚖️"
          label="Central de Ética"
          ativo={membro.responsavelEtica}
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              await alternarResponsavelEtica(membro.usuarioId, !membro.responsavelEtica);
            })
          }
        />
        <ToggleSensivel
          icone="📁"
          label="GED"
          ativo={membro.responsavelGed}
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              await alternarResponsavelGed(membro.usuarioId, !membro.responsavelGed);
            })
          }
        />
        <ToggleSensivel
          icone="🧠"
          label="PGR"
          ativo={membro.responsavelPgr}
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              await alternarResponsavelPgr(membro.usuarioId, !membro.responsavelPgr);
            })
          }
        />
      </div>
    </li>
  );
}

function ToggleSensivel({
  icone,
  label,
  ativo,
  pending,
  onClick,
}: {
  icone: string;
  label: string;
  ativo: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
        ativo ? "bg-navy-900 border-navy-900 text-white" : "border-stone-300 text-stone-500 hover:bg-stone-50"
      }`}
    >
      {ativo ? "✓ " : ""}
      {icone} {label}
    </button>
  );
}
