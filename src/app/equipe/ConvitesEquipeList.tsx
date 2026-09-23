"use client";

import { useTransition } from "react";
import { revogarConviteEquipe } from "./actions";
import { MODULOS_EQUIPE, type ModuloEquipe } from "@/lib/modulosEquipe";

export type ConviteEquipeResumo = {
  id: number;
  modulosPermitidos: ModuloEquipe[];
  criadoEm: string;
  expiraEm: string;
  usadoEm: string | null;
  usadoPorNome: string | null;
  revogadoEm: string | null;
};

function statusDe(convite: ConviteEquipeResumo): { label: string; classe: string } {
  if (convite.revogadoEm) return { label: "Cancelado", classe: "bg-stone-100 text-stone-600 border-stone-200" };
  if (convite.usadoEm) return { label: "Usado", classe: "bg-brand-50 text-brand-700 border-brand-200" };
  if (new Date(convite.expiraEm) < new Date()) {
    return { label: "Expirado", classe: "bg-stone-100 text-stone-500 border-stone-200" };
  }
  return { label: "Pendente", classe: "bg-amber-50 text-amber-700 border-amber-200" };
}

export default function ConvitesEquipeList({ convites }: { convites: ConviteEquipeResumo[] }) {
  const [pending, startTransition] = useTransition();

  if (convites.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold text-navy-900 mb-2">Convites gerados</h2>
      <ul className="flex flex-col gap-2">
        {convites.map((convite) => {
          const status = statusDe(convite);
          const podeCancelar = status.label === "Pendente";
          const labelsModulos = MODULOS_EQUIPE.filter((m) => convite.modulosPermitidos.includes(m.chave)).map(
            (m) => m.label
          );
          return (
            <li
              key={convite.id}
              className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-navy-900 flex items-center gap-1.5 flex-wrap text-sm">
                  <span className={`text-[10px] font-medium uppercase tracking-wide rounded-full border px-1.5 py-0.5 shrink-0 ${status.classe}`}>
                    {status.label}
                  </span>
                  {labelsModulos.join(", ")}
                </p>
                {convite.usadoPorNome && (
                  <p className="text-xs text-stone-500 mt-0.5">Resgatado por {convite.usadoPorNome}</p>
                )}
              </div>
              {podeCancelar && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await revogarConviteEquipe(convite.id);
                    });
                  }}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 shrink-0"
                >
                  Cancelar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
