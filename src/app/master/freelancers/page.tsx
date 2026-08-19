import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PessoaMasterRow from "./PessoaMasterRow";

export default async function MasterFreelancersPage() {
  await requireMaster();

  const pessoas = await prisma.pessoa.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      documento: true,
      tipoDocumento: true,
      telefone: true,
      _count: { select: { turnos: true, vinculos: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/master" className="text-sm text-brand-700 hover:underline">
          ← Painel Master
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Freelancers</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Todo cadastro global de freelancer (CPF/CNPJ), de todas as
          empresas. Só é possível excluir quem não tem nenhum turno
          registrado — é histórico de trabalho/pagamento.
        </p>
      </div>

      {pessoas.length === 0 && (
        <p className="text-stone-500 text-sm">Nenhum freelancer cadastrado ainda.</p>
      )}

      <ul className="flex flex-col gap-2">
        {pessoas.map((p) => (
          <PessoaMasterRow
            key={p.id}
            pessoa={{
              id: p.id,
              nome: p.nome,
              documento: p.documento,
              tipoDocumento: p.tipoDocumento,
              telefone: p.telefone,
              totalTurnos: p._count.turnos,
              totalEmpresas: p._count.vinculos,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
