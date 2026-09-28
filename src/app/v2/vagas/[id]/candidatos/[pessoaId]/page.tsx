import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import { formatarEnderecoCompleto } from "@/lib/endereco";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";
import AvatarPessoa from "@/components/AvatarPessoa";
import ConvidarParaVagaBotao from "@/app/vagas/ConvidarParaVagaBotao";
import { contarDesmarquesPessoaDepoisDeAceitar } from "@/lib/confiabilidade-extra";

/** Espelho completo de src/app/vagas/[id]/candidatos/[pessoaId]/page.tsx
 * (v1, não tocado) — mesma lógica de fallback pra match passivo (ver
 * docblock lá pro raciocínio completo), só trocando ReputacaoCard direto
 * por AvatarPessoa e links pro /v2. */
export default async function V2CandidatoPerfilPage({
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
          sexo: true,
          biografia: true,
          habilidades: true,
          vagasDesejadas: true,
          meiosTransporte: true,
        },
      },
    },
  });

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
              sexo: true,
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

  const [avaliacoesRecebidas, faltasExtraMarcado, desmarquesDepoisDeAceitar, conversa] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { autor: "EMPRESA", turno: { pessoaId: pessoa.id } },
      select: { nota: true, tags: true, criadoEm: true, turno: { select: { empresa: { select: { nome: true } } } } },
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
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-4 flex-wrap text-xs font-bold">
        <Link href={`/v2/vagas/${vagaId}`} className="text-brand-700">
          ← Voltar
        </Link>
        <Link href="/v2/vagas" className="text-brand-700">
          📋 Todas as vagas
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-5 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <AvatarPessoa pessoaId={pessoa.id} nome={pessoa.nome} temFoto={Boolean(pessoa.fotoPerfilUrl)} sexo={pessoa.sexo} tamanho="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-navy-900">{pessoa.nome}</h1>
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
                <p className="text-sm text-stone-600 mt-0.5">📍 {formatarEnderecoCompleto(candidatura.pessoa)}</p>
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
            href={`/v2/conversas/${conversa.id}`}
            className="rounded-full bg-brand-600 text-white text-sm font-bold px-4 py-2 self-start"
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
