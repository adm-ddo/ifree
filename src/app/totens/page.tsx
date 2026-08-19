import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import TotemRow from "./TotemRow";
import NovoTotemForm from "./NovoTotemForm";

export default async function TotensPage() {
  const sessao = await requireTenant();

  const [totens, hdrs] = await Promise.all([
    prisma.totem.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { criadoEm: "asc" },
      select: { id: true, nome: true, token: true, ativo: true },
    }),
    headers(),
  ]);

  // Em produção o link do totem sempre usa o subdomínio dedicado
  // (TOTEM_BASE_URL), independente de qual domínio o admin está usando pra
  // acessar o painel agora. Sem essa variável (dev local), cai no host da
  // própria requisição.
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = process.env.TOTEM_BASE_URL ?? `${proto}://${host}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Totens</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Cada totem tem um link próprio pra abrir no tablet. Se um tablet for
          perdido ou roubado, gere um novo link só pra ele — os outros
          continuam funcionando.
        </p>
      </div>

      {totens.length === 0 && (
        <p className="text-stone-500 text-sm">
          Nenhum totem cadastrado ainda.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {totens.map((totem) => (
          <TotemRow key={totem.id} totem={totem} baseUrl={baseUrl} />
        ))}
      </ul>

      <NovoTotemForm />
    </div>
  );
}
