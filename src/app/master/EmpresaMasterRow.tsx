"use client";

import { useActionState, useState, useTransition } from "react";
import {
  acessarEmpresa,
  desativarEmpresaMaster,
  excluirEmpresaMaster,
  reativarEmpresaMaster,
  vincularEmpresaAoMeuLogin,
} from "./actions";
import type { StatusAssinatura } from "@/generated/prisma/enums";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string | null;
  statusAssinatura: StatusAssinatura;
  assinaturaVenceEm: Date | null;
  counts: { funcoes: number; totens: number; turnos: number };
  /// Só preenchidos enquanto a última desativação foi manual (ver
  /// desativarEmpresaMaster) — voltam a null depois de reativada
  /// (reativarEmpresaMaster), mesmo a empresa ficando CANCELADA de novo
  /// depois por outro motivo (cobrança, por ex.).
  desativadaEm: Date | null;
  motivoDesativacao: string | null;
  desativadaPorEmail: string | null;
};

const STATUS_LABEL: Record<StatusAssinatura, string> = {
  TRIAL: "Trial",
  ATIVA: "Ativa",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const STATUS_CLASSE: Record<StatusAssinatura, string> = {
  TRIAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ATIVA: "bg-brand-50 text-brand-700 border-brand-200",
  ATRASADA: "bg-red-50 text-red-700 border-red-200",
  CANCELADA: "bg-stone-100 text-stone-600 border-stone-200",
};

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function EmpresaMasterRow({
  empresa,
  vinculadoEm,
  jaMinha,
}: {
  empresa: Empresa;
  /// UsuarioEmpresa.criadoEm já formatado (dd/mm/aaaa, fuso de Brasília) —
  /// quando ESTE login virou dono desta empresa (pode ser bem depois da
  /// própria empresa ter sido criada, ex.: convite/transferência). Null
  /// pras empresas "sem dono vinculado", que não têm esse vínculo.
  vinculadoEm: string | null;
  jaMinha: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<"excluir" | "desativar" | null>(null);
  const desativadaManualmente = empresa.desativadaEm !== null;

  return (
    <li className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-navy-900 flex items-center gap-1.5 flex-wrap">
          {empresa.nome}
          <span
            className={`text-[10px] font-medium uppercase tracking-wide rounded-full border px-1.5 py-0.5 shrink-0 ${STATUS_CLASSE[empresa.statusAssinatura]}`}
          >
            {STATUS_LABEL[empresa.statusAssinatura]}
          </span>
        </p>
        <p className="text-sm text-stone-500">
          {empresa.cnpj}
          {empresa.endereco ? ` · ${empresa.endereco}` : ""}
        </p>
        <p className="text-sm text-stone-600 mt-1">
          {empresa.counts.funcoes} funções · {empresa.counts.totens} totens ·{" "}
          {empresa.counts.turnos} turnos
        </p>
        {vinculadoEm && <p className="text-xs text-stone-400 mt-1">Vinculada em {vinculadoEm}</p>}
        {desativadaManualmente && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 max-w-md">
            <p className="font-semibold">
              ⛔ Desativada manualmente em {formatarData(empresa.desativadaEm!)}
              {empresa.desativadaPorEmail ? ` por ${empresa.desativadaPorEmail}` : ""}
            </p>
            {empresa.motivoDesativacao && <p className="mt-0.5">Motivo: {empresa.motivoDesativacao}</p>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {jaMinha ? (
          <span className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-1">
            ✓ Sua empresa
          </span>
        ) : (
          <button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await vincularEmpresaAoMeuLogin(empresa.id);
              });
            }}
            className="text-sm text-brand-700 hover:text-brand-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
          >
            🔗 Marcar como minha
          </button>
        )}

        {desativadaManualmente ? (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Reativar "${empresa.nome}"? O painel dela volta a funcionar na hora.`)) {
                startTransition(async () => {
                  await reativarEmpresaMaster(empresa.id);
                });
              }
            }}
            className="text-sm text-brand-700 hover:text-brand-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
          >
            ✓ Reativar
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => setModal("desativar")}
            className="text-sm text-amber-700 hover:text-amber-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
          >
            ⛔ Desativar
          </button>
        )}

        <button
          disabled={pending}
          onClick={() => setModal("excluir")}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
        >
          Excluir permanentemente
        </button>

        <form action={acessarEmpresa.bind(null, empresa.id)}>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 font-medium transition-colors shrink-0"
          >
            Acessar
          </button>
        </form>
      </div>

      {modal === "excluir" && <ExcluirEmpresaModal empresa={empresa} onClose={() => setModal(null)} />}
      {modal === "desativar" && (
        <DesativarEmpresaModal empresaId={empresa.id} nome={empresa.nome} onClose={() => setModal(null)} />
      )}
    </li>
  );
}

/** Excluir apaga de verdade (cascata do schema: funções, totens, turnos,
 * pagamentos...) e não tem volta — pedido do Thiago em 2026-09-26 pra
 * exigir "várias aprovações dele mesmo" antes de deixar acontecer. Duas
 * barreiras reais em vez de só um confirm() clicável no automático:
 * digitar o CNPJ exato (obriga parar e conferir QUAL empresa é) + mais um
 * confirm() nativo como último freio antes de disparar a action. */
function ExcluirEmpresaModal({ empresa, onClose }: { empresa: Empresa; onClose: () => void }) {
  const [digitado, setDigitado] = useState("");
  const [pending, startTransition] = useTransition();
  const confirmado = digitado.trim() === empresa.cnpj;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col gap-3">
        <h2 className="font-bold text-navy-900 text-lg">Excluir &quot;{empresa.nome}&quot; de verdade?</h2>
        <p className="text-sm text-stone-600">
          Isso apaga TODAS as funções, totens, turnos, pagamentos e todo o resto dessa empresa, sem
          volta nenhuma. Se é só pra parar de usar por algum motivo (e poder reverter depois), use
          &quot;Desativar&quot; em vez disso.
        </p>
        <label className="text-xs text-stone-500 flex flex-col gap-1">
          Pra confirmar, digite o CNPJ exato da empresa: <strong className="text-navy-900">{empresa.cnpj}</strong>
          <input
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            autoFocus
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-300 text-sm py-2 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!confirmado || pending}
            onClick={() => {
              if (!confirm(`Última confirmação: apagar "${empresa.nome}" PRA SEMPRE, sem volta?`)) return;
              startTransition(async () => {
                await excluirEmpresaMaster(empresa.id);
                onClose();
              });
            }}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Excluindo..." : "Excluir para sempre"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Desativação reversível (ver desativarEmpresaMaster) — só bloqueia o
 * painel, motivo é obrigatório (validado de novo no servidor). Fecha
 * sozinho quando a action confirma sucesso — mesmo padrão de "resync
 * durante o render" já usado em NovaVagaForm.tsx (compara o state
 * anterior no corpo do componente em vez de useEffect). */
function DesativarEmpresaModal({
  empresaId,
  nome,
  onClose,
}: {
  empresaId: number;
  nome: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(desativarEmpresaMaster, undefined);
  const [stateAnterior, setStateAnterior] = useState(state);
  if (state !== stateAnterior) {
    setStateAnterior(state);
    if (state?.sucesso) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form
        action={formAction}
        className="relative w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col gap-3"
      >
        <input type="hidden" name="empresaId" value={empresaId} />
        <h2 className="font-bold text-navy-900 text-lg">Desativar &quot;{nome}&quot;?</h2>
        <p className="text-sm text-stone-600">
          O painel dessa empresa fica bloqueado até você reativar — nada é apagado, dá pra reverter a
          qualquer momento.
        </p>
        <label className="text-xs text-stone-500 flex flex-col gap-1">
          Motivo da desativação (obrigatório)
          <textarea
            name="motivo"
            required
            minLength={10}
            rows={3}
            autoFocus
            placeholder="Ex.: pedido do próprio dono, empresa duplicada, suspeita de fraude..."
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>
        {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-300 text-sm py-2 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 disabled:opacity-50 transition-colors"
          >
            {pending ? "Desativando..." : "Desativar"}
          </button>
        </div>
      </form>
    </div>
  );
}
