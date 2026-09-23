"use client";

import { useState } from "react";

/** Campo de valor em reais com máscara automática de milhar/vírgula
 * enquanto digita (padrão POS/maquininha: cada dígito novo entra pela
 * direita, como centavos) — em vez de um `<input type="number">` cru, que
 * não aceita vírgula brasileira e obriga a pessoa a digitar ponto. O valor
 * de verdade (`name`, formato "20.00") vai num input escondido, sincronizado
 * a cada tecla — é esse que o formulário envia pro servidor. Campo vazio
 * manda string vazia (não "0.00") — importante pra campo opcional tipo
 * "deixe em branco pro padrão" (ver AssinaturaEditForm). */
export default function CampoValorReais({
  name,
  label,
  placeholder,
  valorInicial,
  compacto,
}: {
  name: string;
  label: string;
  placeholder?: string;
  /// Semente pra editar um valor já combinado (ex.: mensalidade já
  /// negociada) — null/undefined começa vazio, igual antes.
  valorInicial?: number | null;
  /// Versão enxuta (texto/label menor, largura fixa) pra caber numa linha
  /// de formulário compacta (ver AssinaturaEditForm) — sem isso usa o
  /// tamanho padrão, pensado pra formulário de card cheio.
  compacto?: boolean;
}) {
  const [digitos, setDigitos] = useState(() =>
    valorInicial != null ? String(Math.round(valorInicial * 100)) : ""
  );

  const centavos = digitos === "" ? 0 : Number(digitos);
  const valorFormatado = (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <label
      className={
        compacto
          ? "flex flex-col gap-1 text-xs text-stone-500"
          : "flex flex-col gap-1 text-sm text-stone-700"
      }
    >
      {label}
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder ? `R$ ${placeholder}` : undefined}
        value={digitos ? `R$ ${valorFormatado}` : ""}
        onChange={(e) => setDigitos(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
        className={
          compacto
            ? "border border-stone-300 rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-brand-500"
            : "border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        }
      />
      <input type="hidden" name={name} value={digitos ? (centavos / 100).toFixed(2) : ""} />
    </label>
  );
}
