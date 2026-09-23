"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmarTrocaEmail } from "./actions";

export default function ConfirmarTrocaEmailForm({ token, novoEmail }: { token: string; novoEmail: string }) {
  const [state, formAction, pending] = useActionState(confirmarTrocaEmail, undefined);

  if (state?.sucesso) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        <h1 className="text-xl font-semibold text-navy-900">E-mail atualizado!</h1>
        <p className="text-sm text-stone-600">
          Seu novo e-mail (<strong>{novoEmail}</strong>) já está valendo. Pode fechar esta página e voltar pro
          Portal.
        </p>
        <Link href="/portal" className="text-brand-700 underline text-sm">
          Voltar pro Portal
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md"
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Confirmar novo e-mail</h1>
        <p className="text-sm text-stone-500 mt-1">
          Trocar o e-mail do seu cadastro no iFREE pra <strong>{novoEmail}</strong>?
        </p>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 mt-1 disabled:opacity-50 transition-colors"
      >
        {pending ? "Confirmando..." : "Confirmar novo e-mail"}
      </button>
    </form>
  );
}
