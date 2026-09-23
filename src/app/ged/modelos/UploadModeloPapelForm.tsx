"use client";

import { useActionState } from "react";
import { uploadModeloPapel } from "../actions";

export default function UploadModeloPapelForm() {
  const [state, formAction, pending] = useActionState(uploadModeloPapel, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs text-stone-600">
        Nome
        <input
          type="text"
          name="nome"
          required
          placeholder="Ex: Controle de pragas"
          className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-stone-600">
        Arquivo
        <input
          type="file"
          name="arquivo"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          required
          className="text-xs text-stone-600 file:mr-2 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-2 file:py-1 file:text-xs"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-2 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "+ Adicionar modelo"}
      </button>
      {state?.erro && <span className="text-xs text-red-600">{state.erro}</span>}
    </form>
  );
}
