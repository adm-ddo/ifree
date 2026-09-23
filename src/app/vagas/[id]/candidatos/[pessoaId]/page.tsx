import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import { formatarEnderecoCompleto } from "@/lib/endereco";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";

export default async function CandidatoPerfilPage({
  params,
}: {
  params: Promise<{ id: string; pessoaId: string }>;
}) {
  const sessao = await requireModulo("vagas");
  const { id, pessoaId: pessoaIdStr } = await params;
  const vagaId = Number(id);
  const pessoaId = Number(pessoaIdStr);
  if (!Number.isInteger(vagaId) || !Number.isInteger(pessoaId)) notFound();

  const candidatura = await prisma.candidatura.findUnique({
    where: { vagaId_pessoaId: { vagaId, pessoaId } },
    select: {
      match: true,
      vaga: { select: { id: true, cargo: true, empresaId: true } },
      pessoa: {
        select: {
          id: true,
          nome: true,
          documento: true,
          tipoDocumento: true,
          telefone: true,
          endereco: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          cep: true,
          fotoPerfilUrl: true,
          biografia: true,
          habilidades: true,
          vagasDesejadas: true,
          meiosTransporte: true,
        },
      },
    },
  });
  if (!candidatura || candidatura.vaga.empresaId !== sessao.empresaEfetivoId) notFound();

  const { pessoa } = candidatura;

  const [fotoDataUrl, avaliacoesRecebidas, conversa] = await Promise.all([
    pessoa.fotoPerfilUrl ? baixarComoDataUrl(pessoa.fotoPerfilUrl) : Promise.resolve(null),
    prisma.avaliacao.findMany({
      where: { autor: "EMPRESA", turno: { pessoaId: pessoa.id } },
      select: {
        nota: true,
        tags: true,
        criadoEm: true,
        turno: { select: { empresa: { select: { nome: true } } } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.conversa.findUnique({
      where: { empresaId_pessoaId: { empresaId: candidatura.vaga.empresaId, pessoaId: pessoa.id } },
      select: { id: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <Link href={`/vagas/${vagaId}`} className="text-brand-700 hover:underline">
          ← Voltar
        </Link>
        <Link href="/vagas" className="text-brand-700 hover:underline">
          📋 Todas as vagas
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
            {fotoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL vindo do servidor, não faz sentido pelo next/image
              <img src={fotoDataUrl} alt={pessoa.nome} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl text-stone-300">👤</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-navy-900">{pessoa.nome}</h1>
              {candidatura.match && (
                <span className="rounded-full border border-brand-500 bg-brand-50 text-brand-700 text-[11px] font-bold px-2 py-0.5">
                  🎯 Match
                </span>
              )}
            </div>
            <p className="text-sm text-stone-500 mt-0.5">
              Candidatou-se pra {candidatura.vaga.cargo}
            </p>
            <p className="text-sm text-stone-600 mt-1">
              {LABEL_TIPO_DOCUMENTO[pessoa.tipoDocumento]}{" "}
              {formatarDocumento(pessoa.tipoDocumento, pessoa.documento)} · {pessoa.telefone}
            </p>
            <p className="text-sm text-stone-600 mt-0.5">
              📍 {formatarEnderecoCompleto(pessoa)}
            </p>
          </div>
        </div>

        {pessoa.biografia && <p className="text-sm text-stone-600">{pessoa.biografia}</p>}

        {pessoa.habilidades.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Habilidades</span>
            <div className="flex flex-wrap gap-1.5">
              {pessoa.habilidades.map((h) => (
                <span key={h} className="rounded-full border border-brand-200 bg-brand-50 text-xs text-brand-700 px-2.5 py-1">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {pessoa.vagasDesejadas.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Vagas desejadas</span>
            <div className="flex flex-wrap gap-1.5">
              {pessoa.vagasDesejadas.map((v) => (
                <span key={v} className="rounded-full border border-navy-200 bg-navy-50 text-xs text-navy-700 px-2.5 py-1">
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {pessoa.meiosTransporte.length > 0 && (
          <p className="text-sm text-stone-500">Transporte: {pessoa.meiosTransporte.join(", ")}</p>
        )}

        {candidatura.match && conversa && (
          <Link
            href={`/conversas/${conversa.id}`}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 self-start transition-colors"
          >
            💬 Conversar
          </Link>
        )}
      </div>

      <ReputacaoCard
        avaliacoes={avaliacoesRecebidas.map((a) => ({
          nota: a.nota,
          tags: a.tags,
          criadoEm: a.criadoEm,
          empresaNome: a.turno.empresa.nome,
        }))}
      />
    </div>
  );
}
