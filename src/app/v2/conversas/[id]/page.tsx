import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import ChatWindow from "@/components/ChatWindow";
import { buscarMensagensEmpresa, enviarMensagemEmpresa } from "@/app/conversas/[id]/actions";

/** Espelho completo de src/app/conversas/[id]/page.tsx (v1, não tocado) —
 * reaproveita ChatWindow direto (genérico, sem chrome do v1) e as mesmas
 * actions. Só os links de volta mudam, pro /v2. */
export default async function V2ConversaEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireModulo("conversas");
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
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-4 flex-wrap text-xs font-bold">
        <Link href="/v2/conversas" className="text-brand-700">
          ← Mensagens
        </Link>
        <Link href="/v2/vagas" className="text-brand-700">
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
