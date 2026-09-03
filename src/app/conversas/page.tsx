import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarDataHora } from "@/lib/data";

export default async function ConversasPage() {
  const sessao = await requireTenant();

  const conversas = await prisma.conversa.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    select: {
      id: true,
      ultimaLeituraEmpresaEm: true,
      pessoa: { select: { nome: true } },
      mensagens: {
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { texto: true, autor: true, criadoEm: true },
      },
    },
  });

  const ordenadas = conversas.sort((a, b) => {
    const dataA = a.mensagens[0]?.criadoEm ?? new Date(0);
    const dataB = b.mensagens[0]?.criadoEm ?? new Date(0);
    return dataB.getTime() - dataA.getTime();
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Mensagens</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Conversas com freelancers que deram match numa das suas vagas.
        </p>
      </div>

      {ordenadas.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma conversa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordenadas.map((c) => {
            const ultima = c.mensagens[0];
            const naoLida =
              ultima &&
              ultima.autor === "PESSOA" &&
              (!c.ultimaLeituraEmpresaEm || ultima.criadoEm > c.ultimaLeituraEmpresaEm);
            return (
              <li key={c.id}>
                <Link
                  href={`/conversas/${c.id}`}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3 hover:border-brand-300 transition-colors"
                >
                  <div className="min-w-0 flex flex-col gap-1 items-start">
                    <span
                      className={
                        naoLida
                          ? "inline-block rounded-full bg-red-50 border border-red-300 text-red-700 text-sm font-bold px-2.5 py-0.5 truncate max-w-full"
                          : "block text-navy-900 font-medium truncate"
                      }
                    >
                      {c.pessoa.nome}
                    </span>
                    {ultima && (
                      <p className="text-xs text-stone-500 truncate max-w-md">
                        {ultima.autor === "EMPRESA" ? "Você: " : ""}
                        {ultima.texto}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ultima && (
                      <span className="text-xs text-stone-400">{formatarDataHora(ultima.criadoEm)}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
