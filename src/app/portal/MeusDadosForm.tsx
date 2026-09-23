"use client";

import { useActionState, useState } from "react";
import { atualizarMeusDados } from "./actions";
import { detectarTipoChavePix, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import { MEIOS_TRANSPORTE } from "@/lib/transporte";

type Dados = {
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  chavePix: string;
  rg: string;
  dataNascimento: string;
  contatoEmergenciaNome: string;
  contatoEmergenciaTelefone: string;
  meiosTransporte: string[];
};

type EnderecoAuto = { endereco: string; bairro: string; cidade: string };

export default function MeusDadosForm({ dadosIniciais }: { dadosIniciais: Dados }) {
  const [state, formAction, pending] = useActionState(atualizarMeusDados, undefined);
  const [aberto, setAberto] = useState(false);
  const [chavePix, setChavePix] = useState(dadosIniciais.chavePix);
  const [cep, setCep] = useState(dadosIniciais.cep);
  const [enderecoAuto, setEnderecoAuto] = useState<EnderecoAuto>({
    endereco: dadosIniciais.endereco,
    bairro: dadosIniciais.bairro,
    cidade: dadosIniciais.cidade,
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  // Resincroniza durante a renderização se o dado do banco mudar depois da
  // primeira montagem (ex.: página se atualiza sozinha após salvar outro
  // card desta mesma tela) — sem isso o campo ficava preso no valor de
  // quando a tela abriu.
  const [chavePixAnterior, setChavePixAnterior] = useState(dadosIniciais.chavePix);
  if (dadosIniciais.chavePix !== chavePixAnterior) {
    setChavePixAnterior(dadosIniciais.chavePix);
    setChavePix(dadosIniciais.chavePix);
  }

  const [cepAnterior, setCepAnterior] = useState(dadosIniciais.cep);
  if (dadosIniciais.cep !== cepAnterior) {
    setCepAnterior(dadosIniciais.cep);
    setCep(dadosIniciais.cep);
    setEnderecoAuto({
      endereco: dadosIniciais.endereco,
      bairro: dadosIniciais.bairro,
      cidade: dadosIniciais.cidade,
    });
  }

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    setErroCep(null);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (dados.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }
      setEnderecoAuto({
        endereco: dados.logradouro || enderecoAuto.endereco,
        bairro: dados.bairro || enderecoAuto.bairro,
        cidade: dados.localidade || enderecoAuto.cidade,
      });
    } catch {
      setErroCep("Não foi possível consultar o CEP agora — preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-brand-700 hover:underline self-start"
      >
        ✏️ Editar dados pessoais e de contato
      </button>
    );
  }

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900 text-sm">Editar dados de contato</h2>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Telefone (WhatsApp)
        <input
          name="telefone"
          defaultValue={dadosIniciais.telefone}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        CEP
        <input
          name="cep"
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          onBlur={(e) => buscarCep(e.target.value)}
          required
          placeholder="00000-000"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {buscandoCep && <span className="text-xs text-stone-500">Buscando endereço...</span>}
        {erroCep && <span className="text-xs text-amber-600">{erroCep}</span>}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Endereço (rua)
          <input
            name="endereco"
            value={enderecoAuto.endereco}
            onChange={(e) => setEnderecoAuto((a) => ({ ...a, endereco: e.target.value }))}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Número
          <input
            name="numero"
            defaultValue={dadosIniciais.numero}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Complemento (opcional)
          <input
            name="complemento"
            defaultValue={dadosIniciais.complemento}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Bairro
          <input
            name="bairro"
            value={enderecoAuto.bairro}
            onChange={(e) => setEnderecoAuto((a) => ({ ...a, bairro: e.target.value }))}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Cidade
        <input
          name="cidade"
          value={enderecoAuto.cidade}
          onChange={(e) => setEnderecoAuto((a) => ({ ...a, cidade: e.target.value }))}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Chave PIX
        <input
          name="chavePix"
          value={chavePix}
          onChange={(e) => setChavePix(e.target.value)}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {chavePix.trim() && (
          <span className="text-xs text-stone-500">
            Tipo detectado:{" "}
            <span className="font-medium text-stone-700">
              {LABEL_TIPO_CHAVE_PIX[detectarTipoChavePix(chavePix)]}
            </span>
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          RG (opcional)
          <input
            name="rg"
            defaultValue={dadosIniciais.rg}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Data de nascimento
          <input
            name="dataNascimento"
            type="date"
            defaultValue={dadosIniciais.dataNascimento}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Contato de emergência — nome (opcional)
          <input
            name="contatoEmergenciaNome"
            defaultValue={dadosIniciais.contatoEmergenciaNome}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Contato de emergência — telefone (opcional)
          <input
            name="contatoEmergenciaTelefone"
            defaultValue={dadosIniciais.contatoEmergenciaTelefone}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-stone-700">Como você costuma chegar no trabalho? (opcional)</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {MEIOS_TRANSPORTE.map((meio) => (
            <label key={meio} className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="meiosTransporte"
                value={meio}
                defaultChecked={dadosIniciais.meiosTransporte.includes(meio)}
              />
              {meio}
            </label>
          ))}
        </div>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Dados atualizados.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2.5"
        >
          Fechar
        </button>
      </div>
    </form>
  );
}
