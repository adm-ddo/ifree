"use client";

import { useState } from "react";

/** Campo de percentual com máscara automática de vírgula enquanto digita —
 * mesmo espírito de CampoValorReais (dígitos entram pela direita, como
 * centésimos do percentual), só que com sufixo "%" em vez de prefixo "R$".
 * O valor de verdade (`name`, formato "3.50") vai num input escondido;
 * vazio manda string vazia (campo opcional — "deixe em branco pra
 * desativar"). Não trava em 100 na hora de digitar — a validação de
 * intervalo (0 a 100) é feita no servidor, mesmo padrão do resto do
 * projeto. */
export default function CampoPercentualBr({
  name,
  label,
  placeholder,
  valorInicial,
}: {
  name: string;
  label: string;
  placeholder?: string;
  /// Semente pra editar um percentual já combinado — null/undefined começa
  /// vazio.
  valorInicial?: number | null;
}) {
  const [digitos, setDigitos] = useState(() =>
    valorInicial != null ? String(Math.round(valorInicial * 100)) : ""
  );

  const centesimos = digitos === "" ? 0 : Number(digitos);
  const valorFormatado = (centesimos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <label className="flex flex-col gap-1 text-xs text-stone-500">
      {label}
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder ? `${placeholder}%` : undefined}
        value={digitos ? `${valorFormatado}%` : ""}
        onChange={(e) => setDigitos(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
        className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input type="hidden" name={name} value={digitos ? (centesimos / 100).toFixed(2) : ""} />
    </label>
  );
}
