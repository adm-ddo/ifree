import Link from "next/link";
import { requirePessoa } from "@/lib/auth-pessoa";
import { TERMOS_PORTAL_PARAGRAFOS } from "@/lib/termos-portal";
import { aceitarTermosPessoa } from "./actions";

export default async function TermosPessoaPage() {
  await requirePessoa();

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <form
        action={aceitarTermosPessoa}
        className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-lg"
      >
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Termos de Uso do Portal</h1>
          <p className="text-sm text-stone-500 mt-1">
            Antes de continuar, dê uma lida:
          </p>
        </div>

        <div className="flex flex-col gap-3 max-h-72 overflow-y-auto border border-stone-100 rounded-lg bg-stone-50 p-4">
          {TERMOS_PORTAL_PARAGRAFOS.map((paragrafo, i) => (
            <p key={i} className="text-sm text-stone-600 leading-relaxed">
              {paragrafo}
            </p>
          ))}
        </div>

        <Link href="/termos/freelancer" target="_blank" className="text-xs text-brand-700 hover:underline -mt-2">
          Ler a versão completa dos Termos de Uso →
        </Link>

        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" name="aceito" required className="mt-1" />
          Li e concordo com os Termos de Uso do Portal.
        </label>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 transition-colors"
        >
          Continuar
        </button>
      </form>
    </div>
  );
}
