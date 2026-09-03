import { notFound } from "next/navigation";
import Link from "next/link";
import { resolverEmpresaPorTokenDenuncia, qrDenunciaExpirado } from "@/lib/etica";

export default async function CanalDenunciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ exp?: string; sig?: string }>;
}) {
  const { token } = await params;
  const { exp, sig } = await searchParams;
  const empresa = await resolverEmpresaPorTokenDenuncia(token);
  if (!empresa) notFound();

  if (qrDenunciaExpirado(token, exp ?? null, sig ?? null)) {
    return (
      <div className="mx-auto max-w-lg flex flex-col gap-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Canal de Ética</h1>
          <p className="text-stone-600 mt-1 text-sm">{empresa.nome}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Esse QR code expirou. Peça pra gerar um novo na tela do totem, ou
          use{" "}
          <Link href={`/denuncia/${token}`} className="underline font-medium">
            este link
          </Link>{" "}
          diretamente.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Canal de Ética</h1>
        <p className="text-stone-600 mt-1 text-sm">{empresa.nome}</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col gap-3 text-sm text-stone-700">
        <p>
          Este é um canal confidencial pra relatar assédio, discriminação,
          riscos à sua saúde/segurança no trabalho ou qualquer outra
          irregularidade. Você pode se identificar ou permanecer
          totalmente anônimo(a).
        </p>
        <p>
          Ao registrar, você recebe um <strong>protocolo</strong> e uma{" "}
          <strong>senha</strong> únicos, mostrados só uma vez — guarde os
          dois pra acompanhar sua denúncia depois.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`/denuncia/${token}/nova`}
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-3 text-center transition-colors"
        >
          📢 Fazer uma denúncia
        </Link>
        <Link
          href={`/denuncia/${token}/acompanhar`}
          className="rounded-lg border border-stone-300 text-sm font-medium px-4 py-3 text-center hover:bg-stone-50 transition-colors"
        >
          🔍 Já denunciei, quero acompanhar
        </Link>
      </div>
    </div>
  );
}
