import Link from "next/link";

export const metadata = { title: "Termos de Uso — iFREE" };

/** Índice dos Termos de Uso — antes desta separação, este era o documento
 * único (empresa + freelancer combinados); virou um índice curto porque o
 * Thiago pediu pra separar em dois textos revisados de acordo com o que
 * importa pra cada público (ver [[termos/empresa/page.tsx]] e
 * [[termos/freelancer/page.tsx]]). Mantido nesta mesma rota (/termos) pra
 * não quebrar o link já existente no rodapé da landing page. Rota pública,
 * sem autenticação. */
export default function TermosIndexPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-12 flex flex-col gap-8">
        <div>
          <Link href="/" className="text-sm text-brand-700 hover:underline">
            ← iFREE
          </Link>
          <h1 className="text-2xl font-semibold text-navy-900 mt-2">Termos de Uso e Política de Privacidade</h1>
          <p className="text-sm text-stone-500 mt-1">
            O iFREE tem um termo específico pra cada público. Escolha o que se aplica a você:
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/termos/empresa"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-brand-400 transition-colors"
          >
            <h2 className="font-semibold text-navy-900">Sou empresa</h2>
            <p className="text-sm text-stone-600 mt-1">
              Termos de Uso e Política de Privacidade para quem contrata freelancers pelo iFREE.
            </p>
          </Link>

          <Link
            href="/termos/freelancer"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-brand-400 transition-colors"
          >
            <h2 className="font-semibold text-navy-900">Sou freelancer</h2>
            <p className="text-sm text-stone-600 mt-1">
              Termos de Uso e Política de Privacidade para quem presta serviço como freelancer (&ldquo;extra&rdquo;)
              pelo iFREE.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
