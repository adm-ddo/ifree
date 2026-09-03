"use client";

import { useState, useTransition } from "react";
import { confirmarSaidaConflito } from "../turnos/actions";

const FUSO_BRASIL = "America/Sao_Paulo";

/** Formata um Date pro formato exigido por <input type="datetime-local">
 * (YYYY-MM-DDTHH:MM), sempre no horário de Brasília — independente do
 * fuso do navegador de quem está usando o painel. */
function paraDatetimeLocal(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `${obter("year")}-${obter("month")}-${obter("day")}T${obter("hour")}:${obter("minute")}`;
}

/** Alerta + ação pra quando o dono vê, no "Em turno agora", alguém que
 * parece ter esquecido de bater saída aqui antes de começar outro turno
 * em outro lugar (ver conflitoDesde em src/app/dashboard/page.tsx). O
 * horário do OUTRO check-in vem pré-preenchido como sugestão de saída,
 * mas o dono pode ajustar antes de confirmar. */
export default function ConfirmarSaidaConflitoButton({
  turnoId,
  conflitoDesde,
}: {
  turnoId: number;
  conflitoDesde: Date;
}) {
  const [aberto, setAberto] = useState(false);
  const [horaSaida, setHoraSaida] = useState(() => paraDatetimeLocal(conflitoDesde));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await confirmarSaidaConflito(turnoId, horaSaida);
      if (resultado?.erro) setErro(resultado.erro);
      else setAberto(false);
    });
  }

  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 mt-1.5">
      <p className="text-xs text-amber-800">
        ⚠️ Essa pessoa já iniciou outro turno em outro lugar às{" "}
        {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: FUSO_BRASIL }).format(conflitoDesde)}{" "}
        — provavelmente esqueceu de bater saída aqui.
      </p>

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-1.5 rounded-lg border border-amber-400 bg-white text-xs font-medium px-3 py-1.5 text-amber-800 hover:bg-amber-100"
        >
          Confirmar horário de saída
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-amber-900">
            Saída real
            <input
              type="datetime-local"
              value={horaSaida}
              onChange={(e) => setHoraSaida(e.target.value)}
              className="border border-amber-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[13rem]"
            />
          </label>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              {pending ? "Encerrando..." : "Confirmar e encerrar turno"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              disabled={pending}
              className="rounded-lg border border-stone-300 text-xs px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
