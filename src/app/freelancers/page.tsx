import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import FreelancerRow from "./FreelancerRow";

export default async function FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ desativados?: string; bloqueado?: string }>;
}) {
  const sessao = await requireModulo("freelancers");
  const { desativados, bloqueado } = await searchParams;
  const mostrarDesativados = desativados === "1";
  const somenteBloqueados = bloqueado === "1";

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "EXTRA" },
    orderBy: { pessoa: { nome: "asc" } },
    select: {
      ativo: true,
      bloqueadoSuspeitaFraudeEm: true,
      pessoa: {
        select: {
          id: true,
          nome: true,
          documento: true,
          tipoDocumento: true,
          telefone: true,
          chavePix: true,
          tipoChavePix: true,
          fotoPerfilUrl: true,
          sexo: true,
        },
      },
    },
  });

  const totalDesativados = vinculos.filter((v) => !v.ativo).length;
  const totalBloqueados = vinculos.filter((v) => v.bloqueadoSuspeitaFraudeEm !== null).length;
  const listaExibida = somenteBloqueados
    ? vinculos.filter((v) => v.bloqueadoSuspeitaFraudeEm !== null)
    : mostrarDesativados
      ? vinculos
      : vinculos.filter((v) => v.ativo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Freelancers</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Todo mundo que já bateu CPF/CNPJ no totem desta empresa. Desativar
          aqui impede a pessoa de iniciar um novo turno, sem apagar o
          cadastro dela nem o histórico — só quem tem acesso master pode
          excluir um cadastro de vez.
        </p>
      </div>

      {somenteBloqueados && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-3">
          <span>🚨 Mostrando só quem está bloqueado por suspeita de fraude no totem.</span>
          <Link href="/freelancers" className="underline font-medium shrink-0">
            Ver todos
          </Link>
        </div>
      )}

      {!somenteBloqueados && totalBloqueados > 0 && (
        <div>
          <Link href="/freelancers?bloqueado=1" className="text-sm text-red-700 font-medium hover:underline">
            🚨 {totalBloqueados} {totalBloqueados === 1 ? "pessoa bloqueada" : "pessoas bloqueadas"} por suspeita de fraude
          </Link>
        </div>
      )}

      {!somenteBloqueados && totalDesativados > 0 && (
        <div>
          <Link
            href={mostrarDesativados ? "/freelancers" : "/freelancers?desativados=1"}
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
          {somenteBloqueados
            ? "Ninguém bloqueado por suspeita de fraude no momento."
            : mostrarDesativados || totalDesativados === 0
              ? "Nenhum freelancer cadastrado ainda."
              : "Nenhum freelancer ativo — todos estão desativados."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {listaExibida.map((v) => (
          <FreelancerRow
            key={v.pessoa.id}
            freelancer={{
              pessoaId: v.pessoa.id,
              nome: v.pessoa.nome,
              documento: v.pessoa.documento,
              tipoDocumento: v.pessoa.tipoDocumento,
              telefone: v.pessoa.telefone,
              chavePix: v.pessoa.chavePix ?? "",
              tipoChavePix: v.pessoa.tipoChavePix ?? "CPF",
              temFoto: Boolean(v.pessoa.fotoPerfilUrl),
              sexo: v.pessoa.sexo,
              ativo: v.ativo,
              bloqueadoSuspeitaFraude: v.bloqueadoSuspeitaFraudeEm !== null,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
