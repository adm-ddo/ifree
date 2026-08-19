import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import FuncaoRow from "./FuncaoRow";
import NovaFuncaoForm from "./NovaFuncaoForm";

export default async function FuncoesPage() {
  const sessao = await requireTenant();

  const funcoes = await prisma.funcao.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, valorHoraPadrao: true, ativo: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Funções</h1>
        <p className="text-stone-600 mt-1 text-sm">
          As funções que aparecem no totem, com o valor/hora padrão de cada
          uma.
        </p>
      </div>

      {funcoes.length === 0 && (
        <p className="text-stone-500 text-sm">
          Nenhuma função cadastrada ainda.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {funcoes.map((funcao) => (
          <FuncaoRow
            key={funcao.id}
            funcao={{ ...funcao, valorHoraPadrao: Number(funcao.valorHoraPadrao) }}
          />
        ))}
      </ul>

      <NovaFuncaoForm />
    </div>
  );
}
