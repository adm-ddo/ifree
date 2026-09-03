"use client";

import { useActionState } from "react";
import { entrarComProtocoloPortal } from "./actions";

export default function EntrarPortalForm() {
  const [state, formAction, pending] = useActionState(entrarComProtocoloPortal, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <label className="text-sm font-medium text-navy-900 block mb-1">Protocolo</label>
        <input
          name="protocolo"
          required
          placeholder="1234-567890"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-navy-900 block mb-1">Senha</label>
        <input
          name="senha"
          required
          placeholder="Senha de 8 caracteres"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Entrando..." : "Acompanhar denúncia"}
      </button>
    </form>
  );
}
