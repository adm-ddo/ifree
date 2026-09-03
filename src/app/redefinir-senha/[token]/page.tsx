import Link from "next/link";
import { buscarTokenValido } from "@/lib/tokenAutenticacao";
import RedefinirSenhaForm from "./RedefinirSenhaForm";

const MOTIVO_LABEL: Record<string, string> = {
  expirado: "Esse link de recuperação expirou.",
  usado: "Esse link já foi usado.",
  invalido: "Esse link não é válido.",
};

export default async function RedefinirSenhaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultado = await buscarTokenValido(token, "RECUPERACAO_SENHA");

  if (!resultado.valido) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
          <h1 className="text-xl font-semibold text-navy-900">Link inválido</h1>
          <p className="text-sm text-stone-600">
            {MOTIVO_LABEL[resultado.motivo]} Peça um novo em &quot;Esqueci
            minha senha&quot;.
          </p>
          <Link href="/recuperar-senha" className="text-brand-700 underline text-sm">
            Pedir novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <RedefinirSenhaForm token={token} />
    </div>
  );
}
