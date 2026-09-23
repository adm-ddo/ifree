"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { candidatarSe } from "./actions";

export default function VagaCard({
  vaga,
  jaCandidatou,
  ehMatch,
  conversaId,
  linkRota,
}: {
  vaga: {
    id: number;
    cargo: string;
    empresaNome: string;
    descricao: string;
    localizacao: string | null;
    turnoDia: boolean;
    turnoNoite: boolean;
  };
  jaCandidatou: boolean;
  ehMatch: boolean;
  conversaId: number | null;
  linkRota: string | null;
}) {
  const [candidatou, setCandidatou] = useState(jaCandidatou);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-navy-900">{vaga.cargo}</span>
        <span className="text-stone-500 text-sm">· {vaga.empresaNome}</span>
        {vaga.turnoDia && (
          <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] px-2 py-0.5">
            ☀️ Dia
          </span>
        )}
        {vaga.turnoNoite && (
          <span className="rounded-full bg-navy-50 border border-navy-200 text-navy-700 text-[11px] px-2 py-0.5">
            🌙 Noite
          </span>
        )}
        {ehMatch && (
          <span className="rounded-full border border-brand-500 bg-brand-50 text-brand-700 text-[11px] font-bold px-2 py-0.5">
            🎯 Você é um match!
          </span>
        )}
      </div>
      <p className="text-sm text-stone-600 whitespace-pre-line">{vaga.descricao}</p>
      {vaga.localizacao && <p className="text-xs text-stone-500">📍 {vaga.localizacao}</p>}
      {linkRota && (
        <a
          href={linkRota}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-700 underline self-start"
        >
          🚌 Ver ônibus e tempo até lá (Google Maps)
        </a>
      )}

      {erro && (
        <p className="text-xs text-red-600">
          {erro}{" "}
          {erro.startsWith("Complete seu perfil") && (
            <Link href="/portal" className="underline">
              Ir pro meu perfil
            </Link>
          )}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={candidatou || pending}
          onClick={() => {
            startTransition(async () => {
              const resultado = await candidatarSe(vaga.id);
              if ("erro" in resultado) {
                setErro(resultado.erro);
              } else {
                setCandidatou(true);
                router.refresh();
              }
            });
          }}
          className={`rounded-lg text-sm font-medium px-4 py-2 self-start transition-colors ${
            candidatou
              ? "bg-stone-100 text-stone-500 cursor-default"
              : "bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          }`}
        >
          {candidatou ? "Candidatura enviada" : pending ? "Enviando..." : "Candidatar-se"}
        </button>
        {candidatou && ehMatch && conversaId && (
          <Link href={`/portal/conversas/${conversaId}`} className="text-sm text-brand-700 underline">
            💬 Conversar com a empresa
          </Link>
        )}
      </div>
    </li>
  );
}
