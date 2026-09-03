"use client";

import { useState } from "react";

export default function LinkPublicoBox({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <h2 className="font-semibold text-navy-900 text-sm">Link público do canal</h2>
      <p className="text-xs text-stone-500">
        Compartilhe este link com toda a equipe (mural, grupo, onboarding) —
        qualquer pessoa consegue denunciar por ele, sem precisar de login.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 break-all flex-1 min-w-0">
          {url}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
          className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 shrink-0"
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
