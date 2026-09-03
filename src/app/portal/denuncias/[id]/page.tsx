import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { LABEL_CATEGORIA_DENUNCIA } from "@/lib/etica";
import { formatarDataHora } from "@/lib/data";
import ChatWindow from "@/components/ChatWindow";
import EtapaDenunciaBadges from "@/components/EtapaDenunciaBadges";
import { buscarMensagensDenunciaPessoa, enviarMensagemDenunciaPessoa } from "./actions";

export default async function DenunciaPortalDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requirePessoaComTermosAceitos();
  const { id } = await params;
  const denunciaId = Number(id);
  if (!Number.isInteger(denunciaId)) notFound();

  const denuncia = await prisma.denuncia.findUnique({
    where: { id: denunciaId },
    select: {
      pessoaId: true,
      protocolo: true,
      categoria: true,
      descricao: true,
      status: true,
      criadoEm: true,
      empresa: { select: { nome: true } },
    },
  });
  if (!denuncia || denuncia.pessoaId !== sessao.pessoaId) notFound();

  const { mensagens: mensagensIniciais } = await buscarMensagensDenunciaPessoa(denunciaId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-sm">
        <Link href="/portal/denuncias" className="text-brand-700 hover:underline">
          ← Canal de Ética
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-navy-900">
          Protocolo {denuncia.protocolo.slice(0, 4)}-{denuncia.protocolo.slice(4)}
        </h1>
        <p className="text-sm text-stone-600">
          {denuncia.empresa.nome} · {LABEL_CATEGORIA_DENUNCIA[denuncia.categoria]} ·{" "}
          {formatarDataHora(denuncia.criadoEm)}
        </p>
        <EtapaDenunciaBadges statusAtual={denuncia.status} />
        <div className="border-t border-stone-100 pt-2 mt-1">
          <p className="text-sm text-stone-700 whitespace-pre-line">{denuncia.descricao}</p>
        </div>
      </div>

      <ChatWindow
        meuAutor="PESSOA"
        outroNome={denuncia.empresa.nome}
        mensagensIniciais={mensagensIniciais}
        outraLeituraInicialEm={null}
        aoBuscar={buscarMensagensDenunciaPessoa.bind(null, denunciaId)}
        aoEnviar={enviarMensagemDenunciaPessoa.bind(null, denunciaId)}
      />
    </div>
  );
}
