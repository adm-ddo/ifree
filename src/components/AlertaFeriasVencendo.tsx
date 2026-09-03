import Link from "next/link";

export default function AlertaFeriasVencendo({
  vencidas,
  vencendoEmBreve,
}: {
  vencidas: number;
  vencendoEmBreve: number;
}) {
  if (vencidas === 0 && vencendoEmBreve === 0) return null;

  const partes: string[] = [];
  if (vencidas > 0) {
    partes.push(`${vencidas} ${vencidas === 1 ? "funcionário" : "funcionários"} com férias vencidas`);
  }
  if (vencendoEmBreve > 0) {
    partes.push(`${vencendoEmBreve} vencendo em até 60 dias`);
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
      🏖️ {partes.join(" · ")} ·{" "}
      <Link href="/funcionarios" className="underline font-medium">
        ver funcionários
      </Link>
    </div>
  );
}
