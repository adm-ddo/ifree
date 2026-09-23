import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import TotemRow from "@/app/totens/TotemRow";
import NovoTotemForm from "@/app/totens/NovoTotemForm";

/** Espelho completo de src/app/totens/page.tsx (v1, não tocado) — mesma
 * query, mesmo cálculo de baseUrl, e os mesmos TotemRow/NovoTotemForm
 * reaproveitados sem alteração. */
export default async function V2TotensPage() {
  const sessao = await requireModulo("totens");

  const [totens, hdrs] = await Promise.all([
    prisma.totem.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { criadoEm: "asc" },
      select: { id: true, nome: true, token: true, ativo: true },
    }),
    headers(),
  ]);

  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = process.env.TOTEM_BASE_URL ?? `${proto}://${host}`;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Totens</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Cada totem tem um link próprio pra abrir no tablet. Se um tablet for perdido ou roubado, gere um novo
          link só pra ele — os outros continuam funcionando.
        </p>
      </div>

      {totens.length === 0 && <p className="text-stone-500 text-sm">Nenhum totem cadastrado ainda.</p>}

      <ul className="flex flex-col gap-2">
        {totens.map((totem) => (
          <TotemRow key={totem.id} totem={totem} baseUrl={baseUrl} />
        ))}
      </ul>

      <NovoTotemForm />
    </div>
  );
}
