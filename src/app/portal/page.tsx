import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { formatarDocumento, LABEL_TIPO_CHAVE_PIX, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import { formatarDataHoraComDiaSemana } from "@/lib/data";
import { baixarComoDataUrl } from "@/lib/blob";
import { calcularCompletude } from "@/lib/perfil-completude";
import { HABILIDADES_SUGERIDAS, VAGAS_SUGERIDAS } from "@/lib/habilidades";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";
import MeusDadosForm from "./MeusDadosForm";
import TrocarEmailForm from "./TrocarEmailForm";
import FotoPerfilForm from "./FotoPerfilForm";
import PerfilProfissionalForm from "./PerfilProfissionalForm";
import DisponibilidadeToggle from "./DisponibilidadeToggle";
import IndicacaoCard from "./IndicacaoCard";
import SugestaoInstalarApp from "./SugestaoInstalarApp";

const LABEL_STATUS_TURNO: Record<string, string> = {
  ABERTO: "Em andamento",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const COR_STATUS_TURNO: Record<string, string> = {
  ABERTO: "bg-amber-50 text-amber-700 border-amber-200",
  CONCLUIDO: "bg-stone-100 text-stone-600 border-stone-200",
  PAGO: "bg-brand-50 text-brand-700 border-brand-200",
  ERRO_PAGAMENTO: "bg-red-50 text-red-700 border-red-200",
};

const LABEL_STATUS_PONTO: Record<string, string> = {
  ABERTO: "Em andamento",
  CONCLUIDO: "Concluído",
  PENDENTE_CORRECAO: "Aguardando correção",
};

/** Home do Portal (iFREE Conecta) — reúne, num lugar só, o que já é da
 * Pessoa em QUALQUER empresa: perfil profissional, reputação
 * (ReputacaoCard, reaproveitado de /freelancers/[id] sem alteração) e
 * histórico de Turno (extra) e RegistroPonto (CLT), nenhum dos dois
 * filtrado por empresaId — de propósito, é o ponto central da ideia (ver
 * /conecta). */
export default async function PortalHomePage() {
  const sessao = await requirePessoaComTermosAceitos();

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: {
      nome: true,
      documento: true,
      tipoDocumento: true,
      telefone: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cep: true,
      cidade: true,
      chavePix: true,
      tipoChavePix: true,
      email: true,
      fotoPerfilUrl: true,
      biografia: true,
      habilidades: true,
      vagasDesejadas: true,
      rg: true,
      dataNascimento: true,
      contatoEmergenciaNome: true,
      contatoEmergenciaTelefone: true,
      meiosTransporte: true,
      disponivelParaOportunidades: true,
      sexo: true,
    },
  });

  const [avaliacoesRecebidas, totalIndicacoes, turnos, registrosPonto, fotoDataUrl] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { autor: "EMPRESA", turno: { pessoaId: sessao.pessoaId } },
      select: {
        nota: true,
        tags: true,
        criadoEm: true,
        turno: { select: { empresa: { select: { nome: true } } } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.pessoa.count({ where: { indicadoPorPessoaId: sessao.pessoaId } }),
    prisma.turno.findMany({
      where: { pessoaId: sessao.pessoaId },
      orderBy: { horaEntrada: "desc" },
      take: 20,
      select: {
        id: true,
        horaEntrada: true,
        valorTotal: true,
        status: true,
        empresa: { select: { nome: true } },
        funcao: { select: { nome: true } },
      },
    }),
    prisma.registroPonto.findMany({
      where: { pessoaId: sessao.pessoaId },
      orderBy: { horaEntrada: "desc" },
      take: 20,
      select: {
        id: true,
        horaEntrada: true,
        minutosTrabalhados: true,
        minutosDescontadosPausa: true,
        status: true,
        empresa: { select: { nome: true } },
      },
    }),
    pessoa.fotoPerfilUrl ? baixarComoDataUrl(pessoa.fotoPerfilUrl) : Promise.resolve(null),
  ]);

  const conversas = await prisma.conversa.findMany({
    where: { pessoaId: sessao.pessoaId },
    orderBy: { criadaEm: "desc" },
    select: {
      id: true,
      ultimaLeituraPessoaEm: true,
      empresa: { select: { nome: true } },
      mensagens: {
        where: { autor: "EMPRESA" },
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { criadoEm: true },
      },
    },
  });
  const temMensagemNaoLida = conversas.some((c) => {
    const ultima = c.mensagens[0];
    return ultima && (!c.ultimaLeituraPessoaEm || ultima.criadoEm > c.ultimaLeituraPessoaEm);
  });

  const completude = calcularCompletude(pessoa);

  return (
    <div className="flex flex-col gap-6 -mx-4 sm:mx-0 bg-navy-900 sm:rounded-3xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-4">
        <FotoPerfilForm fotoDataUrl={fotoDataUrl} />
        <div>
          <h1 className="text-2xl font-semibold text-white">Olá, {pessoa.nome.split(" ")[0]}</h1>
          <p className="text-navy-300 mt-1 text-sm">
            {LABEL_TIPO_DOCUMENTO[pessoa.tipoDocumento]}{" "}
            {formatarDocumento(pessoa.tipoDocumento, pessoa.documento)} · {pessoa.telefone}
            {pessoa.chavePix && pessoa.tipoChavePix && (
              <>
                {" "}
                · PIX ({LABEL_TIPO_CHAVE_PIX[pessoa.tipoChavePix]}): {pessoa.chavePix}
              </>
            )}
          </p>
        </div>
      </div>

      <SugestaoInstalarApp />

      {conversas.length > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-2">
          <h2 className="font-semibold text-navy-900 text-sm">
            🎯 Você deu match com {conversas.length} empresa{conversas.length === 1 ? "" : "s"}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {conversas.map((c) => {
              const ultima = c.mensagens[0];
              const naoLida =
                ultima && (!c.ultimaLeituraPessoaEm || ultima.criadoEm > c.ultimaLeituraPessoaEm);
              return (
                <li key={c.id}>
                  <Link
                    href={`/portal/conversas/${c.id}`}
                    className={`rounded-full border text-xs font-medium px-3 py-1.5 transition-colors ${
                      naoLida
                        ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                        : "bg-white border-stone-300 text-stone-700 hover:border-brand-400"
                    }`}
                  >
                    {c.empresa.nome}
                    {naoLida && " 🔴"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {conversas.length > 0 && (
          <Link
            href="/portal/conversas"
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center gap-2 hover:border-brand-300 transition-colors"
          >
            <span className="text-navy-900 text-sm font-medium">💬 Mensagens</span>
            {temMensagemNaoLida && <span className="h-2 w-2 rounded-full bg-brand-500" />}
          </Link>
        )}
        <Link
          href="/portal/denuncias"
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center gap-2 hover:border-brand-300 transition-colors"
        >
          <span className="text-navy-900 text-sm font-medium">📢 Canal de Ética</span>
        </Link>
      </div>

      <DisponibilidadeToggle inicial={pessoa.disponivelParaOportunidades} />

      {completude.percentual < 100 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <h2 className="font-semibold text-navy-900">Complete seu perfil</h2>
            <span className="text-brand-700 font-medium">{completude.percentual}%</span>
          </div>
          <div className="h-2 rounded-full bg-brand-100 overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${completude.percentual}%` }}
            />
          </div>
          <p className="text-xs text-stone-600">
            Quanto mais completo o seu perfil, mais vagas relevantes aparecem
            pra você e maior a chance de ser chamado(a) — as empresas veem
            esses dados na hora de decidir quem chamar.
          </p>
          <p className="text-xs text-stone-600">Falta: {completude.faltando.join(", ")}</p>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-col gap-2">
        <h2 className="font-semibold text-navy-900 text-sm">📄 Seu currículo em PDF</h2>
        <p className="text-xs text-stone-600">
          Geramos um currículo em PDF pronto com as informações do seu perfil — biografia,
          habilidades, experiência e reputação. Baixe pra guardar, imprimir ou enviar pra outras
          oportunidades de emprego, dentro ou fora do iFREE.
        </p>
        <p className="text-xs text-stone-600">
          Ele é montado automaticamente a partir do que você preenche aqui: quanto mais completo o
          seu perfil, mais completo (e mais forte) fica o currículo.
        </p>
        <div className="flex flex-col gap-1 mt-1">
          {completude.liberaCurriculo ? (
            <Link
              href="/portal/curriculo/pdf"
              target="_blank"
              className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2.5 transition-colors self-start"
            >
              📄 Gerar meu currículo
            </Link>
          ) : (
            <span className="rounded-lg bg-stone-200 text-stone-500 text-sm font-medium px-4 py-2.5 self-start cursor-not-allowed">
              📄 Gerar meu currículo
            </span>
          )}
          {!completude.liberaCurriculo && (
            <p className="text-xs text-stone-500">
              Complete pelo menos metade do perfil pra liberar o currículo.
            </p>
          )}
        </div>
      </div>

      <TrocarEmailForm emailAtual={pessoa.email} />

      <MeusDadosForm
        dadosIniciais={{
          telefone: pessoa.telefone,
          endereco: pessoa.endereco,
          numero: pessoa.numero ?? "",
          complemento: pessoa.complemento ?? "",
          bairro: pessoa.bairro ?? "",
          cep: pessoa.cep ?? "",
          cidade: pessoa.cidade ?? "",
          chavePix: pessoa.chavePix ?? "",
          rg: pessoa.rg ?? "",
          dataNascimento: pessoa.dataNascimento ? pessoa.dataNascimento.toISOString().slice(0, 10) : "",
          contatoEmergenciaNome: pessoa.contatoEmergenciaNome ?? "",
          contatoEmergenciaTelefone: pessoa.contatoEmergenciaTelefone ?? "",
          meiosTransporte: pessoa.meiosTransporte,
        }}
      />

      <PerfilProfissionalForm
        dadosIniciais={{
          biografia: pessoa.biografia ?? "",
          habilidades: pessoa.habilidades,
          vagasDesejadas: pessoa.vagasDesejadas,
          sexo: pessoa.sexo,
        }}
        habilidadesSugeridas={HABILIDADES_SUGERIDAS}
        vagasSugeridas={VAGAS_SUGERIDAS}
      />

      <ReputacaoCard
        avaliacoes={avaliacoesRecebidas.map((a) => ({
          nota: a.nota,
          tags: a.tags,
          criadoEm: a.criadoEm,
          empresaNome: a.turno.empresa.nome,
        }))}
        totalIndicacoes={totalIndicacoes}
      />

      <IndicacaoCard pessoaId={sessao.pessoaId} totalIndicacoes={totalIndicacoes} />

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
        <h2 className="font-semibold text-navy-900 text-sm">Turnos (extra)</h2>
        {turnos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum turno ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {turnos.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 text-sm border-b border-stone-100 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-navy-900 truncate">{t.empresa.nome}</span>
                  <span className="text-xs text-stone-500">
                    {t.funcao.nome} · {formatarDataHoraComDiaSemana(t.horaEntrada)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_STATUS_TURNO[t.status]}`}
                  >
                    {LABEL_STATUS_TURNO[t.status]}
                  </span>
                  {t.valorTotal !== null && (
                    <span className="text-stone-600 text-xs">R$ {Number(t.valorTotal).toFixed(2)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {registrosPonto.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900 text-sm">Ponto (CLT)</h2>
          <ul className="flex flex-col gap-2">
            {registrosPonto.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 text-sm border-b border-stone-100 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-navy-900 truncate">{r.empresa.nome}</span>
                  <span className="text-xs text-stone-500">{formatarDataHoraComDiaSemana(r.horaEntrada)}</span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="rounded-full border border-stone-200 bg-stone-100 text-stone-600 text-[11px] font-medium px-2 py-0.5">
                    {LABEL_STATUS_PONTO[r.status]}
                  </span>
                  {r.minutosTrabalhados !== null && (
                    <span
                      className="text-stone-600 text-xs"
                      title={
                        r.minutosDescontadosPausa !== null
                          ? `Já com ${r.minutosDescontadosPausa}min de intervalo descontados`
                          : undefined
                      }
                    >
                      {Math.floor(r.minutosTrabalhados / 60)}h
                      {String(r.minutosTrabalhados % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
