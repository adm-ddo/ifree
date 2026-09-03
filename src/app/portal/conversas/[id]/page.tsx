import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import ChatWindow from "@/components/ChatWindow";
import { buscarMensagensPessoa, enviarMensagemPessoa } from "./actions";

export default async function ConversaPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requirePessoaComTermosAceitos();
  const { id } = await params;
  const conversaId = Number(id);
  if (!Number.isInteger(conversaId)) notFound();

  const conversa = await prisma.conversa.findUnique({
    where: { id: conversaId },
    select: { pessoaId: true, empresa: { select: { nome: true } } },
  });
  if (!conversa || conversa.pessoaId !== sessao.pessoaId) notFound();

  const { mensagens: mensagensIniciais, outraLeituraEm } = await buscarMensagensPessoa(conversaId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <Link href="/portal/conversas" className="text-brand-700 hover:underline">
          ← Mensagens
        </Link>
        <Link href="/portal" className="text-brand-700 hover:underline">
          🏠 Meu perfil
        </Link>
        <Link href="/portal/vagas" className="text-brand-700 hover:underline">
          📋 Vagas
        </Link>
      </div>
      <ChatWindow
        meuAutor="PESSOA"
        outroNome={conversa.empresa.nome}
        mensagensIniciais={mensagensIniciais}
        outraLeituraInicialEm={outraLeituraEm}
        aoBuscar={buscarMensagensPessoa.bind(null, conversaId)}
        aoEnviar={enviarMensagemPessoa.bind(null, conversaId)}
      />
    </div>
  );
}
