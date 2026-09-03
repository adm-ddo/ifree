import Link from "next/link";

export default function AlertaExperienciaVencendo({
  vencidos,
  vencendoEmBreve,
}: {
  vencidos: number;
  vencendoEmBreve: number;
}) {
  if (vencidos === 0 && vencendoEmBreve === 0) return null;

  const partes: string[] = [];
  if (vencidos > 0) {
    partes.push(`${vencidos} contrato(s) de experiência vencido(s) sem decisão`);
  }
  if (vencendoEmBreve > 0) {
    partes.push(`${vencendoEmBreve} vencendo em até 15 dias`);
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
      📋 {partes.join(" · ")} ·{" "}
      <Link href="/funcionarios" className="underline font-medium">
        ver funcionários
      </Link>
    </div>
  );
}
