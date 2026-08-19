import { requireSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EquipeForm from "./EquipeForm";
import MembroRow from "./MembroRow";

export default async function EquipePage() {
  const sessao = await requireSessao();
  const minhasEmpresaIds = sessao.minhasEmpresas.map((e) => e.id);

  const membros =
    minhasEmpresaIds.length === 0
      ? []
      : await prisma.usuario.findMany({
          where: {
            id: { not: sessao.usuarioId },
            isMaster: false,
            empresas: { some: { empresaId: { in: minhasEmpresaIds } } },
          },
          orderBy: [{ nomeCompleto: "asc" }, { email: "asc" }],
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            empresas: { select: { empresaId: true } },
          },
        });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Equipe</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Crie logins separados (acesso total) pras suas empresas — pro seu
          financeiro, por exemplo, sem precisar dividir sua própria senha.
          Cada pessoa só vê as empresas que você marcar aqui.
        </p>
      </div>

      {minhasEmpresaIds.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Você precisa ter pelo menos uma empresa própria pra gerenciar
          acessos.
        </p>
      ) : (
        <>
          <EquipeForm empresas={sessao.minhasEmpresas} />

          <div>
            <h2 className="font-semibold text-navy-900 mb-2">Acessos existentes</h2>
            {membros.length === 0 ? (
              <p className="text-stone-500 text-sm">
                Nenhum acesso secundário criado ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {membros.map((membro) => (
                  <MembroRow
                    key={membro.id}
                    membro={{
                      usuarioId: membro.id,
                      nomeCompleto: membro.nomeCompleto,
                      email: membro.email,
                      empresaIdsComAcesso: membro.empresas.map((e) => e.empresaId),
                    }}
                    empresas={sessao.minhasEmpresas}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
