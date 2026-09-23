import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { usuarioEhResponsavelGed } from "@/lib/ged";
import { formatarDataHoraComDiaSemana } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import SelecaoTurnos from "@/app/freelancers/[id]/SelecaoTurnos";
import CorrigirFuncaoForm from "@/app/turnos/[id]/CorrigirFuncaoForm";
import PagamentoForm from "@/app/freelancers/[id]/PagamentoForm";
import MetaHorasForm from "@/app/freelancers/[id]/MetaHorasForm";
import TurnoPredefinidoSelect from "@/app/freelancers/[id]/TurnoPredefinidoSelect";
import DadosPessoaForm from "@/app/freelancers/[id]/DadosPessoaForm";
import ConverterParaCltButton from "@/app/freelancers/[id]/ConverterParaCltButton";
import ReputacaoCard from "@/app/freelancers/[id]/ReputacaoCard";
import RestricaoHorarioForm from "@/components/RestricaoHorarioForm";
import AvatarPessoa from "@/components/AvatarPessoa";
import { atualizarRestricaoHorario } from "@/app/funcionarios/actions";

/** Espelho completo de src/app/freelancers/[id]/page.tsx (v1, não
 * tocado) — mesmas 5 queries em paralelo, mesmos formulários/cartões
 * reaproveitados sem alteração (DadosPessoaForm, CorrigirFuncaoForm,
 * ReputacaoCard, ConverterParaCltButton, PagamentoForm,
 * TurnoPredefinidoSelect, MetaHorasForm, RestricaoHorarioForm,
 * SelecaoTurnos — todos já são cartões brancos genéricos, sem chrome do
 * v1). Só o cabeçalho ganhou o visual novo. */
export default async function V2FreelancerDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireModulo("freelancers");
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const [vinculo, avaliacoesRecebidas, totalIndicacoes, turnos, funcoesAtivas, responsavelGed] = await Promise.all([
    prisma.vinculoPessoaEmpresa.findUnique({
      where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
      select: {
        modoPagamento: true,
        valorDiaria: true,
        frequenciaPagamento: true,
        cargaHorariaSemanalMin: true,
        turnoPredefinido: true,
        pessoa: {
          select: {
            nome: true,
            documento: true,
            tipoDocumento: true,
            telefone: true,
            endereco: true,
            numero: true,
            complemento: true,
            chavePix: true,
            tipoChavePix: true,
            email: true,
            rg: true,
            dataNascimento: true,
            cep: true,
            contatoEmergenciaNome: true,
            contatoEmergenciaTelefone: true,
            fotoPerfilUrl: true,
            sexo: true,
          },
        },
        restricoesHorario: { select: { diaSemana: true, horaMinimaMin: true, horaMaximaMin: true } },
      },
    }),
    prisma.avaliacao.findMany({
      where: { autor: "EMPRESA", turno: { pessoaId } },
      select: { nota: true, tags: true, criadoEm: true, turno: { select: { empresa: { select: { nome: true } } } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.pessoa.count({ where: { indicadoPorPessoaId: pessoaId } }),
    prisma.turno.findMany({
      where: { pessoaId, empresaId: sessao.empresaEfetivoId },
      orderBy: { horaEntrada: "desc" },
      select: {
        id: true,
        horaEntrada: true,
        horaSaida: true,
        valorTotal: true,
        status: true,
        fechamentoAutomatico: true,
        correcaoSaidaEm: true,
        funcao: { select: { id: true, nome: true } },
        pagamento: { select: { status: true, grupoPagamentoId: true, erro: true } },
      },
    }),
    prisma.funcao.findMany({ where: { empresaId: sessao.empresaEfetivoId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    usuarioEhResponsavelGed(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster),
  ]);
  if (!vinculo) notFound();
  const valorDiariaAtual = vinculo.valorDiaria !== null ? Number(vinculo.valorDiaria) : null;
  const turnoAtual = turnos[0] ?? null;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/freelancers" className="text-xs font-bold text-brand-700">
          ← Freelancers
        </Link>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <AvatarPessoa pessoaId={pessoaId} nome={vinculo.pessoa.nome} temFoto={Boolean(vinculo.pessoa.fotoPerfilUrl)} sexo={vinculo.pessoa.sexo} tamanho="lg" />
          <h1 className="text-xl font-extrabold text-navy-900">{vinculo.pessoa.nome}</h1>
          <DadosPessoaForm
            pessoaId={pessoaId}
            dadosIniciais={{
              nome: vinculo.pessoa.nome,
              telefone: vinculo.pessoa.telefone,
              endereco: vinculo.pessoa.endereco,
              numero: vinculo.pessoa.numero ?? "",
              complemento: vinculo.pessoa.complemento ?? "",
              chavePix: vinculo.pessoa.chavePix ?? "",
              email: vinculo.pessoa.email ?? "",
              rg: vinculo.pessoa.rg ?? "",
              dataNascimento: vinculo.pessoa.dataNascimento ? vinculo.pessoa.dataNascimento.toISOString().slice(0, 10) : "",
              cep: vinculo.pessoa.cep ?? "",
              contatoEmergenciaNome: vinculo.pessoa.contatoEmergenciaNome ?? "",
              contatoEmergenciaTelefone: vinculo.pessoa.contatoEmergenciaTelefone ?? "",
            }}
          />
        </div>
        <p className="text-stone-500 text-sm mt-0.5">
          {LABEL_TIPO_DOCUMENTO[vinculo.pessoa.tipoDocumento]} {formatarDocumento(vinculo.pessoa.tipoDocumento, vinculo.pessoa.documento)} ·{" "}
          {vinculo.pessoa.telefone}
          {vinculo.pessoa.chavePix && vinculo.pessoa.tipoChavePix && (
            <> · PIX ({LABEL_TIPO_CHAVE_PIX[vinculo.pessoa.tipoChavePix]}): {vinculo.pessoa.chavePix}</>
          )}
        </p>
      </div>

      {turnoAtual && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-stone-600">
            Função atual: <span className="font-bold text-navy-900">{turnoAtual.funcao.nome}</span>{" "}
            <span className="text-stone-400">
              (último turno,{" "}
              <Link href={`/v2/turnos/${turnoAtual.id}`} className="underline">
                ver turno
              </Link>
              )
            </span>
          </p>
          {turnoAtual.status === "PAGO" ? (
            <p className="text-xs text-stone-500">O último turno já foi pago — pra corrigir a função de um turno pago, é preciso reverter o pagamento primeiro (em /turnos).</p>
          ) : (
            <CorrigirFuncaoForm turnoId={turnoAtual.id} funcaoAtualId={turnoAtual.funcao.id} funcoes={funcoesAtivas} />
          )}
        </div>
      )}

      <ReputacaoCard
        avaliacoes={avaliacoesRecebidas.map((a) => ({ nota: a.nota, tags: a.tags, criadoEm: a.criadoEm, empresaNome: a.turno.empresa.nome }))}
        totalIndicacoes={totalIndicacoes}
      />

      <ConverterParaCltButton pessoaId={pessoaId} pessoaNome={vinculo.pessoa.nome} responsavelGed={responsavelGed} />

      <PagamentoForm pessoaId={pessoaId} modoPagamentoAtual={vinculo.modoPagamento} valorDiariaAtual={valorDiariaAtual} frequenciaPagamentoAtual={vinculo.frequenciaPagamento} />

      <TurnoPredefinidoSelect pessoaId={pessoaId} valorAtual={vinculo.turnoPredefinido} />

      <MetaHorasForm pessoaId={pessoaId} cargaHorariaSemanalHorasAtual={vinculo.cargaHorariaSemanalMin !== null ? vinculo.cargaHorariaSemanalMin / 60 : null} />

      <RestricaoHorarioForm pessoaId={pessoaId} restricoesAtuais={vinculo.restricoesHorario} action={atualizarRestricaoHorario} />

      {turnos.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum turno registrado ainda pra essa pessoa nesta empresa.</p>
      ) : (
        <SelecaoTurnos
          turnos={turnos.map((t) => ({
            id: t.id,
            funcaoNome: t.funcao.nome,
            dataLabel: formatarDataHoraComDiaSemana(t.horaEntrada),
            horaSaidaLabel: t.horaSaida ? formatarDataHoraComDiaSemana(t.horaSaida, t.horaEntrada) : null,
            valorTotal: t.valorTotal !== null ? Number(t.valorTotal) : null,
            status: t.status,
            temRecibo: t.horaSaida !== null && t.valorTotal !== null,
            podeMarcarComoPago: t.pagamento?.status === "PENDENTE" || t.pagamento?.status === "FALHOU",
            erroPagamento: t.pagamento?.status === "FALHOU" ? (t.pagamento?.erro ?? null) : null,
            podeTentarNovamente: t.pagamento?.status === "FALHOU",
            grupoPagamentoId: t.pagamento?.grupoPagamentoId ?? null,
            precisaResolverSaida: t.status !== "ABERTO" && t.fechamentoAutomatico && !t.correcaoSaidaEm,
            podeCorrigirSaida: t.status !== "ABERTO" && (t.fechamentoAutomatico || t.correcaoSaidaEm !== null),
          }))}
        />
      )}
    </div>
  );
}
