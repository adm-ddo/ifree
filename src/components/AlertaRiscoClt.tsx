import Link from "next/link";

export default function AlertaRiscoClt({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
      ⚠️ {quantidade} extra{quantidade > 1 ? "s" : ""} trabalhando 3 ou mais vezes essa semana — risco de
      caracterizar vínculo empregatício ·{" "}
      <Link href="/freelancers" className="underline font-medium">
        ver freelancers
      </Link>
    </div>
  );
}
