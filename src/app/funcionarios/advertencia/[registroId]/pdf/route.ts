import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { gerarPdfAdvertenciaPonto } from "@/lib/advertencia-pdf";
import { sanitizarNomeArquivo } from "@/lib/texto";

/** Carta de advertência disciplinar por falta de registro — só faz
 * sentido pra um RegistroPonto que precisou de correção manual
 * (correcaoSaidaEm preenchido), mesmo critério do botão que leva aqui
 * (ver RegistroPontoHistorico.tsx). Exige CTPS e cargo já cadastrados —
 * sem isso o modelo ficaria com campo em branco, pior que não gerar
 * nada. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ registroId: string }> }
) {
  const sessao = await requireTenant();
  const { registroId: registroIdBruto } = await params;
  const registroId = Number(registroIdBruto);
  if (!Number.isInteger(registroId)) notFound();

  const registro = await prisma.registroPonto.findUnique({
    where: { id: registroId },
    select: {
      empresaId: true,
      pessoaId: true,
      horaEntrada: true,
      correcaoSaidaEm: true,
      pessoa: { select: { nome: true, ctpsNumero: true, ctpsSerieUf: true } },
    },
  });
  if (!registro || registro.empresaId !== sessao.empresaEfetivoId) notFound();
  if (!registro.correcaoSaidaEm) {
    return new NextResponse(
      "Esse registro não foi corrigido manualmente — não há o que documentar como advertência.",
      { status: 400 }
    );
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId: registro.pessoaId, empresaId: registro.empresaId } },
    select: { cargo: true },
  });

  const faltando: string[] = [];
  if (!registro.pessoa.ctpsNumero) faltando.push("número da CTPS");
  if (!registro.pessoa.ctpsSerieUf) faltando.push("série/UF da CTPS");
  if (!vinculo?.cargo) faltando.push("cargo");
  if (faltando.length > 0) {
    return new NextResponse(
      `Preencha ${faltando.join(", ")} no cadastro da pessoa antes de gerar a advertência.`,
      { status: 400 }
    );
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: registro.empresaId },
    select: { nome: true, endereco: true },
  });

  const pdfBytes = await gerarPdfAdvertenciaPonto({
    empresaNome: empresa.nome,
    empresaLocal: empresa.endereco?.trim() || "____________________",
    pessoaNome: registro.pessoa.nome,
    cargo: vinculo!.cargo!,
    ctpsNumero: registro.pessoa.ctpsNumero!,
    ctpsSerieUf: registro.pessoa.ctpsSerieUf!,
    dataOcorrencia: registro.horaEntrada,
    dataEmissao: new Date(),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="advertencia-${sanitizarNomeArquivo(registro.pessoa.nome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
