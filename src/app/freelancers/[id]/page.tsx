import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarDataHora } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import SelecaoTurnos from "./SelecaoTurnos";
import PagamentoForm from "./PagamentoForm";
import DadosPessoaForm from "./DadosPessoaForm";

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
        },
      },
    },
  });
  if (!vinculo) notFound();
  const valorDiariaAtual = vinculo.valorDiaria !== null ? Number(vinculo.valorDiaria) : null;

  const turnos = await prisma.turno.findMany({
    where: { pessoaId, empresaId: sessao.empresaEfetivoId },
    orderBy: { horaEntrada: "desc" },
    select: {
      id: true,
      horaEntrada: true,
      horaSaida: true,
      valorTotal: true,
      status: true,
      assinaturaReciboUrl: true,
      funcao: { select: { nome: true } },
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
          {vinculo.pessoa.telefone} · PIX ({LABEL_TIPO_CHAVE_PIX[vinculo.pessoa.tipoChavePix]}):{" "}
          {vinculo.pessoa.chavePix}
        </p>
      </div>

      <PagamentoForm
        pessoaId={pessoaId}
        modoPagamentoAtual={vinculo.modoPagamento}
        valorDiariaAtual={valorDiariaAtual}
        frequenciaPagamentoAtual={vinculo.frequenciaPagamento}
      />

      <DadosPessoaForm
        pessoaId={pessoaId}
        dadosIniciais={{
          nome: vinculo.pessoa.nome,
          telefone: vinculo.pessoa.telefone,
          endereco: vinculo.pessoa.endereco,
          numero: vinculo.pessoa.numero ?? "",
          complemento: vinculo.pessoa.complemento ?? "",
          chavePix: vinculo.pessoa.chavePix,
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
            dataLabel: formatarDataHora(t.horaEntrada),
            horaSaidaLabel: t.horaSaida ? formatarDataHora(t.horaSaida) : null,
            valorTotal: t.valorTotal !== null ? Number(t.valorTotal) : null,
            status: t.status,
            temRecibo: t.horaSaida !== null && t.assinaturaReciboUrl !== null,
          }))}
        />
      )}
    </div>
  );
}
