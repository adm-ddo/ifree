import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import ChatWindow from "@/components/ChatWindow";
import { buscarMensagensEmpresa, enviarMensagemEmpresa } from "./actions";

export default async function ConversaEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenant();
  const { id } = await params;
  const conversaId = Number(id);
  if (!Number.isInteger(conversaId)) notFound();

  const conversa = await prisma.conversa.findUnique({
    where: { id: conversaId },
    select: { empresaId: true, pessoa: { select: { nome: true } } },
  });
  if (!conversa || conversa.empresaId !== sessao.empresaEfetivoId) notFound();

  const { mensagens: mensagensIniciais, outraLeituraEm } = await buscarMensagensEmpresa(conversaId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <Link href="/conversas" className="text-brand-700 hover:underline">
          ← Mensagens
        </Link>
        <Link href="/vagas" className="text-brand-700 hover:underline">
          📋 Todas as vagas
        </Link>
      </div>
      <ChatWindow
        meuAutor="EMPRESA"
        outroNome={conversa.pessoa.nome}
        mensagensIniciais={mensagensIniciais}
        outraLeituraInicialEm={outraLeituraEm}
        aoBuscar={buscarMensagensEmpresa.bind(null, conversaId)}
        aoEnviar={enviarMensagemEmpresa.bind(null, conversaId)}
      />
    </div>
  );
}
