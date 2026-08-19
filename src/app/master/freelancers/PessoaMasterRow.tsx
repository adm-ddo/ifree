"use client";

import { useTransition, useState } from "react";
import { excluirPessoaMaster } from "./actions";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import type { TipoDocumentoPessoa } from "@/generated/prisma/enums";

type Pessoa = {
  id: number;
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumentoPessoa;
  telefone: string;
  totalTurnos: number;
  totalEmpresas: number;
};

export default function PessoaMasterRow({ pessoa }: { pessoa: Pessoa }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const podeExcluir = pessoa.totalTurnos === 0;

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-navy-900">{pessoa.nome}</p>
        <p className="text-xs text-stone-500">
          {LABEL_TIPO_DOCUMENTO[pessoa.tipoDocumento]}{" "}
          {formatarDocumento(pessoa.tipoDocumento, pessoa.documento)} · {pessoa.telefone} ·{" "}
          {pessoa.totalEmpresas} empresa(s) · {pessoa.totalTurnos} turno(s)
        </p>
        {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
      </div>
      <button
        disabled={pending || !podeExcluir}
        title={podeExcluir ? undefined : "Tem turnos registrados — não pode ser excluída"}
        onClick={() => {
          if (confirm(`Excluir permanentemente o cadastro de "${pessoa.nome}"?`)) {
            setErro(null);
            startTransition(async () => {
              const res = await excluirPessoaMaster(pessoa.id);
              if ("erro" in res) setErro(res.erro);
            });
          }
        }}
        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed inline-block py-1.5 px-2 shrink-0"
      >
        Excluir permanentemente
      </button>
    </li>
  );
}
