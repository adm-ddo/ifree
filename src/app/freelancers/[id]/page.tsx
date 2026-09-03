import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarDataHoraComDiaSemana } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import SelecaoTurnos from "./SelecaoTurnos";
import PagamentoForm from "./PagamentoForm";
import MetaHorasForm from "./MetaHorasForm";
import TurnoPredefinidoSelect from "./TurnoPredefinidoSelect";
import DadosPessoaForm from "./DadosPessoaForm";
import ConverterParaCltButton from "./ConverterParaCltButton";
import ReputacaoCard from "./ReputacaoCard";
import RestricaoHorarioForm from "@/components/RestricaoHorarioForm";
import { atualizarRestricaoHorario } from "@/app/funcionarios/actions";

export default async function FreelancerDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenant();
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    include: {
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
        },
      },
      restricoesHorario: { select: { diaSemana: true, horaMinimaMin: true, horaMaximaMin: true } },
    },
  });
  if (!vinculo) notFound();
  const valorDiariaAtual = vinculo.valorDiaria !== null ? Number(vinculo.valorDiaria) : null;

  const [avaliacoesRecebidas, totalIndicacoes] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { autor: "EMPRESA", turno: { pessoaId } },
      select: {
        nota: true,
        tags: true,
        criadoEm: true,
        turno: { select: { empresa: { select: { nome: true } } } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.pessoa.count({ where: { indicadoPorPessoaId: pessoaId } }),
  ]);

  const turnos = await prisma.turno.findMany({
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
      funcao: { select: { nome: true } },
      pagamento: { select: { status: true, grupoPagamentoId: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/freelancers" className="text-sm text-brand-700 hover:underline">
          ← Freelancers
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">
          {vinculo.pessoa.nome}
        </h1>
        <p className="text-stone-600 mt-1 text-sm">
          {LABEL_TIPO_DOCUMENTO[vinculo.pessoa.tipoDocumento]}{" "}
          {formatarDocumento(vinculo.pessoa.tipoDocumento, vinculo.pessoa.documento)} ·{" "}
          {vinculo.pessoa.telefone}
          {vinculo.pessoa.chavePix && vinculo.pessoa.tipoChavePix && (
            <> · PIX ({LABEL_TIPO_CHAVE_PIX[vinculo.pessoa.tipoChavePix]}): {vinculo.pessoa.chavePix}</>
          )}
        </p>
      </div>

      <ReputacaoCard
        avaliacoes={avaliacoesRecebidas.map((a) => ({
          nota: a.nota,
          tags: a.tags,
          criadoEm: a.criadoEm,
          empresaNome: a.turno.empresa.nome,
        }))}
        totalIndicacoes={totalIndicacoes}
      />

      <ConverterParaCltButton pessoaId={pessoaId} pessoaNome={vinculo.pessoa.nome} />

      <PagamentoForm
        pessoaId={pessoaId}
        modoPagamentoAtual={vinculo.modoPagamento}
        valorDiariaAtual={valorDiariaAtual}
        frequenciaPagamentoAtual={vinculo.frequenciaPagamento}
      />

      <TurnoPredefinidoSelect pessoaId={pessoaId} valorAtual={vinculo.turnoPredefinido} />

      <MetaHorasForm
        pessoaId={pessoaId}
        cargaHorariaSemanalHorasAtual={
          vinculo.cargaHorariaSemanalMin !== null ? vinculo.cargaHorariaSemanalMin / 60 : null
        }
      />

      <RestricaoHorarioForm
        pessoaId={pessoaId}
        restricoesAtuais={vinculo.restricoesHorario}
        action={atualizarRestricaoHorario}
      />

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
          dataNascimento: vinculo.pessoa.dataNascimento
            ? vinculo.pessoa.dataNascimento.toISOString().slice(0, 10)
            : "",
          cep: vinculo.pessoa.cep ?? "",
          contatoEmergenciaNome: vinculo.pessoa.contatoEmergenciaNome ?? "",
          contatoEmergenciaTelefone: vinculo.pessoa.contatoEmergenciaTelefone ?? "",
        }}
      />

      {turnos.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Nenhum turno registrado ainda pra essa pessoa nesta empresa.
        </p>
      ) : (
        <SelecaoTurnos
          turnos={turnos.map((t) => ({
            id: t.id,
            funcaoNome: t.funcao.nome,
            dataLabel: formatarDataHoraComDiaSemana(t.horaEntrada),
            horaSaidaLabel: t.horaSaida
              ? formatarDataHoraComDiaSemana(t.horaSaida, t.horaEntrada)
              : null,
            valorTotal: t.valorTotal !== null ? Number(t.valorTotal) : null,
            status: t.status,
            temRecibo: t.horaSaida !== null && t.valorTotal !== null,
            podeMarcarComoPago: t.pagamento?.status === "PENDENTE" || t.pagamento?.status === "FALHOU",
            grupoPagamentoId: t.pagamento?.grupoPagamentoId ?? null,
            precisaResolverSaida: t.status !== "ABERTO" && t.fechamentoAutomatico && !t.correcaoSaidaEm,
            podeCorrigirSaida: t.status !== "ABERTO" && (t.fechamentoAutomatico || t.correcaoSaidaEm !== null),
          }))}
        />
      )}
    </div>
  );
}
