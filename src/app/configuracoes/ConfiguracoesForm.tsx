"use client";

import { useActionState, useRef, useState } from "react";
import { atualizarConfiguracoes } from "./actions";

export default function ConfiguracoesForm({
  nome,
  cnpj,
  email,
  endereco,
  numero,
  complemento,
  bairro,
  cidade,
  cep,
}: {
  nome: string;
  cnpj: string;
  email: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
}) {
  const [state, formAction, pending] = useActionState(atualizarConfiguracoes, undefined);

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
      // Só preenche o que ainda está vazio — não sobrescreve o que já
      // estava salvo/digitado antes de mexer no CEP.
      if (enderecoRef.current && !enderecoRef.current.value) enderecoRef.current.value = dados.logradouro ?? "";
      if (bairroRef.current && !bairroRef.current.value) bairroRef.current.value = dados.bairro ?? "";
      if (cidadeRef.current && !cidadeRef.current.value) cidadeRef.current.value = dados.localidade ?? "";
    } catch {
      // Falha de rede na busca do CEP — preenche os campos à mão normalmente.
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <h2 className="font-semibold text-navy-900">Dados da empresa</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome</label>
        <input
          name="nome"
          required
          defaultValue={nome}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">CNPJ</label>
        <input
          name="cnpj"
          required
          defaultValue={cnpj}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">E-mail de contato</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={email}
          placeholder="financeiro@suaempresa.com"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-xs text-stone-400">Pra onde vão as cobranças e avisos da empresa.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">CEP (opcional)</label>
          <input
            name="cep"
            defaultValue={cep}
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
            defaultValue={endereco}
            placeholder="Preenche sozinho a partir do CEP"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Bairro (opcional)</label>
          <input
            ref={bairroRef}
            name="bairro"
            defaultValue={bairro}
            placeholder="Preenche sozinho"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Cidade (opcional)</label>
          <input
            ref={cidadeRef}
            name="cidade"
            defaultValue={cidade}
            placeholder="Preenche sozinho"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Número (opcional)</label>
          <input
            name="numero"
            defaultValue={numero}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Complemento (opcional)</label>
          <input
            name="complemento"
            defaultValue={complemento}
            placeholder="Sala, bloco..."
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Dados salvos.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
