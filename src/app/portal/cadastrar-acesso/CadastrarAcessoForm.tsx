"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { solicitarAcessoPessoa } from "./actions";
import { formatarCpf } from "@/lib/cpf";

export default function CadastrarAcessoForm() {
  const [state, formAction, pending] = useActionState(solicitarAcessoPessoa, undefined);
  const [cpf, setCpf] = useState("");

  if (state?.fase === "enviado") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        <h1 className="text-xl font-semibold text-navy-900">Verifique seu e-mail</h1>
        <p className="text-sm text-stone-600">
          Mandamos um link de confirmação pro e-mail cadastrado. Ele vale
          por 24 horas — clique nele pra criar sua senha.
        </p>
        <Link href="/portal/entrar" className="text-brand-700 underline text-sm">
          Voltar pro login
        </Link>
      </div>
    );
  }

  if (state?.fase === "precisa-email") {
    return (
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md"
      >
        <input type="hidden" name="documento" value={state.documento} />
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Falta seu e-mail</h1>
          <p className="text-sm text-stone-500 mt-1">
            Não achamos nenhum e-mail no seu cadastro ainda — informe um
            pra receber o link de confirmação.
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
        {state.erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.erro}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 mt-1 disabled:opacity-50 transition-colors"
        >
          {pending ? "Enviando..." : "Enviar link de confirmação"}
        </button>
      </form>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md"
    >
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Configurar acesso ao Portal</h1>
        <p className="text-sm text-stone-500 mt-1">
          Informe o CPF que você usa pra bater ponto — vamos mandar um
          link de confirmação pro seu e-mail.{" "}
          <Link href="/portal/entrar" className="text-brand-700 underline">
            Já tem senha? Entrar
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

      {state?.fase === "erro" && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
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
        {pending ? "Verificando..." : "Continuar"}
      </button>
    </form>
  );
}
