import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { prisma } from "@/lib/prisma";
import { baixarComoDataUrl } from "@/lib/blob";
import { calcularCompletude } from "@/lib/perfil-completude";
import { gerarPdfCurriculo, type ExperienciaCurriculo } from "@/lib/curriculo-pdf";
import { formatarEnderecoCompleto } from "@/lib/endereco";
import { sanitizarNomeArquivo } from "@/lib/texto";

export async function GET() {
  const sessao = await requirePessoaComTermosAceitos();

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: {
      nome: true,
      telefone: true,
      email: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cep: true,
      cidade: true,
      fotoPerfilUrl: true,
      biografia: true,
      habilidades: true,
      vagasDesejadas: true,
      chavePix: true,
      rg: true,
      dataNascimento: true,
      contatoEmergenciaNome: true,
      contatoEmergenciaTelefone: true,
      meiosTransporte: true,
    },
  });

  // Gate sempre re-checado no servidor — o botão desabilitado no client é
  // só UX, não segurança. Ninguém gera currículo de perfil incompleto
  // acessando a rota direto por URL.
  const completude = calcularCompletude(pessoa);
  if (!completude.liberaCurriculo) {
    redirect("/portal");
  }

  const [avaliacoesRecebidas, turnos, registrosPonto] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { autor: "EMPRESA", turno: { pessoaId: sessao.pessoaId } },
      select: { nota: true, tags: true },
    }),
    prisma.turno.findMany({
      where: { pessoaId: sessao.pessoaId },
      select: {
        horaEntrada: true,
        empresa: { select: { nome: true } },
        funcao: { select: { nome: true } },
      },
    }),
    prisma.registroPonto.findMany({
      where: { pessoaId: sessao.pessoaId },
      select: { horaEntrada: true, empresa: { select: { nome: true } } },
    }),
  ]);

  const reputacaoTotal = avaliacoesRecebidas.length;
  const reputacaoMedia =
    reputacaoTotal > 0
      ? avaliacoesRecebidas.reduce((soma, a) => soma + a.nota, 0) / reputacaoTotal
      : null;
  const contagemTags = new Map<string, number>();
  for (const a of avaliacoesRecebidas) {
    for (const tag of a.tags) contagemTags.set(tag, (contagemTags.get(tag) ?? 0) + 1);
  }
  const reputacaoTagsFrequentes = [...contagemTags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Agrupa turnos por empresa+função (experiência de trabalho, não cada
  // batida de ponto individual) — lê melhor num currículo do que listar
  // cada turno separado.
  const experienciasPorChave = new Map<string, ExperienciaCurriculo>();
  for (const t of turnos) {
    const chave = `${t.empresa.nome}|${t.funcao.nome}`;
    const existente = experienciasPorChave.get(chave);
    if (existente) {
      existente.quantidade += 1;
      if (t.horaEntrada < existente.primeiraData) existente.primeiraData = t.horaEntrada;
      if (t.horaEntrada > existente.ultimaData) existente.ultimaData = t.horaEntrada;
    } else {
      experienciasPorChave.set(chave, {
        empresaNome: t.empresa.nome,
        funcaoNome: t.funcao.nome,
        quantidade: 1,
        primeiraData: t.horaEntrada,
        ultimaData: t.horaEntrada,
      });
    }
  }
  for (const r of registrosPonto) {
    const chave = `${r.empresa.nome}|CLT`;
    const existente = experienciasPorChave.get(chave);
    if (existente) {
      existente.quantidade += 1;
      if (r.horaEntrada < existente.primeiraData) existente.primeiraData = r.horaEntrada;
      if (r.horaEntrada > existente.ultimaData) existente.ultimaData = r.horaEntrada;
    } else {
      experienciasPorChave.set(chave, {
        empresaNome: r.empresa.nome,
        funcaoNome: null,
        quantidade: 1,
        primeiraData: r.horaEntrada,
        ultimaData: r.horaEntrada,
      });
    }
  }
  const experiencias = [...experienciasPorChave.values()].sort(
    (a, b) => b.ultimaData.getTime() - a.ultimaData.getTime()
  );

  const fotoDataUrl = pessoa.fotoPerfilUrl ? await baixarComoDataUrl(pessoa.fotoPerfilUrl) : null;

  const pdfBytes = await gerarPdfCurriculo({
    nome: pessoa.nome,
    telefone: pessoa.telefone,
    email: pessoa.email,
    endereco: formatarEnderecoCompleto(pessoa),
    meiosTransporte: pessoa.meiosTransporte,
    fotoDataUrl,
    biografia: pessoa.biografia,
    habilidades: pessoa.habilidades,
    vagasDesejadas: pessoa.vagasDesejadas,
    reputacaoMedia,
    reputacaoTotal,
    reputacaoTagsFrequentes,
    experiencias,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="curriculo-${sanitizarNomeArquivo(pessoa.nome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
