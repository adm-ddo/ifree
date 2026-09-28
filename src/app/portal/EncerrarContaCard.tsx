"use client";

import { useState, useTransition } from "react";
import { desativarMinhaConta, excluirMinhaConta } from "./actions";

/** desativarMinhaConta/excluirMinhaConta terminam em redirect("/portal/conta")
 * quando dão certo — lança a exceção especial do Next (digest começando
 * com NEXT_REDIRECT) que precisa passar direto. Mesmo padrão de
 * ConverterVinculoButton.tsx. */
function useAcaoComRedirect() {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rodar(acao: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
      } catch (e) {
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          typeof (e as { digest?: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw e;
        }
        setErro("Não foi possível concluir agora — tenta de novo.");
      }
    });
  }

  return { erro, pending, rodar };
}

/** Card de "zona de risco" no fim da home do Portal — desativar (reversível,
 * um clique + confirmação simples) e excluir (irreversível pelo Portal,
 * precisa digitar "EXCLUIR" pra habilitar o botão, mais uma última
 * confirmação nativa) — pedido do Thiago em 2026-09-28: dar pro
 * freelancer o controle de pausar ou encerrar o próprio cadastro, sem
 * perder o histórico de turnos/pagamentos por trás. */
export default function EncerrarContaCard() {
  const desativar = useAcaoComRedirect();
  const excluir = useAcaoComRedirect();
  const [textoConfirmacao, setTextoConfirmacao] = useState("");
  const podeExcluir = textoConfirmacao.trim().toUpperCase() === "EXCLUIR";

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-sm flex flex-col gap-4">
      <h2 className="font-semibold text-navy-900 text-sm">Encerrar minha conta</h2>

      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3.5">
        <p className="text-sm font-medium text-navy-900">⏸️ Desativar (pausar)</p>
        <p className="text-xs text-stone-500">
          Some das vagas e do quadro de candidatos das empresas até você reativar. Nada é
          apagado — você reativa fazendo login de novo quando quiser.
        </p>
        <button
          type="button"
          disabled={desativar.pending}
          onClick={() => {
            if (
              confirm(
                "Desativar sua conta? Você para de aparecer pras empresas e não consegue mais ver/se candidatar a vagas até reativar. Dá pra reverter a qualquer momento fazendo login de novo."
              )
            ) {
              desativar.rodar(desativarMinhaConta);
            }
          }}
          className="self-start rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
        >
          {desativar.pending ? "Desativando..." : "Desativar minha conta"}
        </button>
        {desativar.erro && <p className="text-sm text-red-600">{desativar.erro}</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-white p-3.5">
        <p className="text-sm font-medium text-red-700">🗑️ Excluir de vez</p>
        <p className="text-xs text-stone-500">
          Irreversível — você não consegue mais desfazer isso pelo Portal. Seu histórico de
          turnos e pagamentos continua guardado (é registro de trabalho), mas seu cadastro some
          de qualquer busca ou vaga.
        </p>
        <label className="flex flex-col gap-1 text-xs text-stone-600">
          Digite EXCLUIR pra confirmar
          <input
            type="text"
            value={textoConfirmacao}
            onChange={(e) => setTextoConfirmacao(e.target.value)}
            placeholder="EXCLUIR"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 max-w-[10rem]"
          />
        </label>
        <button
          type="button"
          disabled={!podeExcluir || excluir.pending}
          onClick={() => {
            if (
              confirm(
                "Última confirmação: excluir sua conta do iFREE pra sempre, sem volta pelo Portal?"
              )
            ) {
              excluir.rodar(excluirMinhaConta);
            }
          }}
          className="self-start rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {excluir.pending ? "Excluindo..." : "Excluir minha conta pra sempre"}
        </button>
        {excluir.erro && <p className="text-sm text-red-600">{excluir.erro}</p>}
      </div>
    </div>
  );
}
