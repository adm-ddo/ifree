import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import DenunciaPortalForm from "./DenunciaPortalForm";

export default async function NovaDenunciaPortalPage() {
  const sessao = await requirePessoaComTermosAceitos();

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { pessoaId: sessao.pessoaId, ativo: true },
    select: { empresa: { select: { id: true, nome: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 text-sm">
        <Link href="/portal/denuncias" className="text-brand-700 hover:underline">
          ← Canal de Ética
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Fazer uma denúncia</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Canal confidencial pra relatar assédio, discriminação, riscos à
          sua saúde/segurança no trabalho ou qualquer outra
          irregularidade.
        </p>
      </div>

      {vinculos.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Você precisa ter um vínculo ativo com alguma empresa pra
          denunciar.
        </p>
      ) : (
        <DenunciaPortalForm empresas={vinculos.map((v) => v.empresa)} />
      )}
    </div>
  );
}
