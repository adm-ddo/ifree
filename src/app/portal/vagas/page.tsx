import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { formatarDataHora, inicioDoDiaBrasil } from "@/lib/data";
import { calcularMatch } from "@/lib/match";
import { formatarEnderecoCompleto, linkGoogleMapsTransit } from "@/lib/endereco";
import FiltroVagas from "./FiltroVagas";
import VagaCard from "./VagaCard";
import ExtraMarcadoPessoa from "./ExtraMarcadoPessoa";
import ChamarParaConversarBotao from "./ChamarParaConversarBotao";
import { contarDesmarquesEmpresaEmLote } from "@/lib/confiabilidade-extra";

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

  // Quadro de vagas (abertas + convites) só aparece com disponibilidade
  // ligada E endereço completo — mas "Meus extras marcados" e "Minhas
  // candidaturas" (mais abaixo) continuam visíveis mesmo sem isso: pedido
  // do Thiago em 2026-09-28, quando um Extra Marcado é confirmado dos
  // dois lados a disponibilidade é desligada automaticamente (ver
  // confirmarExtraMarcado, ./actions.ts) pra ela sumir das buscas de
  // OUTRAS empresas enquanto já tem um extra combinado — mas ela ainda
  // precisa continuar vendo o próprio compromisso e indo lá confirmar
  // presença, não faz sentido esconder isso dela.
  const quadroLiberado = pessoa.disponivelParaOportunidades && Boolean(pessoa.cidade?.trim());

  const [vagasAbertas, minhasCandidaturas, minhasConversas, meusExtrasMarcados, convitesRecebidos] = await Promise.all([
    prisma.vaga.findMany({
      where: { status: "ABERTA" },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        empresaId: true,
        cargo: true,
        valorHora: true,
        categoria: true,
        logoUrl: true,
        possibilidadeEfetivacao: true,
        descricao: true,
        localizacao: true,
        nomeFantasia: true,
        habilidadesProcuradas: true,
        turnoDia: true,
        turnoNoite: true,
        empresa: {
          select: {
            nome: true,
            endereco: true,
            cidade: true,
            horarioInicioDiaMin: true,
            horarioFechamentoDiaMin: true,
            horarioInicioNoiteMin: true,
            horarioFechamentoNoiteMin: true,
          },
        },
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
    // Só o que ainda vai acontecer (data >= hoje) — pedido do Thiago em
    // 2026-09-28: "o que passou, passou". O que já passou vira
    // CUMPRIDO/NAO_COMPARECEU sozinho (ver iniciarTurno e
    // marcarFaltasExtraMarcado) e já sairia do filtro de status mesmo,
    // mas o filtro de data garante isso na hora, sem depender do cron já
    // ter rodado.
    prisma.extraMarcado.findMany({
      where: {
        pessoaId: sessao.pessoaId,
        status: { in: ["AGUARDANDO_PESSOA", "CONFIRMADO"] },
        data: { gte: inicioDoDiaBrasil(new Date()) },
      },
      orderBy: { data: "asc" },
      select: {
        id: true,
        data: true,
        turnoTipo: true,
        status: true,
        empresaId: true,
        empresa: { select: { nome: true } },
      },
    }),
    // Convites de verdade (clicados pela empresa em ConvidarParaVagaBotao,
    // ver convidarParaVaga em src/app/vagas/actions.ts) — diferente de
    // ehMatch (calculado por habilidade), este é um "chamar atenção"
    // deliberado de uma empresa específica. Só o convite JÁ ENVIADO conta
    // aqui (convidadoEm not null); o match passivo sozinho não aparece pra
    // ela, só dispara e-mail pra empresa (ver notificarEmpresasSobreNovoPerfil).
    prisma.vagaMatchPassivo.findMany({
      where: { pessoaId: sessao.pessoaId, convidadoEm: { not: null } },
      select: {
        vagaId: true,
        vaga: { select: { nomeFantasia: true, empresa: { select: { nome: true } } } },
      },
    }),
  ]);

  const desmarquesPorEmpresa = await contarDesmarquesEmpresaEmLote(
    [...new Set(meusExtrasMarcados.map((e) => e.empresaId))]
  );

  const vagaIdsComCandidatura = new Set(minhasCandidaturas.map((c) => c.vagaId));
  const conversaIdPorEmpresa = new Map(minhasConversas.map((c) => [c.empresaId, c.id]));
  const empresaConviteNomePorVaga = new Map(
    convitesRecebidos.map((c) => [c.vagaId, c.vaga.nomeFantasia || c.vaga.empresa.nome])
  );

  const itensVagas = vagasAbertas.map((vaga) => {
    const enderecoDestino = vaga.localizacao?.trim() || vaga.empresa.endereco?.trim() || null;
    return {
      id: vaga.id,
      cargo: vaga.cargo,
      valorHora: vaga.valorHora !== null ? Number(vaga.valorHora) : null,
      categoria: vaga.categoria,
      logoUrl: vaga.logoUrl,
      possibilidadeEfetivacao: vaga.possibilidadeEfetivacao,
      empresaNome: vaga.nomeFantasia || vaga.empresa.nome,
      empresaCidade: vaga.empresa.cidade,
      descricao: vaga.descricao,
      localizacao: vaga.localizacao,
      turnoDia: vaga.turnoDia,
      turnoNoite: vaga.turnoNoite,
      horarios: {
        inicioDiaMin: vaga.empresa.horarioInicioDiaMin,
        fechamentoDiaMin: vaga.empresa.horarioFechamentoDiaMin,
        inicioNoiteMin: vaga.empresa.horarioInicioNoiteMin,
        fechamentoNoiteMin: vaga.empresa.horarioFechamentoNoiteMin,
      },
      jaCandidatou: vagaIdsComCandidatura.has(vaga.id),
      ehMatch: calcularMatch(vaga.habilidadesProcuradas, pessoa.habilidades),
      conversaId: conversaIdPorEmpresa.get(vaga.empresaId) ?? null,
      linkRota:
        enderecoOrigem && enderecoDestino ? linkGoogleMapsTransit(enderecoOrigem, enderecoDestino) : null,
    };
  });

  // Só vagas com convite JÁ enviado e ainda não candidatadas — depois que
  // ela se candidata, o convite cumpriu seu papel (chamar a atenção) e a
  // vaga já aparece normal em "Minhas candidaturas" logo abaixo.
  const itensConvites = itensVagas
    .filter((item) => empresaConviteNomePorVaga.has(item.id) && !item.jaCandidatou)
    .map((item) => ({ ...item, empresaConviteNome: empresaConviteNomePorVaga.get(item.id)! }));

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

      {meusExtrasMarcados.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 text-sm mb-3">🤝 Meus Frees marcados</h2>
          <ul className="flex flex-col gap-2">
            {meusExtrasMarcados.map((e) => (
              <ExtraMarcadoPessoa
                key={e.id}
                extra={{
                  id: e.id,
                  data: e.data,
                  turnoTipo: e.turnoTipo,
                  status: e.status as "AGUARDANDO_PESSOA" | "CONFIRMADO",
                  empresaNome: e.empresa.nome,
                  empresaJaDesmarcouVezes: desmarquesPorEmpresa.get(e.empresaId) ?? 0,
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {!pessoa.disponivelParaOportunidades && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col gap-2">
          <p className="text-sm text-stone-600">
            Você está com &quot;Disponível para novas oportunidades&quot; desligado — por isso não vê o
            quadro de vagas nem aparece pra outras empresas.
            {meusExtrasMarcados.some((e) => e.status === "CONFIRMADO") &&
              " Isso foi desligado automaticamente quando você combinou um Free — reative quando quiser buscar mais oportunidades."}
          </p>
          <Link href="/portal" className="text-brand-700 underline text-sm self-start">
            Ir pro meu perfil e reativar
          </Link>
        </div>
      )}

      {pessoa.disponivelParaOportunidades && !pessoa.cidade?.trim() && (
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
      )}

      {quadroLiberado && itensConvites.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 text-sm mb-3">🤝 Convites pra você</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {itensConvites.map((vaga) => (
              <li key={vaga.id} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-brand-700">
                  🤝 {vaga.empresaConviteNome} quer te chamar a atenção pra essa vaga
                </span>
                <ChamarParaConversarBotao
                  vagaId={vaga.id}
                  jaCandidatou={vaga.jaCandidatou}
                  conversaIdExistente={vaga.conversaId}
                />
                <VagaCard
                  vaga={vaga}
                  jaCandidatou={vaga.jaCandidatou}
                  ehMatch={vaga.ehMatch}
                  conversaId={vaga.conversaId}
                  linkRota={vaga.linkRota}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {quadroLiberado && <FiltroVagas itens={itensVagas} />}

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
