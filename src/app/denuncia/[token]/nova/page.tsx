import { notFound } from "next/navigation";
import { resolverEmpresaPorTokenDenuncia } from "@/lib/etica";
import DenunciaForm from "./DenunciaForm";

export default async function NovaDenunciaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const empresa = await resolverEmpresaPorTokenDenuncia(token);
  if (!empresa) notFound();

  return (
    <div className="mx-auto max-w-lg flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Fazer uma denúncia</h1>
        <p className="text-stone-600 mt-1 text-sm">{empresa.nome} · anônima</p>
      </div>
      <DenunciaForm token={token} />
    </div>
  );
}
