import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { valorMensalidadeEfetivo } from "@/lib/assinatura";
import AssinaturaEditForm from "./AssinaturaEditForm";
import type { StatusAssinatura } from "@/generated/prisma/enums";

const ORDEM_URGENCIA: Record<StatusAssinatura, number> = {
  ATRASADA: 0,
  TRIAL: 1,
  ATIVA: 2,
  CANCELADA: 3,
};

/** Visão de billing separada da lista de usuários/empresas do /master —
 * ordenada por urgência (atrasada primeiro) em vez de por dono, é o
 * "outro portal de controle" que o dono pediu pra acompanhar assinatura
 * de todo mundo de uma vez. */
export default async function MasterAssinaturasPage() {
  await requireMaster();

  const empresas = await prisma.empresa.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      statusAssinatura: true,
      assinaturaVenceEm: true,
      valorMensalidade: true,
      criadoEm: true,
    },
  });

  // Última cobrança de cada empresa — uma query só, reduzida em JS (mesmo
  // padrão de agregação em Map já usado no resto do projeto).
  const cobrancas = await prisma.cobrancaMensalidade.findMany({
    where: { empresaId: { in: empresas.map((e) => e.id) } },
    orderBy: { criadoEm: "desc" },
    select: { empresaId: true, status: true, valor: true, pagoEm: true, criadoEm: true },
  });
  const ultimaCobrancaPorEmpresa = new Map<number, (typeof cobrancas)[number]>();
  for (const c of cobrancas) {
    if (!ultimaCobrancaPorEmpresa.has(c.empresaId)) ultimaCobrancaPorEmpresa.set(c.empresaId, c);
  }

  const ordenadas = [...empresas].sort(
    (a, b) => ORDEM_URGENCIA[a.statusAssinatura] - ORDEM_URGENCIA[b.statusAssinatura]
  );

  const resumo = {
    trial: empresas.filter((e) => e.statusAssinatura === "TRIAL").length,
    ativa: empresas.filter((e) => e.statusAssinatura === "ATIVA").length,
    atrasada: empresas.filter((e) => e.statusAssinatura === "ATRASADA").length,
    cancelada: empresas.filter((e) => e.statusAssinatura === "CANCELADA").length,
    mrr: empresas
      .filter((e) => e.statusAssinatura === "ATIVA")
      .reduce(
        (soma, e) =>
          soma + valorMensalidadeEfetivo(e.valorMensalidade !== null ? Number(e.valorMensalidade) : null),
        0
      ),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/master" className="text-sm text-brand-700 hover:underline">
          ← Painel Master
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Assinaturas</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Status de cobrança de cada empresa cadastrada no sistema.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <ResumoCard label="Em trial" valor={resumo.trial} />
        <ResumoCard label="Em dia" valor={resumo.ativa} />
        <ResumoCard label="Atrasadas" valor={resumo.atrasada} />
        <ResumoCard label="Canceladas" valor={resumo.cancelada} />
        <ResumoCard label="MRR estimado" valor={`R$ ${resumo.mrr.toFixed(2)}`} />
      </div>

      {ordenadas.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ordenadas.map((empresa) => {
            const ultima = ultimaCobrancaPorEmpresa.get(empresa.id) ?? null;
            return (
              <AssinaturaEditForm
                key={empresa.id}
                empresa={{
                  id: empresa.id,
                  nome: empresa.nome,
                  cnpj: empresa.cnpj,
                  statusAssinatura: empresa.statusAssinatura,
                  assinaturaVenceEm: empresa.assinaturaVenceEm
                    ? empresa.assinaturaVenceEm.toISOString().slice(0, 10)
                    : "",
                  valorMensalidade:
                    empresa.valorMensalidade !== null ? Number(empresa.valorMensalidade) : null,
                }}
                ultimaCobranca={
                  ultima
                    ? {
                        status: ultima.status,
                        valor: Number(ultima.valor),
                        dataLabel: (ultima.pagoEm ?? ultima.criadoEm).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        }),
                      }
                    : null
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ResumoCard({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-navy-900">{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}
