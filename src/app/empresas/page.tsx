import { prisma } from "@/lib/prisma";
import { requireSessao } from "@/lib/auth";
import EmpresaRow from "./EmpresaRow";
import NovaEmpresaForm from "./NovaEmpresaForm";
import GrupoEconomicoForm from "./GrupoEconomicoForm";

export default async function EmpresasPage() {
  const sessao = await requireSessao();

  const vinculos = await prisma.usuarioEmpresa.findMany({
    where: { usuarioId: sessao.usuarioId },
    select: {
      empresa: { select: { id: true, nome: true, cnpj: true, endereco: true, grupoEconomicoId: true } },
    },
    orderBy: { empresa: { nome: "asc" } },
  });
  const empresas = vinculos.map((v) => v.empresa);

  const grupoExistenteId = empresas.find((e) => e.grupoEconomicoId !== null)?.grupoEconomicoId ?? null;
  const grupoExistente = grupoExistenteId
    ? await prisma.grupoEconomico.findUnique({ where: { id: grupoExistenteId }, select: { nome: true } })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">
          Minhas empresas
        </h1>
        <p className="text-stone-600 mt-1 text-sm">
          {empresas.length === 0
            ? "Você ainda não tem nenhuma empresa cadastrada."
            : "Escolha qual empresa você quer ver, ou cadastre uma nova."}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {empresas.map((empresa) => (
          <EmpresaRow key={empresa.id} empresa={empresa} />
        ))}
      </ul>

      <NovaEmpresaForm />

      <GrupoEconomicoForm empresas={empresas} nomeGrupoAtual={grupoExistente?.nome ?? null} />
    </div>
  );
}
