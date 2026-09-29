"use client";

import { useState } from "react";

/// "YYYY-MM" do mês atual, em Brasília — usado só pro atalho "Este mês"
/// (o mês passado continua sendo o default da própria rota quando nenhum
/// parâmetro é passado, sem precisar calcular aqui).
function mesAtualISO(): string {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(agora);
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  return `${ano}-${mes}`;
}

/** Atalhos pro espelho de ponto (/relatorios/espelho/[pessoaId]/pdf) —
 * "Este mês" e "Mês passado" são só links diretos (GET simples, mesmo
 * espírito do botão único que existia antes); "Por período" abre um
 * mini-formulário inline com duas datas, sem precisar de server action
 * (é só uma navegação GET com query string). */
export default function EspelhoPontoBotoes({ pessoaId }: { pessoaId: number }) {
  const [mostrarPeriodo, setMostrarPeriodo] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const base = `/relatorios/espelho/${pessoaId}/pdf`;
  const podeGerarPeriodo = de !== "" && ate !== "" && ate >= de;

  return (
    <div className="flex flex-col gap-2 items-end shrink-0">
      <div className="flex flex-wrap gap-2 justify-end">
        <a
          href={`${base}?mes=${mesAtualISO()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 text-sm px-3 py-2 hover:bg-stone-50"
        >
          🖨️ Este mês
        </a>
        <a
          href={base}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 text-sm px-3 py-2 hover:bg-stone-50"
        >
          🖨️ Mês passado
        </a>
        <button
          type="button"
          onClick={() => setMostrarPeriodo((v) => !v)}
          className="rounded-lg border border-stone-300 text-sm px-3 py-2 hover:bg-stone-50"
        >
          🖨️ Por período
        </button>
      </div>

      {mostrarPeriodo && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
          <label className="flex flex-col gap-0.5 text-xs text-stone-600">
            De
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs text-stone-600">
            Até
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          {podeGerarPeriodo ? (
            <a
              href={`${base}?de=${de}&ate=${ate}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-1.5 transition-colors"
            >
              Gerar
            </a>
          ) : (
            <span className="text-xs text-stone-400 px-1 py-1.5">Escolha as duas datas</span>
          )}
        </div>
      )}
    </div>
  );
}
