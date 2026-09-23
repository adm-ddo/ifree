"use client";

import { useActionState, useState } from "react";
import { atualizarDadosPessoaAdmin } from "../actions";
import { detectarTipoChavePix, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";

type Dados = {
  nome: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  chavePix: string;
  email: string;
  rg: string;
  dataNascimento: string;
  cep: string;
  contatoEmergenciaNome: string;
  contatoEmergenciaTelefone: string;
};

export default function DadosPessoaForm({
  pessoaId,
  dadosIniciais,
}: {
  pessoaId: number;
  dadosIniciais: Dados;
}) {
  const [state, formAction, pending] = useActionState(atualizarDadosPessoaAdmin, undefined);
  const [aberto, setAberto] = useState(false);
  const [chavePix, setChavePix] = useState(dadosIniciais.chavePix);

  // Resincroniza durante a renderização se o dado do banco mudar depois da
  // primeira montagem (ex.: página se atualiza sozinha após salvar outro
  // card desta mesma tela) — sem isso o campo ficava preso no valor de
  // quando a tela abriu.
  const [chavePixAnterior, setChavePixAnterior] = useState(dadosIniciais.chavePix);
  if (dadosIniciais.chavePix !== chavePixAnterior) {
    setChavePixAnterior(dadosIniciais.chavePix);
    setChavePix(dadosIniciais.chavePix);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-brand-700 hover:underline self-start"
      >
        ✏️ Editar dados de contato / chave PIX
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
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Editar dados</h2>
        <p className="text-xs text-stone-500 mt-1">
          Útil quando a pessoa não consegue fazer isso na hora pelo totem —
          ex.: só lembra da chave PIX aleatória depois. Vale pra todas as
          empresas onde ela trabalha, já que é o cadastro dela, não um dado
          exclusivo daqui.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Nome completo
        <input
          name="nome"
          defaultValue={dadosIniciais.nome}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Telefone (WhatsApp)
        <input
          name="telefone"
          defaultValue={dadosIniciais.telefone}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Endereço (rua)
          <input
            name="endereco"
            defaultValue={dadosIniciais.endereco}
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

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Complemento (opcional)
        <input
          name="complemento"
          defaultValue={dadosIniciais.complemento}
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
            Tipo detectado: <span className="font-medium text-stone-700">{LABEL_TIPO_CHAVE_PIX[detectarTipoChavePix(chavePix)]}</span>
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          E-mail (opcional)
          <input
            name="email"
            type="email"
            defaultValue={dadosIniciais.email}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          RG (opcional)
          <input
            name="rg"
            defaultValue={dadosIniciais.rg}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Data de nascimento (opcional)
          <input
            name="dataNascimento"
            type="date"
            defaultValue={dadosIniciais.dataNascimento}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          CEP (opcional)
          <input
            name="cep"
            defaultValue={dadosIniciais.cep}
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
