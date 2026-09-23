import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";
import EditarVagaForm from "@/app/vagas/[id]/EditarVagaForm";
import FiltroCandidaturasV2 from "@/components/v2/FiltroCandidaturasV2";

/** Espelho completo de src/app/vagas/[id]/page.tsx (v1, não tocado) —
 * reaproveita EditarVagaForm e ReputacaoCard diretamente (genéricos, sem
 * chrome do v1); FiltroCandidaturasV2/CandidaturaCardV2 são cópias com o
 * link do candidato atualizado pro /v2 e usando AvatarPessoa (foto do
 * Conecta + bonequinho por gênero) em vez de baixar a foto como data URL
 * no servidor. */
export default async function V2VagaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireModulo("vagas");
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
      nomeFantasia: true,
      habilidadesProcuradas: true,
      turnoDia: true,
      turnoNoite: true,
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
              fotoPerfilUrl: true,
              sexo: true,
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
    where: { empresaId: vaga.empresaId, pessoaId: { in: vaga.candidaturas.map((c) => c.pessoa.id) } },
    select: { id: true, pessoaId: true },
  });
  const conversaIdPorPessoa = new Map(conversas.map((c) => [c.pessoaId, c.id]));

  const avaliacoesPorPessoa = await Promise.all(
    vaga.candidaturas.map((c) =>
      prisma.avaliacao.findMany({
        where: { autor: "EMPRESA", turno: { pessoaId: c.pessoa.id } },
        select: { nota: true, tags: true, criadoEm: true, turno: { select: { empresa: { select: { nome: true } } } } },
        orderBy: { criadoEm: "desc" },
      })
    )
  );

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/vagas" className="text-xs font-bold text-brand-700">
          ← Vagas
        </Link>
        <div className="mt-1">
          <EditarVagaForm
            vaga={{
              id: vaga.id,
              cargo: vaga.cargo,
              descricao: vaga.descricao,
              localizacao: vaga.localizacao,
              nomeFantasia: vaga.nomeFantasia,
              habilidadesProcuradas: vaga.habilidadesProcuradas,
              turnoDia: vaga.turnoDia,
              turnoNoite: vaga.turnoNoite,
            }}
          />
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-bold text-navy-900 text-[15px] mb-3">
          Candidaturas
          <span className="rounded-full bg-brand-600 text-white text-xs font-bold px-2.5 py-0.5">
            {vaga.candidaturas.length}
          </span>
        </h2>
        <FiltroCandidaturasV2
          vagaId={vaga.id}
          itens={vaga.candidaturas.map((c, i) => ({
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
              temFoto: Boolean(c.pessoa.fotoPerfilUrl),
              sexo: c.pessoa.sexo,
            },
            reputacaoCard: (
              <ReputacaoCard
                avaliacoes={avaliacoesPorPessoa[i].map((a) => ({
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
