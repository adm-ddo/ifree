"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { candidatarSe } from "./actions";
import type { CategoriaVaga } from "@/generated/prisma/enums";

const CATEGORIA_INFO: Record<CategoriaVaga, { emoji: string; label: string; classe: string }> = {
  RESTAURANTE: { emoji: "🍽️", label: "Restaurante", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  EVENTO: { emoji: "🎉", label: "Evento", classe: "bg-purple-50 text-purple-700 border-purple-200" },
  OUTRO: { emoji: "💼", label: "Outro", classe: "bg-stone-100 text-stone-600 border-stone-200" },
};

/** Card de vaga estilo "feed" — mesma lógica de candidatura/match/chat de
 * antes (ver comentário em FiltroVagas.tsx), só a apresentação mudou:
 * mais respiro, badge de categoria colorido, CTA "Quero trabalhar" em vez
 * de "Candidatar-se" (tom mais convidativo, mesmo espírito do anúncio que
 * inspirou o redesign). Sem banco de fotos de estoque pronto pra usar
 * aqui — a empresa escolhe, ao publicar, entre o ícone ilustrado da
 * categoria (padrão) ou o próprio logo (Vaga.logoUrl, ver NovaVagaForm.tsx). */
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
    categoria: CategoriaVaga;
    logoUrl: string | null;
    empresaNome: string;
    empresaCidade: string | null;
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

  const categoriaInfo = CATEGORIA_INFO[vaga.categoria];

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {vaga.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob privado de tamanho variável, sem otimização do next/image aqui
            <img
              src={vaga.logoUrl}
              alt=""
              className="h-11 w-11 rounded-2xl object-cover shrink-0 border border-stone-100"
            />
          ) : (
            <span className="flex items-center justify-center h-11 w-11 rounded-2xl bg-stone-50 text-2xl shrink-0">
              {categoriaInfo.emoji}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-navy-900 truncate">{vaga.cargo}</p>
            <p className="text-stone-500 text-sm truncate">{vaga.empresaNome}</p>
          </div>
        </div>
        {ehMatch && (
          <span className="rounded-full border border-brand-500 bg-brand-50 text-brand-700 text-[11px] font-bold px-2.5 py-1 shrink-0">
            🎯 Match
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`rounded-full border text-[11px] font-medium px-2.5 py-1 ${categoriaInfo.classe}`}>
          {categoriaInfo.label}
        </span>
        {vaga.turnoDia && (
          <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] px-2.5 py-1">
            ☀️ Dia
          </span>
        )}
        {vaga.turnoNoite && (
          <span className="rounded-full bg-navy-50 border border-navy-200 text-navy-700 text-[11px] px-2.5 py-1">
            🌙 Noite
          </span>
        )}
      </div>

      <p className="text-sm text-stone-600 whitespace-pre-line">{vaga.descricao}</p>

      <div className="flex flex-col gap-0.5">
        {(vaga.localizacao || vaga.empresaCidade) && (
          <p className="text-xs text-stone-500">
            📍 {[vaga.localizacao, vaga.empresaCidade].filter(Boolean).join(" · ")}
          </p>
        )}
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
      </div>

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

      <div className="flex items-center gap-3 mt-1">
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
          className={`rounded-full text-sm font-semibold px-5 py-2.5 self-start transition-colors ${
            candidatou
              ? "bg-stone-100 text-stone-500 cursor-default"
              : "bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          }`}
        >
          {candidatou ? "✓ Candidatura enviada" : pending ? "Enviando..." : "Quero trabalhar"}
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
