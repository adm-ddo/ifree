import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorTokenPgr, buscarCicloAbertoPgr } from "@/lib/pgr";
import RespostaPgrForm from "./RespostaPgrForm";

export default async function PesquisaPgrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const empresa = await resolverEmpresaPorTokenPgr(token);
  if (!empresa) notFound();

  const cicloAberto = await buscarCicloAbertoPgr(empresa.id);

  if (!cicloAberto) {
    return (
      <div className="mx-auto max-w-lg flex flex-col gap-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Pesquisa de bem-estar no trabalho</h1>
          <p className="text-stone-600 mt-1 text-sm">{empresa.nome}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
          Não há nenhuma pesquisa aberta no momento. Fale com o responsável
          da sua empresa se você esperava poder responder agora.
        </div>
      </div>
    );
  }

  const cargos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: empresa.id, tipoVinculo: "CLT", ativo: true, cargo: { not: null } },
    select: { cargo: true },
    distinct: ["cargo"],
    orderBy: { cargo: "asc" },
  });
  const cargosAtivos = cargos.map((c) => c.cargo!).filter(Boolean);

  return (
    <div className="mx-auto max-w-lg flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Pesquisa de bem-estar no trabalho</h1>
        <p className="text-stone-600 mt-1 text-sm">{empresa.nome}</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col gap-3 text-sm text-stone-700">
        <p>
          Esta pesquisa é <strong>totalmente anônima</strong> — não pedimos
          seu nome nem nenhum dado que identifique você. As respostas são
          usadas só de forma agregada, pra ajudar a empresa a identificar e
          melhorar pontos do ambiente de trabalho.
        </p>
        <p>Não existe resposta certa ou errada — responda com sinceridade.</p>
      </div>

      <RespostaPgrForm token={token} cargosAtivos={cargosAtivos} />
    </div>
  );
}
