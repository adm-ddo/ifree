"use client";

import { useState, useTransition } from "react";
import { confirmarSaidaConflito, marcarTurnoDobrado } from "../turnos/actions";

const FUSO_BRASIL = "America/Sao_Paulo";

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

/** Alerta pra turno que já passou do horário normal de encerramento do
 * próprio período (dia ou noite) e continua aberto — sem isso, só o cron
 * diário (01:00) fecharia, deixando a pessoa "contando hora corrida" o dia
 * inteiro até lá. Duas saídas plausíveis: esqueceu de bater saída no
 * horário normal, ou emendou pro próximo período (turno dobrado). */
export default function AlertaHorarioNormalButton({
  turnoId,
  cutoff,
  podeDobrar,
}: {
  turnoId: number;
  cutoff: Date;
  podeDobrar: boolean;
}) {
  const [modo, setModo] = useState<"fechado" | "encerrar">("fechado");
  const [horaSaida, setHoraSaida] = useState(() => paraDatetimeLocal(cutoff));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function encerrarNoHorario() {
    setErro(null);
    startTransition(async () => {
      const resultado = await confirmarSaidaConflito(turnoId, horaSaida);
      if (resultado?.erro) setErro(resultado.erro);
      else setModo("fechado");
    });
  }

  function marcarDobrado() {
    setErro(null);
    startTransition(async () => {
      const resultado = await marcarTurnoDobrado(turnoId);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 mt-1.5">
      <p className="text-xs text-blue-900">
        🕓 Esse turno já passou do horário normal de encerramento (
        {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: FUSO_BRASIL }).format(cutoff)}) e
        continua aberto — a pessoa esqueceu de bater saída, ou emendou pro próximo período?
      </p>

      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}

      {modo === "fechado" ? (
        <div className="flex flex-wrap gap-2 mt-1.5">
          <button
            type="button"
            onClick={() => setModo("encerrar")}
            disabled={pending}
            className="rounded-lg border border-blue-400 bg-white text-xs font-medium px-3 py-1.5 text-blue-800 hover:bg-blue-100 disabled:opacity-50"
          >
            Encerrar no horário normal
          </button>
          {podeDobrar && (
            <button
              type="button"
              onClick={marcarDobrado}
              disabled={pending}
              className="rounded-lg border border-blue-400 bg-white text-xs font-medium px-3 py-1.5 text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              {pending ? "Marcando..." : "Emendou pro próximo período (turno dobrado)"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-blue-900">
            Saída real
            <input
              type="datetime-local"
              value={horaSaida}
              onChange={(e) => setHoraSaida(e.target.value)}
              className="border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[13rem]"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={encerrarNoHorario}
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              {pending ? "Encerrando..." : "Confirmar e encerrar turno"}
            </button>
            <button
              type="button"
              onClick={() => setModo("fechado")}
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
