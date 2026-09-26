import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { formatarDataHora } from "@/lib/data";
import { calcularMatch } from "@/lib/match";
import { formatarEnderecoCompleto, linkGoogleMapsTransit } from "@/lib/endereco";
import FiltroVagas from "./FiltroVagas";

const LABEL_STATUS_CANDIDATURA: Record<string, string> = {
  ENVIADA: "Aguardando resposta",
  ACEITA: "Aceita",
  RECUSADA: "Não foi dessa vez",
};

const COR_STATUS_CANDIDATURA: Record<string, string> = {
  ENVIADA: "bg-amber-50 text-amber-700 border-amber-200",
  ACEITA: "bg-brand-50 text-brand-700 border-brand-200",
  RECUSADA: "bg-stone-100 text-stone-500 border-stone-200",
};

export default async function VagasPortalPage() {
  const sessao = await requirePessoaComTermosAceitos();

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: {
      disponivelParaOportunidades: true,
      habilidades: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      cep: true,
    },
  });
  const enderecoOrigem = pessoa.endereco?.trim() ? formatarEnderecoCompleto(pessoa) : null;

  if (!pessoa.disponivelParaOportunidades) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-navy-900">Vagas</h1>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col gap-2">
          <p className="text-sm text-stone-600">
            Você ainda não ativou &quot;Disponível para novas
            oportunidades&quot; — por isso não vê o quadro de vagas.
          </p>
          <Link href="/portal" className="text-brand-700 underline text-sm self-start">
            Voltar e ativar
          </Link>
        </div>
      </div>
    );
  }

  // Quem se cadastrou antes de cidade/CEP virarem obrigatórios (ou veio
  // pelo totem, que nunca pede isso) fica sem dado nenhum pro filtro de
  // localização — pede pra completar antes de mostrar o quadro, mesmo
  // padrão do aviso de disponibilidade acima.
  if (!pessoa.cidade?.trim()) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-navy-900">Vagas</h1>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col gap-2">
          <p className="text-sm text-stone-600">
            Complete seu endereço (CEP e cidade) no seu perfil pra ver o
            quadro de vagas — usamos isso pra mostrar oportunidades perto de
            você.
          </p>
          <Link href="/portal" className="text-brand-700 underline text-sm self-start">
            Completar meu cadastro
          </Link>
        </div>
      </div>
    );
  }

  const [vagasAbertas, minhasCandidaturas, minhasConversas] = await Promise.all([
    prisma.vaga.findMany({
      where: { status: "ABERTA" },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        empresaId: true,
        cargo: true,
        categoria: true,
        descricao: true,
        localizacao: true,
        nomeFantasia: true,
        habilidadesProcuradas: true,
        turnoDia: true,
        turnoNoite: true,
        empresa: { select: { nome: true, endereco: true, cidade: true } },
      },
    }),
    prisma.candidatura.findMany({
      where: { pessoaId: sessao.pessoaId },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        vagaId: true,
        status: true,
        match: true,
        criadoEm: true,
        vaga: {
          select: {
            cargo: true,
            empresaId: true,
            nomeFantasia: true,
            empresa: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.conversa.findMany({
      where: { pessoaId: sessao.pessoaId },
      select: { id: true, empresaId: true },
    }),
  ]);

  const vagaIdsComCandidatura = new Set(minhasCandidaturas.map((c) => c.vagaId));
  const conversaIdPorEmpresa = new Map(minhasConversas.map((c) => [c.empresaId, c.id]));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/portal" className="text-sm text-brand-700 hover:underline self-start">
        🏠 Meu perfil
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Vagas</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Vagas publicadas por empresas no iFREE — cross-empresa, igual ao
          resto do seu Portal.
        </p>
      </div>

      <FiltroVagas
        itens={vagasAbertas.map((vaga) => {
          const enderecoDestino = vaga.localizacao?.trim() || vaga.empresa.endereco?.trim() || null;
          return {
            id: vaga.id,
            cargo: vaga.cargo,
            categoria: vaga.categoria,
            empresaNome: vaga.nomeFantasia || vaga.empresa.nome,
            empresaCidade: vaga.empresa.cidade,
            descricao: vaga.descricao,
            localizacao: vaga.localizacao,
            turnoDia: vaga.turnoDia,
            turnoNoite: vaga.turnoNoite,
            jaCandidatou: vagaIdsComCandidatura.has(vaga.id),
            ehMatch: calcularMatch(vaga.habilidadesProcuradas, pessoa.habilidades),
            conversaId: conversaIdPorEmpresa.get(vaga.empresaId) ?? null,
            linkRota:
              enderecoOrigem && enderecoDestino
                ? linkGoogleMapsTransit(enderecoOrigem, enderecoDestino)
                : null,
          };
        })}
      />

      {minhasCandidaturas.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 text-sm mb-3">Minhas candidaturas</h2>
          <ul className="flex flex-col gap-2">
            {minhasCandidaturas.map((c) => {
              const conversaId = conversaIdPorEmpresa.get(c.vaga.empresaId);
              return (
                <li
                  key={c.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="block font-medium text-navy-900 truncate">{c.vaga.cargo}</span>
                    <p className="text-xs text-stone-500">
                      {c.vaga.nomeFantasia || c.vaga.empresa.nome} · {formatarDataHora(c.criadoEm)}
                    </p>
                    {c.match && conversaId && (
                      <Link
                        href={`/portal/conversas/${conversaId}`}
                        className="text-xs text-brand-700 underline"
                      >
                        💬 Conversar
                      </Link>
                    )}
                  </div>
                  <span
                    className={`rounded-full border text-[11px] font-medium px-2 py-0.5 shrink-0 ${COR_STATUS_CANDIDATURA[c.status]}`}
                  >
                    {LABEL_STATUS_CANDIDATURA[c.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
