import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import { formatarEnderecoCompleto } from "@/lib/endereco";
import { formatarDataHora } from "@/lib/data";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";

/** Perfil completo de uma pessoa, visão master — mesmo conteúdo que uma
 * empresa vê do candidato numa vaga (foto, bio, habilidades, reputação),
 * mas sem depender de candidatura/vaga nenhuma e olhando pra TODAS as
 * empresas de uma vez, já que master não tem tenant. Pensado pra dar
 * visibilidade de quem está de fato ativo no iFREE Conecta (Portal), não
 * só quem apareceu uma vez no totem de alguma empresa. */
export default async function PessoaMasterPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const pessoa = await prisma.pessoa.findUnique({
    where: { id: pessoaId },
    select: {
      id: true,
      nome: true,
      documento: true,
      tipoDocumento: true,
      telefone: true,
      email: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      cep: true,
      fotoUrl: true,
      biografia: true,
      habilidades: true,
      vagasDesejadas: true,
      meiosTransporte: true,
      disponivelParaOportunidades: true,
      senhaHash: true,
      termosAceitosEm: true,
      criadoEm: true,
      vinculos: {
        select: {
          tipoVinculo: true,
          ativo: true,
          empresa: { select: { id: true, nome: true } },
        },
      },
      _count: { select: { turnos: true, candidaturas: true, indicados: true } },
    },
  });
  if (!pessoa) notFound();

  const [fotoDataUrl, avaliacoesRecebidas] = await Promise.all([
    pessoa.fotoUrl ? baixarComoDataUrl(pessoa.fotoUrl) : Promise.resolve(null),
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
  ]);

  const temPortalAtivo = pessoa.senhaHash !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <Link href="/master/freelancers" className="text-brand-700 hover:underline">
          ← Freelancers
        </Link>
        <Link href="/master" className="text-brand-700 hover:underline">
          Painel Master
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
            <h1 className="text-xl font-semibold text-navy-900">{pessoa.nome}</h1>
            <p className="text-sm text-stone-600 mt-1">
              {LABEL_TIPO_DOCUMENTO[pessoa.tipoDocumento]}{" "}
              {formatarDocumento(pessoa.tipoDocumento, pessoa.documento)} · {pessoa.telefone}
              {pessoa.email && ` · ${pessoa.email}`}
            </p>
            <p className="text-sm text-stone-600 mt-0.5">📍 {formatarEnderecoCompleto(pessoa)}</p>
            <p className="text-xs text-stone-400 mt-1">
              Cadastrada em {formatarDataHora(pessoa.criadoEm)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`text-xs rounded-full border px-2.5 py-1 ${
              temPortalAtivo
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-stone-200 bg-stone-50 text-stone-500"
            }`}
          >
            {temPortalAtivo ? "🔗 Portal ativo (Conecta)" : "Sem acesso ao Portal ainda"}
          </span>
          <span
            className={`text-xs rounded-full border px-2.5 py-1 ${
              pessoa.disponivelParaOportunidades
                ? "border-navy-200 bg-navy-50 text-navy-700"
                : "border-stone-200 bg-stone-50 text-stone-500"
            }`}
          >
            {pessoa.disponivelParaOportunidades
              ? "📋 Disponível pra vagas"
              : "Não está no quadro de vagas"}
          </span>
          <span
            className={`text-xs rounded-full border px-2.5 py-1 ${
              pessoa.termosAceitosEm
                ? "border-stone-200 bg-stone-50 text-stone-600"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {pessoa.termosAceitosEm
              ? `Termos do Portal aceitos em ${formatarDataHora(pessoa.termosAceitosEm)}`
              : "Termos do Portal ainda não aceitos"}
          </span>
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
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
        <h2 className="font-semibold text-navy-900 text-sm">
          Empresas · {pessoa._count.turnos} turno(s) · {pessoa._count.candidaturas} candidatura(s)
        </h2>
        {pessoa.vinculos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum vínculo com empresa ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {pessoa.vinculos.map((v) => (
              <li
                key={v.empresa.id}
                className="flex items-center justify-between text-sm text-stone-700 border-t border-stone-100 pt-1.5 first:border-0 first:pt-0"
              >
                <span>{v.empresa.nome}</span>
                <span className="text-xs text-stone-400">
                  {v.tipoVinculo === "CLT" ? "CLT" : "Extra"}
                  {!v.ativo && " · inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReputacaoCard
        avaliacoes={avaliacoesRecebidas.map((a) => ({
          nota: a.nota,
          tags: a.tags,
          criadoEm: a.criadoEm,
          empresaNome: a.turno.empresa.nome,
        }))}
        totalIndicacoes={pessoa._count.indicados}
      />
    </div>
  );
}
