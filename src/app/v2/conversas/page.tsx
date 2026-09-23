import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { formatarDataHora } from "@/lib/data";

/** Espelho completo de src/app/conversas/page.tsx (v1, não tocado) —
 * mesma query/regra. Link de cada conversa vai pro /v2/conversas/[id]
 * (já existe). */
export default async function V2ConversasPage() {
  const sessao = await requireModulo("conversas");

  const conversas = await prisma.conversa.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    select: {
      id: true,
      ultimaLeituraEmpresaEm: true,
      pessoa: { select: { nome: true } },
      mensagens: { orderBy: { criadoEm: "desc" }, take: 1, select: { texto: true, autor: true, criadoEm: true } },
    },
  });

  const ordenadas = conversas.sort((a, b) => {
    const dataA = a.mensagens[0]?.criadoEm ?? new Date(0);
    const dataB = b.mensagens[0]?.criadoEm ?? new Date(0);
    return dataB.getTime() - dataA.getTime();
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Mensagens</h1>
        <p className="text-stone-500 text-sm mt-0.5">Conversas com freelancers que deram match numa das suas vagas.</p>
      </div>

      {ordenadas.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma conversa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordenadas.map((c) => {
            const ultima = c.mensagens[0];
            const naoLida = ultima && ultima.autor === "PESSOA" && (!c.ultimaLeituraEmpresaEm || ultima.criadoEm > c.ultimaLeituraEmpresaEm);
            return (
              <li key={c.id}>
                <Link
                  href={`/v2/conversas/${c.id}`}
                  className="rounded-xl bg-white border border-stone-200 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex flex-col gap-0.5 items-start">
                    <span
                      className={
                        naoLida
                          ? "inline-block rounded-full bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold px-2.5 py-0.5 truncate max-w-full"
                          : "block text-[13px] text-navy-900 font-bold truncate"
                      }
                    >
                      {c.pessoa.nome}
                    </span>
                    {ultima && (
                      <p className="text-[11px] text-stone-500 truncate max-w-md">
                        {ultima.autor === "EMPRESA" ? "Você: " : ""}
                        {ultima.texto}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ultima && <span className="text-[10px] text-stone-400">{formatarDataHora(ultima.criadoEm)}</span>}
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
