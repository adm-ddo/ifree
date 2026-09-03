"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacaoSenha } from "./actions";
import CaptchaWidget from "@/components/CaptchaWidget";

export default function RecuperarSenhaForm() {
  const [state, formAction, pending] = useActionState(
    solicitarRecuperacaoSenha,
    undefined
  );

  if (state?.sucesso) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        <h1 className="text-xl font-semibold text-navy-900">Verifique seu e-mail</h1>
        <p className="text-sm text-stone-600">
          Se esse e-mail estiver cadastrado, enviamos um link pra você criar
          uma senha nova. O link vale por 1 hora.
        </p>
        <Link href="/login" className="text-brand-700 underline text-sm">
          Voltar pro login
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md"
    >
      <div>
        <h1 className="text-xl font-semibold text-navy-900">
          Recuperar senha
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Informe o e-mail da sua conta — vamos mandar um link pra você criar
          uma senha nova.{" "}
          <Link href="/login" className="text-brand-700 underline">
            Voltar para o login
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">E-mail</label>
        <input
          name="email"
          type="email"
          required
          autoFocus
          placeholder="voce@email.com"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <CaptchaWidget />

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
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </button>
    </form>
  );
}
