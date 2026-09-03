"use client";

import { useActionState, useState } from "react";
import {
  criarDenunciaAnonimaPublica,
  criarDenunciaIdentificadaTotem,
} from "@/app/denuncia/[token]/nova/actions";
import { CATEGORIAS_DENUNCIA } from "@/lib/etica-constantes";
import { formatarCpf } from "@/lib/cpf";

type Modo = "escolha" | "anonimo" | "identificado";

/** Duas variantes de denúncia direto no totem: anônima (protocolo+senha,
 * mesma tela de sempre) ou identificada por CPF (sem senha — a pessoa
 * acompanha depois logada no Portal, em "Minhas denúncias", igual a
 * quando ela se identifica de dentro do próprio Portal). A escolha entre
 * as duas é a primeira coisa que aparece, antes de qualquer formulário. */
export default function TotemNovaDenunciaForm({
  tokenDenuncia,
  aoVoltar,
  aoConcluir,
}: {
  tokenDenuncia: string;
  aoVoltar: () => void;
  aoConcluir: () => void;
}) {
  const [modo, setModo] = useState<Modo>("escolha");

  if (modo === "anonimo") {
    return (
      <FormularioAnonimo tokenDenuncia={tokenDenuncia} aoVoltar={() => setModo("escolha")} aoConcluir={aoConcluir} />
    );
  }

  if (modo === "identificado") {
    return (
      <FormularioIdentificado
        tokenDenuncia={tokenDenuncia}
        aoVoltar={() => setModo("escolha")}
        aoConcluir={aoConcluir}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
      <h1 className="text-2xl font-semibold text-navy-900 text-center">Fazer uma denúncia</h1>
      <p className="text-lg text-stone-600 text-center">
        Você quer se identificar (a denúncia fica no seu perfil, pra
        acompanhar logada no Portal) ou prefere continuar anônimo?
      </p>

      <button
        type="button"
        onClick={() => setModo("identificado")}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 transition-colors"
      >
        🧑 Identificar-me com meu CPF
      </button>
      <button
        type="button"
        onClick={() => setModo("anonimo")}
        className="rounded-lg border border-stone-300 text-xl font-medium py-4 hover:bg-stone-50 transition-colors"
      >
        🕵️ Continuar anônimo
      </button>
      <button type="button" onClick={aoVoltar} className="text-lg text-stone-500 hover:text-stone-700 underline">
        Voltar
      </button>
    </div>
  );
}

function CamposDenuncia() {
  return (
    <>
      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Tipo de denúncia</label>
        <select
          name="categoria"
          required
          defaultValue=""
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {CATEGORIAS_DENUNCIA.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Descrição</label>
        <textarea
          name="descricao"
          required
          rows={6}
          maxLength={5000}
          placeholder="Descreva o que aconteceu, com o máximo de detalhes possível..."
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </>
  );
}

function FormularioAnonimo({
  tokenDenuncia,
  aoVoltar,
  aoConcluir,
}: {
  tokenDenuncia: string;
  aoVoltar: () => void;
  aoConcluir: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    criarDenunciaAnonimaPublica.bind(null, tokenDenuncia),
    undefined
  );
  const [confirmouAnotacao, setConfirmouAnotacao] = useState(false);

  if (state?.protocolo && state?.senha) {
    return (
      <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
        <h1 className="text-2xl font-semibold text-navy-900 text-center">Denúncia registrada</h1>
        <p className="text-lg text-stone-600 text-center">
          Anote (ou tire um print) o protocolo e a senha — não vão aparecer
          de novo. Você vai precisar dos dois pra acompanhar depois.
        </p>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-white border border-stone-200 p-4">
            <p className="text-sm text-stone-500 uppercase tracking-wide">Protocolo</p>
            <p className="text-3xl font-mono font-semibold text-navy-900">{state.protocolo}</p>
          </div>
          <div className="rounded-lg bg-white border border-stone-200 p-4">
            <p className="text-sm text-stone-500 uppercase tracking-wide">Senha</p>
            <p className="text-3xl font-mono font-semibold text-navy-900">{state.senha}</p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-lg text-stone-700">
          <input
            type="checkbox"
            checked={confirmouAnotacao}
            onChange={(e) => setConfirmouAnotacao(e.target.checked)}
            className="mt-1 h-5 w-5 accent-brand-600"
          />
          Já anotei ou tirei um print.
        </label>

        {confirmouAnotacao && (
          <button
            type="button"
            onClick={aoConcluir}
            className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 transition-colors"
          >
            Concluir
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
      <h1 className="text-2xl font-semibold text-navy-900 text-center">Denúncia anônima</h1>
      <p className="text-lg text-stone-600 text-center">
        Canal confidencial — ninguém fica sabendo que você usou este
        tablet pra denunciar.
      </p>

      <CamposDenuncia />

      {state?.erro && (
        <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando..." : "Registrar denúncia anônima"}
      </button>
      <button type="button" onClick={aoVoltar} className="text-lg text-stone-500 hover:text-stone-700 underline">
        Voltar
      </button>
    </form>
  );
}

function FormularioIdentificado({
  tokenDenuncia,
  aoVoltar,
  aoConcluir,
}: {
  tokenDenuncia: string;
  aoVoltar: () => void;
  aoConcluir: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    criarDenunciaIdentificadaTotem.bind(null, tokenDenuncia),
    undefined
  );
  const [documento, setDocumento] = useState("");

  if (state?.protocolo) {
    return (
      <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
        <h1 className="text-2xl font-semibold text-navy-900 text-center">Denúncia registrada</h1>
        <p className="text-lg text-stone-600 text-center">
          Você pode acompanhar essa denúncia logando no Portal (Conecta),
          em &ldquo;Minhas denúncias&rdquo;. Guarde também o protocolo abaixo, se
          quiser.
        </p>

        <div className="rounded-lg bg-white border border-stone-200 p-4">
          <p className="text-sm text-stone-500 uppercase tracking-wide">Protocolo</p>
          <p className="text-3xl font-mono font-semibold text-navy-900">{state.protocolo}</p>
        </div>

        <button
          type="button"
          onClick={aoConcluir}
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 transition-colors"
        >
          Concluir
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
      <h1 className="text-2xl font-semibold text-navy-900 text-center">Denúncia identificada</h1>
      <p className="text-lg text-stone-600 text-center">
        Seu nome fica visível pra empresa e a denúncia aparece no seu
        perfil do Portal.
      </p>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Seu CPF</label>
        <input
          name="documento"
          required
          inputMode="numeric"
          value={documento}
          onChange={(e) => setDocumento(formatarCpf(e.target.value))}
          placeholder="000.000.000-00"
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <CamposDenuncia />

      {state?.erro && (
        <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando..." : "Registrar denúncia identificada"}
      </button>
      <button type="button" onClick={aoVoltar} className="text-lg text-stone-500 hover:text-stone-700 underline">
        Voltar
      </button>
    </form>
  );
}
