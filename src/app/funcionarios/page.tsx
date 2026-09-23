import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import FuncionarioRow from "./FuncionarioRow";
import NovoFuncionarioForm from "./NovoFuncionarioForm";
import { calcularFeriasEmAndamento } from "@/lib/ferias";

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<{ desativados?: string }>;
}) {
  const sessao = await requireModulo("funcionarios");
  const { desativados } = await searchParams;
  const mostrarDesativados = desativados === "1";

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "CLT" },
    orderBy: { pessoa: { nome: "asc" } },
    select: {
      ativo: true,
      salarioMensal: true,
      escalaTrabalho: true,
      dataRescisao: true,
      ultimasFeriasGozadasEm: true,
      feriasQuantidadeDias: true,
      pessoa: {
        select: { id: true, nome: true, documento: true, telefone: true },
      },
    },
  });

  const hoje = new Date();

  const totalDesativados = vinculos.filter((v) => !v.ativo).length;
  const listaExibida = mostrarDesativados ? vinculos : vinculos.filter((v) => v.ativo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Funcionários</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Controle interno de jornada pra quem é CLT — entrada, saída e (se
          você habilitar) intervalo, sem cálculo de valor nem pagamento. Não
          substitui o registro eletrônico de ponto oficial (Portaria MTE
          671/2021).
        </p>
      </div>

      {totalDesativados > 0 && (
        <div>
          <Link
            href={mostrarDesativados ? "/funcionarios" : "/funcionarios?desativados=1"}
            className="text-sm text-stone-600 hover:underline"
          >
            {mostrarDesativados
              ? "Ocultar desativados"
              : `Mostrar desativados (${totalDesativados})`}
          </Link>
        </div>
      )}

      {listaExibida.length === 0 && (
        <p className="text-stone-500 text-sm">
          {mostrarDesativados || totalDesativados === 0
            ? "Nenhum funcionário cadastrado ainda."
            : "Nenhum funcionário ativo — todos estão desativados."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {listaExibida.map((v) => (
          <FuncionarioRow
            key={v.pessoa.id}
            funcionario={{
              pessoaId: v.pessoa.id,
              nome: v.pessoa.nome,
              documento: v.pessoa.documento,
              telefone: v.pessoa.telefone,
              salarioMensal: v.salarioMensal !== null ? Number(v.salarioMensal) : null,
              escalaTrabalho: v.escalaTrabalho,
              ativo: v.ativo,
              dataRescisaoLabel: v.dataRescisao
                ? v.dataRescisao.toLocaleDateString("pt-BR", { timeZone: "UTC" })
                : null,
              feriasRetornoLabel: (() => {
                const emAndamento = calcularFeriasEmAndamento(
                  v.ultimasFeriasGozadasEm,
                  v.feriasQuantidadeDias,
                  hoje
                );
                return emAndamento
                  ? emAndamento.retorno.toLocaleDateString("pt-BR", { timeZone: "UTC" })
                  : null;
              })(),
            }}
          />
        ))}
      </ul>

      <NovoFuncionarioForm />
    </div>
  );
}
