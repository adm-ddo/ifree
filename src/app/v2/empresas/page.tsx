import { prisma } from "@/lib/prisma";
import { requireSessao } from "@/lib/auth";
import EmpresaRow from "@/app/empresas/EmpresaRow";
import NovaEmpresaForm from "@/app/empresas/NovaEmpresaForm";
import GrupoEconomicoForm from "@/app/empresas/GrupoEconomicoForm";

/** Espelho completo de src/app/empresas/page.tsx (v1, não tocado) — mesma
 * query, EmpresaRow/NovaEmpresaForm/GrupoEconomicoForm reaproveitados
 * direto (nenhum tem link pro v1; selecionarEmpresa/cadastrarNovaEmpresa
 * já redirecionam pro /v2/dashboard). */
export default async function V2EmpresasPage() {
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
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Minhas empresas</h1>
        <p className="text-stone-500 text-sm mt-0.5">
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
