"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { entrarPessoa } from "./actions";
import { formatarCpf } from "@/lib/cpf";

export default function EntrarPessoaForm() {
  const [state, formAction, pending] = useActionState(entrarPessoa, undefined);
  const [cpf, setCpf] = useState("");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Entrar no Portal</h1>
        <p className="text-sm text-stone-500 mt-1">
          Já trabalhou por uma empresa no iFREE?{" "}
          <Link href="/portal/cadastrar-acesso" className="text-brand-700 underline">
            Configurar acesso
          </Link>
        </p>
        <p className="text-sm text-stone-500 mt-1">
          Nunca trabalhou por aqui?{" "}
          <Link href="/portal/cadastro" className="text-brand-700 underline">
            Fazer novo cadastro
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">CPF</label>
        <input
          name="cpf"
          inputMode="numeric"
          required
          autoFocus
          value={cpf}
          onChange={(e) => setCpf(formatarCpf(e.target.value))}
          placeholder="000.000.000-00"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-stone-500">Senha</label>
          <Link href="/portal/esqueci-senha" className="text-xs text-brand-700 underline">
            Esqueci minha senha
          </Link>
        </div>
        <input
          name="senha"
          type="password"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
          {state.semAcesso && (
            <>
              {" "}
              <Link href="/portal/cadastrar-acesso" className="underline font-medium">
                Configurar agora
              </Link>
            </>
          )}
          {state.naoEncontrado && (
            <>
              {" "}
              <Link href="/portal/cadastro" className="underline font-medium">
                Fazer novo cadastro
              </Link>
            </>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 mt-1 disabled:opacity-50 transition-colors"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
