import Link from "next/link";

export default function AlertaCandidaturasConecta({
  pendentes,
  matches,
}: {
  pendentes: number;
  matches: number;
}) {
  if (pendentes === 0) return null;

  return (
    <div className="bg-brand-50 border-b border-brand-200 text-brand-900 text-sm px-4 py-2 text-center">
      🎯 {pendentes} candidatura{pendentes === 1 ? "" : "s"} aguardando resposta nas suas vagas
      {matches > 0 && ` (${matches} com match)`} ·{" "}
      <Link href="/vagas" className="underline font-medium">
        ver vagas
      </Link>
    </div>
  );
}
