"use client";

import { useActionState, useState, useTransition } from "react";
import { atualizarBeneficios } from "../actions";
import { formatarValorMoeda } from "@/lib/moeda";

type Item = { recebe: boolean; valor: number | null };
type Transporte = Item & { comDesconto: boolean };

export default function BeneficiosForm({
  pessoaId,
  insalubridade,
  periculosidade,
  transporte,
  bonificacao,
  premioAssiduidade,
}: {
  pessoaId: number;
  insalubridade: Item;
  periculosidade: Item;
  transporte: Transporte;
  bonificacao: Item;
  premioAssiduidade: Item;
}) {
  const [state, formAction, pending] = useActionState(atualizarBeneficios, undefined);
  const [, startTransition] = useTransition();

  return (
    <form
      // Nunca `action={formAction}` direto — depois de uma Server Action
      // terminar com sucesso, o React 19 reseta o <form> nativamente pro
      // estado que ele tinha quando a página carregou (afeta até campo
      // controlado, já que o reset mexe direto no DOM sem o React saber).
      // Pra um formulário com radio/checkbox que mudam de marcação, isso
      // fazia a bolinha voltar sozinha pra "Nenhum" mesmo com o valor tendo
      // salvo certo. Disparando a action na mão (sem submit nativo do
      // browser) evita esse reset automático por completo.
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => formAction(new FormData(e.currentTarget)));
      }}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Adicionais e benefícios</h2>
        <p className="text-xs text-stone-500 mt-1">
          Valor livre em R$, informativo — sem cálculo automático por
          percentual. A bonificação não entra na base do salário.
        </p>
      </div>

      <CampoBeneficio
        label="Insalubridade"
        nomeRecebe="recebeInsalubridade"
        nomeValor="valorInsalubridade"
        inicial={insalubridade}
      />
      <CampoBeneficio
        label="Periculosidade"
        nomeRecebe="recebePericulosidade"
        nomeValor="valorPericulosidade"
        inicial={periculosidade}
      />
      <CampoTransporte inicial={transporte} />
      <CampoBeneficio
        label="Bonificação (não soma no salário)"
        nomeRecebe="recebeBonificacao"
        nomeValor="valorBonificacao"
        inicial={bonificacao}
      />
      <CampoBeneficio
        label="Prêmio de assiduidade (usado no termo de ciência do GED)"
        nomeRecebe="recebePremioAssiduidade"
        nomeValor="valorPremioAssiduidade"
        inicial={premioAssiduidade}
      />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Benefícios salvos.
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

function CampoBeneficio({
  label,
  nomeRecebe,
  nomeValor,
  inicial,
}: {
  label: string;
  nomeRecebe: string;
  nomeValor: string;
  inicial: Item;
}) {
  const [marcado, setMarcado] = useState(inicial.recebe);
  const [valor, setValor] = useState(inicial.valor !== null ? inicial.valor.toFixed(2).replace(".", ",") : "");

  // Resincroniza durante a renderização (não num efeito, pra não gastar
  // uma renderização extra à toa) sempre que o dado do banco muda — sem
  // isso, o checkbox só refletia o valor salvo na primeira vez que a tela
  // montava, e ficava desatualizado se o dado real mudasse depois (ex.: a
  // página se atualiza sozinha após salvar outro campo desta mesma tela).
  //
  // Só faz isso ANTES da pessoa mexer no campo (!tocado) — depois que ela
  // interage, o estado local já é a fonte da verdade, e resincronizar com
  // `inicial` vira perigoso: bem no instante em que o "Salvar" termina, o
  // revalidatePath às vezes traz de volta um prop uma piscada desatualizado
  // (a releitura chega antes da escrita ficar visível), e sem essa trava o
  // checkbox voltava pra "desmarcado" mesmo com o valor tendo salvo certo.
  const [tocado, setTocado] = useState(false);
  const [inicialAnterior, setInicialAnterior] = useState(inicial);
  if (!tocado && (inicial.recebe !== inicialAnterior.recebe || inicial.valor !== inicialAnterior.valor)) {
    setInicialAnterior(inicial);
    setMarcado(inicial.recebe);
    setValor(inicial.valor !== null ? inicial.valor.toFixed(2).replace(".", ",") : "");
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <label className="flex items-center gap-2 text-sm text-stone-700 sm:w-56 sm:shrink-0">
        <input
          type="checkbox"
          name={nomeRecebe}
          checked={marcado}
          onChange={(e) => {
            setTocado(true);
            setMarcado(e.target.checked);
          }}
          className="rounded border-stone-300"
        />
        {label}
      </label>
      <input
        name={nomeValor}
        value={valor}
        onChange={(e) => {
          setTocado(true);
          setValor(formatarValorMoeda(e.target.value));
        }}
        disabled={!marcado}
        inputMode="decimal"
        placeholder="R$ 0,00"
        className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-full sm:flex-1 sm:w-auto focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-stone-100 disabled:text-stone-400"
      />
    </div>
  );
}

type TipoTransporte = "nenhum" | "ajuda_custo" | "vale_transporte";

/** Transporte não é uma escolha livre entre "vale-transporte" ou "ajuda de
 * custo" com um desconto opcional por cima — são dois benefícios
 * diferentes de verdade: ajuda de custo é uma liberalidade (presente),
 * sem desconto, que não integra férias/13º/rescisão; vale-transporte
 * desconta 6% em folha e integra essas verbas normalmente. Escolha
 * explícita em vez de checkbox+sub-checkbox evita configurar o tipo
 * errado sem perceber — só muda a apresentação, o dado gravado continua
 * sendo recebeTransporte + transporteComDesconto. */
function CampoTransporte({ inicial }: { inicial: Transporte }) {
  const tipoInicial: TipoTransporte = !inicial.recebe
    ? "nenhum"
    : inicial.comDesconto
      ? "vale_transporte"
      : "ajuda_custo";
  const [tipo, setTipo] = useState<TipoTransporte>(tipoInicial);
  const [valor, setValor] = useState(inicial.valor !== null ? inicial.valor.toFixed(2).replace(".", ",") : "");

  // Mesmo motivo e mesma trava do CampoBeneficio acima (ver comentário lá)
  // — só resincroniza com `inicial` ANTES da pessoa mexer no campo. Sem o
  // `!tocado`, bem no instante em que "Salvar" termina, o revalidatePath
  // podia trazer de volta um prop uma piscada desatualizado (a releitura
  // chega antes da escrita ficar visível) e a bolinha voltava pra "Nenhum"
  // mesmo com o valor tendo salvo certo.
  const [tocado, setTocado] = useState(false);
  const [inicialAnterior, setInicialAnterior] = useState(inicial);
  if (
    !tocado &&
    (inicial.recebe !== inicialAnterior.recebe ||
      inicial.comDesconto !== inicialAnterior.comDesconto ||
      inicial.valor !== inicialAnterior.valor)
  ) {
    setInicialAnterior(inicial);
    setTipo(!inicial.recebe ? "nenhum" : inicial.comDesconto ? "vale_transporte" : "ajuda_custo");
    setValor(inicial.valor !== null ? inicial.valor.toFixed(2).replace(".", ",") : "");
  }

  const marcado = tipo !== "nenhum";

  function mudarTipo(novoTipo: TipoTransporte) {
    setTocado(true);
    setTipo(novoTipo);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-stone-100 pt-3 first:border-0 first:pt-0">
      {marcado && <input type="hidden" name="recebeTransporte" value="on" />}
      {tipo === "vale_transporte" && (
        <input type="hidden" name="transporteComDesconto" value="on" />
      )}

      <p className="text-sm text-stone-700">Transporte / ajuda de custo</p>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
          <input
            type="radio"
            name="tipoTransporteExibicao"
            checked={tipo === "nenhum"}
            onChange={() => mudarTipo("nenhum")}
            className="mt-0.5"
          />
          <span className="text-sm text-stone-700">Nenhum</span>
        </label>
        <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
          <input
            type="radio"
            name="tipoTransporteExibicao"
            checked={tipo === "ajuda_custo"}
            onChange={() => mudarTipo("ajuda_custo")}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-navy-900">
              🎁 Ajuda de custo
            </span>
            <span className="block text-xs text-stone-500">
              Presente — sem desconto em folha, não entra em férias/13º/rescisão.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
          <input
            type="radio"
            name="tipoTransporteExibicao"
            checked={tipo === "vale_transporte"}
            onChange={() => mudarTipo("vale_transporte")}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-navy-900">
              🚌 Vale-transporte
            </span>
            <span className="block text-xs text-stone-500">
              Desconta 6% em folha — entra em férias/13º/rescisão.
            </span>
          </span>
        </label>
      </div>

      {marcado && (
        <input
          name="valorTransporte"
          value={valor}
          onChange={(e) => {
            setTocado(true);
            setValor(formatarValorMoeda(e.target.value));
          }}
          inputMode="decimal"
          placeholder="R$ 0,00"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-full sm:max-w-[14rem] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      )}
    </div>
  );
}
