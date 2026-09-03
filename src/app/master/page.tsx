import Link from "next/link";
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
        empresas: { select: { empresa: { select: EMPRESA_SELECT } } },
      },
    }),
    prisma.empresa.findMany({
      where: { usuarios: { none: {} } },
      select: EMPRESA_SELECT,
    }),
  ]);

  const totalEmpresas =
    pessoas.reduce((soma, p) => soma + p.empresas.length, 0) +
    empresasSemDono.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">
            Painel Master
          </h1>
          <p className="text-stone-600 mt-1 text-sm">
            Todas as pessoas cadastradas e as empresas de cada uma. Seu login
            tem acesso total (cadastrar, editar e apagar) a qualquer uma delas.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/master/assinaturas"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            💳 Assinaturas
          </Link>
          <Link
            href="/master/freelancers"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            👤 Ver freelancers
          </Link>
        </div>
      </div>

      {totalEmpresas === 0 && pessoas.length === 0 && (
        <p className="text-stone-500 text-sm">
          Nenhuma empresa cadastrada ainda.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {pessoas.map((pessoa) => (
          <li
            key={pessoa.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <UsuarioMasterHeader
              usuarioId={pessoa.id}
              nomeCompleto={pessoa.nomeCompleto}
              email={pessoa.email}
            />
            {pessoa.empresas.length > 0 ? (
              <ul className="flex flex-col gap-2 mt-3">
                {pessoa.empresas.map(({ empresa }) => (
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
          <h2 className="font-semibold text-navy-900 mb-2">
            Sem dono vinculado
          </h2>
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
                jaMinha={idsMinhasEmpresas.has(empresa.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
