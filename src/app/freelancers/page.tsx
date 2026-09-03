import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import FreelancerRow from "./FreelancerRow";

export default async function FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ desativados?: string }>;
}) {
  const sessao = await requireTenant();
  const { desativados } = await searchParams;
  const mostrarDesativados = desativados === "1";

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "EXTRA" },
    orderBy: { pessoa: { nome: "asc" } },
    select: {
      ativo: true,
      pessoa: {
        select: {
          id: true,
          nome: true,
          documento: true,
          tipoDocumento: true,
          telefone: true,
          chavePix: true,
          tipoChavePix: true,
        },
      },
    },
  });

  const totalDesativados = vinculos.filter((v) => !v.ativo).length;
  const listaExibida = mostrarDesativados ? vinculos : vinculos.filter((v) => v.ativo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Freelancers</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Todo mundo que já bateu CPF/CNPJ no totem desta empresa. Desativar
          aqui impede a pessoa de iniciar um novo turno, sem apagar o
          cadastro dela nem o histórico — só quem tem acesso master pode
          excluir um cadastro de vez.
        </p>
      </div>

      {totalDesativados > 0 && (
        <div>
          <Link
            href={mostrarDesativados ? "/freelancers" : "/freelancers?desativados=1"}
            className="text-sm text-stone-600 hover:underline"
          >
            {mostrarDesativados
              ? "Ocultar desativados"
              : `Mostrar desativados (${totalDesativados})`}
          </Link>
        </div>
      )}

      {listaExibida.length === 0 && (
        <p className="text-stone-500 text-sm">
          {mostrarDesativados || totalDesativados === 0
            ? "Nenhum freelancer cadastrado ainda."
            : "Nenhum freelancer ativo — todos estão desativados."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {listaExibida.map((v) => (
          <FreelancerRow
            key={v.pessoa.id}
            freelancer={{
              pessoaId: v.pessoa.id,
              nome: v.pessoa.nome,
              documento: v.pessoa.documento,
              tipoDocumento: v.pessoa.tipoDocumento,
              telefone: v.pessoa.telefone,
              chavePix: v.pessoa.chavePix ?? "",
              tipoChavePix: v.pessoa.tipoChavePix ?? "CPF",
              ativo: v.ativo,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
