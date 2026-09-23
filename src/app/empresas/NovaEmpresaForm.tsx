"use client";

import { useActionState, useRef, useState } from "react";
import { cadastrarNovaEmpresa } from "./actions";

export default function NovaEmpresaForm() {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(
    cadastrarNovaEmpresa,
    undefined
  );

  const enderecoRef = useRef<HTMLInputElement>(null);
  const bairroRef = useRef<HTMLInputElement>(null);
  const cidadeRef = useRef<HTMLInputElement>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false);

  async function autopreencherPorCep(valorDigitado: string) {
    const cep = valorDigitado.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    setCepNaoEncontrado(false);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) {
        setCepNaoEncontrado(true);
        return;
      }
      if (enderecoRef.current) enderecoRef.current.value = dados.logradouro ?? "";
      if (bairroRef.current) bairroRef.current.value = dados.bairro ?? "";
      if (cidadeRef.current) cidadeRef.current.value = dados.localidade ?? "";
    } catch {
      // Falha de rede na busca do CEP — preenche os campos à mão normalmente.
    } finally {
      setBuscandoCep(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors"
      >
        + Cadastrar nova empresa
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900">Nova empresa</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome da empresa</label>
        <input
          name="nome"
          required
          placeholder="Ex: Restaurante Sabor & Arte"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">CNPJ</label>
        <input
          name="cnpj"
          required
          placeholder="Ex: 12.345.678/0001-90"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">E-mail de contato</label>
        <input
          name="email"
          type="email"
          required
          placeholder="financeiro@suaempresa.com"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">CEP (opcional)</label>
          <input
            name="cep"
            placeholder="00000000"
            onBlur={(e) => autopreencherPorCep(e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-end pb-2 text-xs text-stone-500">
          {buscandoCep && "🔎 Buscando..."}
          {cepNaoEncontrado && !buscandoCep && "CEP não encontrado."}
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-stone-500">Endereço (opcional)</label>
          <input
            ref={enderecoRef}
            name="endereco"
            placeholder="Preenche sozinho a partir do CEP"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Bairro (opcional)</label>
          <input
            ref={bairroRef}
            name="bairro"
            placeholder="Preenche sozinho"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Cidade (opcional)</label>
          <input
            ref={cidadeRef}
            name="cidade"
            placeholder="Preenche sozinho"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Número (opcional)</label>
          <input
            name="numero"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Complemento (opcional)</label>
          <input
            name="complemento"
            placeholder="Sala, bloco..."
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-stone-600">
        <input
          type="checkbox"
          name="aceitouTermos"
          required
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        Li e concordo com os{" "}
        <a href="/termos/empresa" target="_blank" rel="noopener noreferrer" className="underline font-medium text-brand-700">
          Termos de Uso e Política de Privacidade
        </a>{" "}
        do iFREE.
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Cadastrando..." : "Cadastrar e entrar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
