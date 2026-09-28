import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import { formatarEnderecoCompleto } from "@/lib/endereco";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";
import ConvidarParaVagaBotao from "@/app/vagas/ConvidarParaVagaBotao";
import { contarDesmarquesPessoaDepoisDeAceitar } from "@/lib/confiabilidade-extra";

/** Perfil do candidato — dois casos possíveis pra mesma URL
 * (/vagas/:id/candidatos/:pessoaId):
 *
 * 1. Ela se CANDIDATOU (Candidatura existe): mostra tudo, incluindo
 *    telefone/documento/endereço — ela deu esse consentimento ao se
 *    candidatar pra ESTA empresa.
 * 2. Ela é só um MATCH PASSIVO (perfil bate, nunca se candidatou — ver
 *    VagaMatchPassivo/MatchesRecentesBanner.tsx): mostra só o que já é
 *    visível num match (nome, foto, bio, habilidades, reputação), SEM
 *    telefone/documento/endereço — ela nunca autorizou esta empresa
 *    especificamente a ver esses dados. O botão aqui é "Convidar"
 *    (mesmo ConvidarParaVagaBotao do banner), não "Conversar" — pedido
 *    do Thiago em 2026-09-26: o convite só chama a atenção dela pra
 *    vaga, quem decide se manifestar e procurar a empresa é ela, nunca
 *    o contrário. */
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

  // Sem candidatura, tenta o caso 2 (match passivo) — mesma dupla
  // (vagaId, pessoaId), só que ela nunca se candidatou.
  const matchPassivo = candidatura
    ? null
    : await prisma.vagaMatchPassivo.findUnique({
        where: { vagaId_pessoaId: { vagaId, pessoaId } },
        select: {
          id: true,
          convidadoEm: true,
          vaga: { select: { id: true, cargo: true, empresaId: true } },
          pessoa: {
            select: {
              id: true,
              nome: true,
              fotoPerfilUrl: true,
              biografia: true,
              habilidades: true,
              vagasDesejadas: true,
              meiosTransporte: true,
            },
          },
        },
      });

  if (!candidatura && !matchPassivo) notFound();
  const empresaIdDaVaga = candidatura ? candidatura.vaga.empresaId : matchPassivo!.vaga.empresaId;
  if (empresaIdDaVaga !== sessao.empresaEfetivoId) notFound();

  const pessoa = candidatura ? candidatura.pessoa : matchPassivo!.pessoa;
  const cargo = candidatura ? candidatura.vaga.cargo : matchPassivo!.vaga.cargo;

  const [fotoDataUrl, avaliacoesRecebidas, faltasExtraMarcado, desmarquesDepoisDeAceitar, conversa] = await Promise.all([
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
    prisma.extraMarcado.findMany({
      where: { pessoaId: pessoa.id, status: "NAO_COMPARECEU" },
      select: { data: true, empresa: { select: { nome: true } } },
      orderBy: { data: "desc" },
    }),
    contarDesmarquesPessoaDepoisDeAceitar(pessoa.id),
    candidatura
      ? prisma.conversa.findUnique({
          where: { empresaId_pessoaId: { empresaId: empresaIdDaVaga, pessoaId: pessoa.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
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
              {candidatura?.match && (
                <span className="rounded-full border border-brand-500 bg-brand-50 text-brand-700 text-[11px] font-bold px-2 py-0.5">
                  🎯 Match
                </span>
              )}
              {matchPassivo && (
                <span className="rounded-full border border-stone-300 bg-stone-50 text-stone-600 text-[11px] font-medium px-2 py-0.5">
                  Perfil compatível — ainda não se candidatou
                </span>
              )}
            </div>
            <p className="text-sm text-stone-500 mt-0.5">
              {candidatura ? `Candidatou-se pra ${cargo}` : `Perfil bate com a vaga de ${cargo}`}
            </p>
            {candidatura && (
              <>
                <p className="text-sm text-stone-600 mt-1">
                  {LABEL_TIPO_DOCUMENTO[candidatura.pessoa.tipoDocumento]}{" "}
                  {formatarDocumento(candidatura.pessoa.tipoDocumento, candidatura.pessoa.documento)} ·{" "}
                  {candidatura.pessoa.telefone}
                </p>
                <p className="text-sm text-stone-600 mt-0.5">
                  📍 {formatarEnderecoCompleto(candidatura.pessoa)}
                </p>
              </>
            )}
            {matchPassivo && (
              <p className="text-xs text-stone-400 mt-1">
                Telefone e endereço só aparecem depois que ela se candidatar — ela ainda não deu esse
                consentimento pra esta empresa.
              </p>
            )}
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

        {candidatura?.match && conversa && (
          <Link
            href={`/conversas/${conversa.id}`}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 self-start transition-colors"
          >
            💬 Conversar
          </Link>
        )}

        {matchPassivo && (
          <div className="self-start">
            <ConvidarParaVagaBotao matchPassivoId={matchPassivo.id} jaConvidado={matchPassivo.convidadoEm !== null} />
          </div>
        )}
      </div>

      <ReputacaoCard
        avaliacoes={avaliacoesRecebidas.map((a) => ({
          nota: a.nota,
          tags: a.tags,
          criadoEm: a.criadoEm,
          empresaNome: a.turno.empresa.nome,
        }))}
        faltas={faltasExtraMarcado.map((f) => ({ data: f.data, empresaNome: f.empresa.nome }))}
        desmarquesDepoisDeAceitar={desmarquesDepoisDeAceitar}
      />
    </div>
  );
}
