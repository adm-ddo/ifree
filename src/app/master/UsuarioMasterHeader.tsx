"use client";

import { useTransition } from "react";
import { excluirUsuarioMaster } from "./actions";

export default function UsuarioMasterHeader({
  usuarioId,
  nomeCompleto,
  email,
  cadastradoEm,
}: {
  usuarioId: number;
  nomeCompleto: string | null;
  email: string;
  /// Usuario.criadoEm já formatado (dd/mm/aaaa, fuso de Brasília) — quando
  /// esse login se cadastrou no iFREE, pedido do Thiago em 2026-09-26 pra
  /// acompanhar quem entrou e quando.
  cadastradoEm: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-navy-900">{nomeCompleto || email}</p>
        {nomeCompleto && <p className="text-xs text-stone-500">{email}</p>}
        <p className="text-xs text-stone-400 mt-0.5">Cadastrado em {cadastradoEm}</p>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              `Excluir permanentemente o login de "${nomeCompleto || email}"? As empresas dele continuam existindo, só perdem esse dono (ficam "sem dono vinculado" se não tiverem outro usuário).`
            )
          ) {
            startTransition(async () => {
              await excluirUsuarioMaster(usuarioId);
            });
          }
        }}
        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-40 inline-block py-1 px-2 shrink-0"
      >
        Excluir login
      </button>
    </div>
  );
}
