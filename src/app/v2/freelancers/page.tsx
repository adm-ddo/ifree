import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import FreelancerRowV2 from "@/components/v2/FreelancerRowV2";

/** Espelho completo de src/app/freelancers/page.tsx (v1, não tocado) —
 * mesma query. O link de cada linha aponta pro /v2/freelancers/[id]
 * (FreelancerRowV2, ver componente). */
export default async function V2FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ desativados?: string }>;
}) {
  const sessao = await requireModulo("freelancers");
  const { desativados } = await searchParams;
  const mostrarDesativados = desativados === "1";

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "EXTRA" },
    orderBy: { pessoa: { nome: "asc" } },
    select: {
      ativo: true,
      pessoa: {
        select: { id: true, nome: true, documento: true, tipoDocumento: true, telefone: true, chavePix: true, tipoChavePix: true, fotoPerfilUrl: true, sexo: true },
      },
    },
  });

  const totalDesativados = vinculos.filter((v) => !v.ativo).length;
  const listaExibida = mostrarDesativados ? vinculos : vinculos.filter((v) => v.ativo);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Freelancers</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Todo mundo que já bateu CPF/CNPJ no totem desta empresa. Desativar aqui impede a pessoa de iniciar um
          novo turno, sem apagar o cadastro dela nem o histórico — só quem tem acesso master pode excluir um
          cadastro de vez.
        </p>
      </div>

      {totalDesativados > 0 && (
        <Link href={mostrarDesativados ? "/v2/freelancers" : "/v2/freelancers?desativados=1"} className="text-xs font-bold text-brand-700">
          {mostrarDesativados ? "Ocultar desativados" : `Mostrar desativados (${totalDesativados})`}
        </Link>
      )}

      {listaExibida.length === 0 && (
        <p className="text-stone-500 text-sm">
          {mostrarDesativados || totalDesativados === 0 ? "Nenhum freelancer cadastrado ainda." : "Nenhum freelancer ativo — todos estão desativados."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {listaExibida.map((v) => (
          <FreelancerRowV2
            key={v.pessoa.id}
            freelancer={{
              pessoaId: v.pessoa.id,
              nome: v.pessoa.nome,
              documento: v.pessoa.documento,
              tipoDocumento: v.pessoa.tipoDocumento,
              telefone: v.pessoa.telefone,
              chavePix: v.pessoa.chavePix ?? "",
              tipoChavePix: v.pessoa.tipoChavePix ?? "CPF",
              temFoto: Boolean(v.pessoa.fotoPerfilUrl),
              sexo: v.pessoa.sexo,
              ativo: v.ativo,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
