import { prisma } from "@/lib/prisma";
import CadastroPortalForm from "./CadastroPortalForm";

export default async function CadastroPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const indicadorId = ref ? Number(ref) : null;

  // Só usa o link se o id realmente existir — link quebrado/adulterado
  // (id inexistente) cai no fluxo normal, sem confirmação de indicação.
  const indicador =
    indicadorId && Number.isInteger(indicadorId)
      ? await prisma.pessoa.findUnique({ where: { id: indicadorId }, select: { id: true, nome: true } })
      : null;

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <CadastroPortalForm indicador={indicador} />
    </div>
  );
}
