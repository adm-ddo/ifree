"use client";

import { useState, useTransition } from "react";
import { zerarPagamentosExtraPendentes } from "../actions";

export type ItemPagamentoPendente = {
  valor: number;
  horaEntradaLabel: string;
  funcaoNome: string;
};

/** Mostra os pagamentos de extra ainda pendentes desta pessoa nesta
 * empresa — sem isso, quem converte alguém pra CLT perde de vista
 * qualquer turno de extra ainda não pago, já que /funcionarios/[id] não
 * lista turno/pagamento (só RegistroPonto). Nada aqui é apagado
 * automaticamente: o botão "Dispensar" é a única forma de tirar um valor
 * dessa lista, e é uma ação explícita do dono. */
export default function PagamentosExtraPendentesCard({
  pessoaId,
  itens,
}: {
  pessoaId: number;
  itens: ItemPagamentoPendente[];
}) {
  const [aberto, setAberto] = useState(false);
  const [dataLimite, setDataLimite] = useState(new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();

  if (itens.length === 0) return null;

  const total = itens.reduce((soma, i) => soma + i.valor, 0);

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await zerarPagamentosExtraPendentes(pessoaId, dataLimite);
      if (resultado?.erro) {
        setErro(resultado.erro);
      } else {
        setSucesso(true);
        setAberto(false);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-navy-900">
          💰 Pagamentos de extra pendentes
        </h2>
        <p className="text-xs text-stone-600 mt-0.5">
          Turnos de extra dessa pessoa nesta empresa que ainda não foram
          pagos — continuam pendentes mesmo depois de virar CLT, até você
          pagar ou dispensar explicitamente.
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {itens.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-sm text-stone-700">
            <span>
              {item.horaEntradaLabel} · {item.funcaoNome}
            </span>
            <span className="font-medium">R$ {item.valor.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-amber-200 pt-2 text-sm font-semibold text-navy-900">
        <span>Total pendente</span>
        <span>R$ {total.toFixed(2)}</span>
      </div>

      {sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Pagamentos dispensados.
        </p>
      )}

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="self-start rounded-lg border border-stone-300 bg-white text-sm px-4 py-2 hover:bg-stone-50"
        >
          Dispensar pagamentos até uma data
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-sm text-stone-700">
            Dispensa (marca como resolvido por fora) os pagamentos de extra
            pendentes com entrada até a data abaixo. Turnos de extra feitos
            depois dessa data continuam pendentes normalmente.
          </p>
          <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[12rem]">
            Dispensar até
            <input
              type="date"
              value={dataLimite}
              onChange={(e) => setDataLimite(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {pending ? "Dispensando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              disabled={pending}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
