import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { baixarComoDataUrl } from "@/lib/blob";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";
import FiltroCandidaturas from "./FiltroCandidaturas";

export default async function VagaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenant();
  const { id } = await params;
  const vagaId = Number(id);
  if (!Number.isInteger(vagaId)) notFound();

  const vaga = await prisma.vaga.findUnique({
    where: { id: vagaId },
    select: {
      id: true,
      cargo: true,
      descricao: true,
      localizacao: true,
      status: true,
      criadoEm: true,
      empresaId: true,
      candidaturas: {
        orderBy: { criadoEm: "desc" },
        select: {
          id: true,
          status: true,
          match: true,
          criadoEm: true,
          pessoa: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              fotoUrl: true,
              biografia: true,
              habilidades: true,
              vagasDesejadas: true,
              meiosTransporte: true,
            },
          },
        },
      },
    },
  });
  if (!vaga || vaga.empresaId !== sessao.empresaEfetivoId) notFound();

  const conversas = await prisma.conversa.findMany({
    where: {
      empresaId: vaga.empresaId,
      pessoaId: { in: vaga.candidaturas.map((c) => c.pessoa.id) },
    },
    select: { id: true, pessoaId: true },
  });
  const conversaIdPorPessoa = new Map(conversas.map((c) => [c.pessoaId, c.id]));

  const candidaturasComDados = await Promise.all(
    vaga.candidaturas.map(async (c) => {
      const [fotoDataUrl, avaliacoesRecebidas] = await Promise.all([
        c.pessoa.fotoUrl ? baixarComoDataUrl(c.pessoa.fotoUrl) : Promise.resolve(null),
        prisma.avaliacao.findMany({
          where: { autor: "EMPRESA", turno: { pessoaId: c.pessoa.id } },
          select: {
            nota: true,
            tags: true,
            criadoEm: true,
            turno: { select: { empresa: { select: { nome: true } } } },
          },
          orderBy: { criadoEm: "desc" },
        }),
      ]);
      return { ...c, fotoDataUrl, avaliacoesRecebidas };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/vagas" className="text-sm text-brand-700 hover:underline">
          ← Vagas
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">{vaga.cargo}</h1>
        <p className="text-stone-600 mt-1 text-sm whitespace-pre-line">{vaga.descricao}</p>
        {vaga.localizacao && (
          <p className="text-stone-500 text-sm mt-1">📍 {vaga.localizacao}</p>
        )}
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-semibold text-navy-900 text-base mb-3">
          Candidaturas
          <span className="rounded-full bg-brand-600 text-white text-sm font-bold px-2.5 py-0.5">
            {candidaturasComDados.length}
          </span>
        </h2>
        <FiltroCandidaturas
          vagaId={vaga.id}
          itens={candidaturasComDados.map((c) => ({
            id: c.id,
            status: c.status,
            match: c.match,
            criadoEm: c.criadoEm,
            conversaId: conversaIdPorPessoa.get(c.pessoa.id) ?? null,
            pessoa: {
              id: c.pessoa.id,
              nome: c.pessoa.nome,
              telefone: c.pessoa.telefone,
              biografia: c.pessoa.biografia,
              habilidades: c.pessoa.habilidades,
              vagasDesejadas: c.pessoa.vagasDesejadas,
              meiosTransporte: c.pessoa.meiosTransporte,
              fotoDataUrl: c.fotoDataUrl,
            },
            reputacaoCard: (
              <ReputacaoCard
                avaliacoes={c.avaliacoesRecebidas.map((a) => ({
                  nota: a.nota,
                  tags: a.tags,
                  criadoEm: a.criadoEm,
                  empresaNome: a.turno.empresa.nome,
                }))}
              />
            ),
          }))}
        />
      </div>
    </div>
  );
}
