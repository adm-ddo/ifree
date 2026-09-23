import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import FuncaoRow from "@/app/funcoes/FuncaoRow";
import NovaFuncaoForm from "@/app/funcoes/NovaFuncaoForm";

/** Espelho completo de src/app/funcoes/page.tsx (v1, não tocado) — mesma
 * query, e os mesmos FuncaoRow/NovaFuncaoForm reaproveitados sem
 * alteração (já são cartões brancos genéricos, sem chrome do v1). */
export default async function V2FuncoesPage() {
  const sessao = await requireModulo("funcoes");

  const funcoes = await prisma.funcao.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, valorHoraPadrao: true, ativo: true },
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Funções</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          As funções que aparecem no totem, com o valor/hora padrão de cada uma.
        </p>
      </div>

      {funcoes.length === 0 && <p className="text-stone-500 text-sm">Nenhuma função cadastrada ainda.</p>}

      <ul className="flex flex-col gap-2">
        {funcoes.map((funcao) => (
          <FuncaoRow key={funcao.id} funcao={{ ...funcao, valorHoraPadrao: Number(funcao.valorHoraPadrao) }} />
        ))}
      </ul>

      <NovaFuncaoForm />
    </div>
  );
}
