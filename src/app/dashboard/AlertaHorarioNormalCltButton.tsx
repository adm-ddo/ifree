"use client";

import { useState, useTransition } from "react";
import { corrigirRegistroPonto } from "../funcionarios/actions";
import { paraDatetimeLocalBrasil } from "@/lib/data";

const FUSO_BRASIL = "America/Sao_Paulo";

/** Mesmo alerta de AlertaHorarioNormalButton (turno de extra), só que pro
 * ponto de funcionário CLT — sem a opção de "turno dobrado" (não existe
 * esse conceito pra CLT). Reaproveita corrigirRegistroPonto
 * (src/app/funcionarios/actions.ts), a mesma action que já resolve
 * registros PENDENTE_CORRECAO em /funcionarios/[id] — aqui só chamada
 * mais cedo, no mesmo dia, sem esperar o cron da meia-noite marcar. */
export default function AlertaHorarioNormalCltButton({
  registroId,
  cutoff,
}: {
  registroId: number;
  cutoff: Date;
}) {
  const [modo, setModo] = useState<"fechado" | "encerrar">("fechado");
  const [horaSaida, setHoraSaida] = useState(() => paraDatetimeLocalBrasil(cutoff));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function encerrarNoHorario() {
    setErro(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("registroId", String(registroId));
      formData.set("horaSaida", horaSaida);
      const resultado = await corrigirRegistroPonto(undefined, formData);
      if (resultado?.erro) setErro(resultado.erro);
      else setModo("fechado");
    });
  }

  return (
    <div className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 mt-1.5">
      <p className="text-xs text-blue-900">
        🕓 Esse ponto já passou do horário normal de encerramento (
        {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: FUSO_BRASIL }).format(cutoff)}) e
        continua aberto — a pessoa esqueceu de bater a saída?
      </p>

      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}

      {modo === "fechado" ? (
        <button
          type="button"
          onClick={() => setModo("encerrar")}
          disabled={pending}
          className="mt-1.5 rounded-lg border border-blue-400 bg-white text-xs font-medium px-3 py-1.5 text-blue-800 hover:bg-blue-100 disabled:opacity-50"
        >
          Encerrar no horário normal
        </button>
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
              {pending ? "Encerrando..." : "Confirmar e encerrar ponto"}
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
