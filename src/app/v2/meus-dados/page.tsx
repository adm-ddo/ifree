import { prisma } from "@/lib/prisma";
import { requireSessao } from "@/lib/auth";
import MeusDadosForm from "@/app/meus-dados/MeusDadosForm";

/** Espelho completo de src/app/meus-dados/page.tsx (v1, não tocado) —
 * mesma query, mesmo MeusDadosForm reaproveitado direto (sem link nenhum
 * pro v1 dentro dele). */
export default async function V2MeusDadosPage() {
  const sessao = await requireSessao();
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: sessao.usuarioId },
    select: { nomeCompleto: true, email: true },
  });

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Meus dados</h1>
        <p className="text-stone-500 text-sm mt-0.5">Seus dados pessoais de login.</p>
      </div>

      <MeusDadosForm nomeCompleto={usuario.nomeCompleto ?? ""} email={usuario.email} />
    </div>
  );
}
