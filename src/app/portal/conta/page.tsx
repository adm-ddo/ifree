import { redirect } from "next/navigation";
import { requirePessoa } from "@/lib/auth-pessoa";
import { logoutPessoa } from "@/lib/auth-pessoa-actions";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/data";
import ReativarContaBotao from "./ReativarContaBotao";

/** Tela de destino de quem tem contaDesativadaEm ou contaExcluidaEm
 * setado (ver requirePessoaComTermosAceitos, src/lib/auth-pessoa.ts) —
 * usa requirePessoa() puro, não a versão com o gate de conta, senão
 * redirecionaria pra si mesma. Quem chega aqui sem nenhum dos dois
 * setados (link direto, conta reativada em outra aba) só volta pro
 * /portal normal. */
export default async function MinhaContaPage() {
  const sessao = await requirePessoa();

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: { contaDesativadaEm: true, contaExcluidaEm: true },
  });

  if (!pessoa.contaDesativadaEm && !pessoa.contaExcluidaEm) redirect("/portal");

  if (pessoa.contaExcluidaEm) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-lg text-center items-center">
          <p className="text-4xl">🗑️</p>
          <h1 className="text-xl font-semibold text-navy-900">Conta excluída</h1>
          <p className="text-sm text-stone-600">
            Sua conta no iFREE foi excluída em {formatarDataHora(pessoa.contaExcluidaEm)} e não
            aparece mais pra nenhuma empresa. Essa ação não tem volta por aqui — se foi engano,
            fale com o suporte.
          </p>
          <form action={logoutPessoa}>
            <button
              type="submit"
              className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-lg text-center items-center">
        <p className="text-4xl">⏸️</p>
        <h1 className="text-xl font-semibold text-navy-900">Conta desativada</h1>
        <p className="text-sm text-stone-600">
          Você pausou sua conta em {formatarDataHora(pessoa.contaDesativadaEm!)}. Enquanto estiver
          assim, você não vê nem aparece pra nenhuma vaga. Reative quando quiser voltar.
        </p>
        <ReativarContaBotao />
        <form action={logoutPessoa}>
          <button type="submit" className="text-sm text-stone-500 hover:underline">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
