"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { apenasDigitos, formatarCpf } from "@/lib/cpf";
import { cadastrarConta } from "./actions";

export default function CadastroForm() {
  const [state, formAction, pending] = useActionState(
    cadastrarConta,
    undefined
  );
  const [cpf, setCpf] = useState("");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md"
    >
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Criar conta</h1>
        <p className="text-sm text-stone-500 mt-1">
          Já tem conta?{" "}
          <Link href="/login" className="text-brand-700 underline">
            Entrar
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome completo</label>
        <input
          name="nomeCompleto"
          required
          placeholder="Ex: João da Silva"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">CPF</label>
        <input
          name="cpf"
          required
          inputMode="numeric"
          maxLength={14}
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatarCpf(apenasDigitos(e.target.value)))}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">E-mail</label>
        <input
          name="email"
          type="email"
          required
          placeholder="voce@email.com"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">
          Senha (mín. 8 caracteres)
        </label>
        <input
          name="senha"
          type="password"
          required
          minLength={8}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 mt-1 disabled:opacity-50 transition-colors"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
