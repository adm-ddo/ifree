import { STATUS_DENUNCIA_ORDEM, LABEL_STATUS_DENUNCIA } from "@/lib/etica-constantes";
import type { StatusDenuncia } from "@/generated/prisma/enums";

/** Visão só-leitura das 7 etapas, pro lado de quem denunciou (público
 * anônimo e Portal identificado) — quem decide/avança é sempre a empresa
 * (ver StatusStepper em src/app/etica/[id]/StatusStepper.tsx). */
export default function EtapaDenunciaBadges({ statusAtual }: { statusAtual: StatusDenuncia }) {
  const indiceAtual = STATUS_DENUNCIA_ORDEM.indexOf(statusAtual);

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_DENUNCIA_ORDEM.map((s, i) => {
        const atual = s === statusAtual;
        const concluida = i < indiceAtual;
        return (
          <span
            key={s}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              atual
                ? "bg-brand-600 border-brand-600 text-white"
                : concluida
                  ? "bg-stone-100 border-stone-200 text-stone-500"
                  : "border-stone-300 text-stone-400"
            }`}
          >
            {i + 1}. {LABEL_STATUS_DENUNCIA[s]}
          </span>
        );
      })}
    </div>
  );
}
