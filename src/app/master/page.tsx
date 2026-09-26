import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EmpresaMasterRow from "./EmpresaMasterRow";
import UsuarioMasterHeader from "./UsuarioMasterHeader";

const EMPRESA_SELECT = {
  id: true,
  nome: true,
  cnpj: true,
  endereco: true,
  statusAssinatura: true,
  assinaturaVenceEm: true,
  _count: {
    select: { funcoes: true, totens: true, turnos: true },
  },
} as const;

function ResumoCard({ label, valor, destaque }: { label: string; valor: number | string; destaque?: boolean }) {
  if (destaque) {
    return (
      <div className="rounded-2xl bg-navy-900 text-white p-4 shadow-sm">
        <p className="text-2xl font-semibold">{valor}</p>
        <p className="text-xs opacity-75 mt-1">{label}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-navy-900">{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}

/** Espelho do visual de src/app/master/assinaturas/page.tsx (já redesenhado
 * antes) — mesmo estilo de card v2 (rounded-2xl, ResumoCard em cima),
 * agora aplicado à tela principal do painel master, que até então ainda
 * era a única com o layout antigo (ver src/app/master/layout.tsx pra
 * casca/nav nova). */
export default async function MasterPage() {
  const sessao = await requireMaster();
  const idsMinhasEmpresas = new Set(sessao.minhasEmpresas.map((e) => e.id));

  const [pessoas, empresasSemDono] = await Promise.all([
    prisma.usuario.findMany({
      where: { isMaster: false },
      orderBy: [{ nomeCompleto: "asc" }, { email: "asc" }],
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        criadoEm: true,
        empresas: { select: { criadoEm: true, empresa: { select: EMPRESA_SELECT } } },
      },
    }),
    prisma.empresa.findMany({
      where: { usuarios: { none: {} } },
      select: EMPRESA_SELECT,
    }),
  ]);

  const totalEmpresas =
    pessoas.reduce((soma, p) => soma + p.empresas.length, 0) + empresasSemDono.length;

  const formatarData = (data: Date) =>
    data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Empresas</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Todas as pessoas cadastradas e as empresas de cada uma. Seu login tem acesso total
          (cadastrar, editar e apagar) a qualquer uma delas.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ResumoCard label="Logins cadastrados" valor={pessoas.length} destaque />
        <ResumoCard label="Empresas no total" valor={totalEmpresas} />
        <ResumoCard label="Sem dono vinculado" valor={empresasSemDono.length} />
      </div>

      {totalEmpresas === 0 && pessoas.length === 0 && (
        <p className="text-stone-500 text-sm">Nenhuma empresa cadastrada ainda.</p>
      )}

      <ul className="flex flex-col gap-4">
        {pessoas.map((pessoa) => (
          <li key={pessoa.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <UsuarioMasterHeader
              usuarioId={pessoa.id}
              nomeCompleto={pessoa.nomeCompleto}
              email={pessoa.email}
              cadastradoEm={formatarData(pessoa.criadoEm)}
            />
            {pessoa.empresas.length > 0 ? (
              <ul className="flex flex-col gap-2 mt-3">
                {pessoa.empresas.map(({ empresa, criadoEm }) => (
                  <EmpresaMasterRow
                    key={empresa.id}
                    empresa={{
                      id: empresa.id,
                      nome: empresa.nome,
                      cnpj: empresa.cnpj,
                      endereco: empresa.endereco,
                      statusAssinatura: empresa.statusAssinatura,
                      assinaturaVenceEm: empresa.assinaturaVenceEm,
                      counts: empresa._count,
                    }}
                    vinculadoEm={formatarData(criadoEm)}
                    jaMinha={idsMinhasEmpresas.has(empresa.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 mt-3">Nenhuma empresa vinculada.</p>
            )}
          </li>
        ))}
      </ul>

      {empresasSemDono.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 mb-2">Sem dono vinculado</h2>
          <ul className="flex flex-col gap-2">
            {empresasSemDono.map((empresa) => (
              <EmpresaMasterRow
                key={empresa.id}
                empresa={{
                  id: empresa.id,
                  nome: empresa.nome,
                  cnpj: empresa.cnpj,
                  endereco: empresa.endereco,
                  statusAssinatura: empresa.statusAssinatura,
                  assinaturaVenceEm: empresa.assinaturaVenceEm,
                  counts: empresa._count,
                }}
                vinculadoEm={null}
                jaMinha={idsMinhasEmpresas.has(empresa.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
