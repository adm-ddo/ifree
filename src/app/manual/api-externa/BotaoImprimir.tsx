"use client";

export default function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-stone-300 bg-white text-sm font-medium px-4 py-2 text-stone-700 hover:bg-stone-50 shrink-0"
    >
      🖨️ Baixar PDF
    </button>
  );
}
