import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorTokenDenuncia, getDenunciaIdDaSessaoAnonima, LABEL_CATEGORIA_DENUNCIA } from "@/lib/etica";
import { formatarDataHora } from "@/lib/data";
import ChatWindow from "@/components/ChatWindow";
import EtapaDenunciaBadges from "@/components/EtapaDenunciaBadges";
import EntrarForm from "./EntrarForm";
import { buscarMensagensDenunciaAnonima, enviarMensagemDenunciaAnonima } from "./actions";

export default async function AcompanharDenunciaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const empresa = await resolverEmpresaPorTokenDenuncia(token);
  if (!empresa) notFound();

  const denunciaId = await getDenunciaIdDaSessaoAnonima();
  const denuncia = denunciaId
    ? await prisma.denuncia.findUnique({
        where: { id: denunciaId },
        select: {
          id: true,
          empresaId: true,
          protocolo: true,
          categoria: true,
          descricao: true,
          status: true,
          criadoEm: true,
        },
      })
    : null;

  if (!denuncia || denuncia.empresaId !== empresa.id) {
    return (
      <div className="mx-auto max-w-lg flex flex-col gap-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Acompanhar denúncia</h1>
          <p className="text-stone-600 mt-1 text-sm">{empresa.nome}</p>
        </div>
        <EntrarForm token={token} />
      </div>
    );
  }

  const { mensagens: mensagensIniciais } = await buscarMensagensDenunciaAnonima();

  return (
    <div className="mx-auto max-w-lg flex flex-col gap-4 py-8">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-navy-900">
          Protocolo {denuncia.protocolo.slice(0, 4)}-{denuncia.protocolo.slice(4)}
        </h1>
        <p className="text-sm text-stone-600">
          {LABEL_CATEGORIA_DENUNCIA[denuncia.categoria]} · Recebida em {formatarDataHora(denuncia.criadoEm)}
        </p>
        <EtapaDenunciaBadges statusAtual={denuncia.status} />
      </div>

      <ChatWindow
        meuAutor="PESSOA"
        outroNome={empresa.nome}
        mensagensIniciais={mensagensIniciais}
        outraLeituraInicialEm={null}
        aoBuscar={buscarMensagensDenunciaAnonima}
        aoEnviar={enviarMensagemDenunciaAnonima}
      />
    </div>
  );
}
