"use client";

import { useState, useTransition } from "react";
import {
  alternarAtivoTotem,
  excluirTotem,
  rotacionarTokenTotem,
} from "./actions";

type Totem = { id: number; nome: string; token: string; ativo: boolean };

export default function TotemRow({
  totem,
  baseUrl,
}: {
  totem: Totem;
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const url = `${baseUrl}/t/${totem.token}`;

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-navy-900">
            {totem.nome}{" "}
            {!totem.ativo && (
              <span className="text-xs text-stone-500 font-normal">
                (desativado)
              </span>
            )}
          </p>
          <p className="text-xs text-stone-500 break-all">{url}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            }}
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50"
          >
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await alternarAtivoTotem(totem.id, !totem.ativo);
              });
            }}
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {totem.ativo ? "Desativar" : "Ativar"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  "Gerar um novo link pra este totem? O link/QR code atual para de funcionar imediatamente."
                )
              ) {
                startTransition(async () => {
                  await rotacionarTokenTotem(totem.id);
                });
              }
            }}
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Gerar novo link
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Excluir o totem "${totem.nome}"?`)) {
                startTransition(async () => {
                  await excluirTotem(totem.id);
                });
              }
            }}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 inline-block py-1.5 px-2"
          >
            Excluir
          </button>
        </div>
      </div>
    </li>
  );
}
