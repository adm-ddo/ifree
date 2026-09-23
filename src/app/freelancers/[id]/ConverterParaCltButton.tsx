"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { converterParaClt } from "../actions";

/** Botão de conversão pra CLT — diferente do ConverterVinculoButton
 * genérico porque precisa perguntar, na hora da conversão, se a pessoa
 * está virando CLT "a partir de hoje" (reseta só a configuração padrão de
 * pagamento do vínculo, que deixa de fazer sentido pra CLT) ou se ela já
 * trabalhava/deveria ser CLT desde uma data anterior (cadastro atrasado) —
 * nesse caso a data de admissão fica retroativa (base do cálculo de
 * férias/experiência). Em NENHUM dos dois casos os turnos/pagamentos de
 * extra já existentes são apagados ou zerados — continuam pendentes/pagos
 * como estavam, e ainda ficam visíveis em /funcionarios/[id] (ver
 * PagamentosExtraPendentesCard) até serem pagos ou dispensados
 * manualmente. */
export default function ConverterParaCltButton({
  pessoaId,
  pessoaNome,
  responsavelGed,
}: {
  pessoaId: number;
  pessoaNome: string;
  /// Mostra o link de gerar a declaração de recusa da oferta CLT (GED)
  /// só pra quem tem acesso ao módulo — sem essa checagem, quem não é
  /// responsável pelo GED clicaria e cairia num redirecionamento sem
  /// explicação (requireResponsavelGed na rota de destino).
  responsavelGed?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"hoje" | "retroativo">("hoje");
  const [dataAdmissao, setDataAdmissao] = useState(new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (modo === "retroativo" && !dataAdmissao) {
      setErro("Informe a data de admissão.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      try {
        const resultado = await converterParaClt(pessoaId, modo === "retroativo" ? dataAdmissao : null);
        if (resultado?.erro) setErro(resultado.erro);
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
        setErro("Não foi possível converter.");
      }
    });
  }

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 self-start"
        >
          🧑‍💼 Converter para funcionário CLT
        </button>
        {responsavelGed && (
          <Link
            href={`/ged/pessoas/${pessoaId}/gerar/TERMO_CIENCIA?termoSlug=opcao-autonomo-apos-oferta-clt`}
            className="text-sm text-stone-500 hover:text-brand-700 hover:underline"
          >
            Ofereceu CLT e {pessoaNome.split(" ")[0]} preferiu continuar como extra? Gerar declaração →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 max-w-md">
      <p className="text-sm text-stone-700">
        Converter <strong>{pessoaNome}</strong> para funcionário CLT? Ela vai sair do cálculo de
        extra e passar a aparecer em /funcionarios.
      </p>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="radio"
            name="modoConversao"
            checked={modo === "hoje"}
            onChange={() => setModo("hoje")}
            className="mt-1"
          />
          <span>
            Converter a partir de hoje
            <span className="block text-xs text-stone-500">
              Só reseta a configuração padrão de pagamento do vínculo (não se aplica mais depois de virar CLT). Turnos/pagamentos de extra já feitos não são afetados. Defina a data de admissão depois, se quiser.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="radio"
            name="modoConversao"
            checked={modo === "retroativo"}
            onChange={() => setModo("retroativo")}
            className="mt-1"
          />
          <span>
            Ela já trabalha como CLT desde uma data anterior
            <span className="block text-xs text-stone-500">
              Os turnos/pagamentos de extra já feitos continuam como estão — só a data de
              admissão fica retroativa.
            </span>
          </span>
        </label>

        {modo === "retroativo" && (
          <label className="flex flex-col gap-1 text-sm text-stone-700 ml-6">
            Data de admissão
            <input
              type="date"
              value={dataAdmissao}
              onChange={(e) => setDataAdmissao(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[12rem]"
            />
          </label>
        )}
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Convertendo..." : "Confirmar conversão"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={pending}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
