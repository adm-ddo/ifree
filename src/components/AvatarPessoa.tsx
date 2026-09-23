import type { Sexo } from "@/generated/prisma/enums";

const TAMANHO_PX: Record<"sm" | "md" | "lg", number> = { sm: 32, md: 40, lg: 80 };
const TAMANHO_ICONE: Record<"sm" | "md" | "lg", string> = { sm: "60%", md: "60%", lg: "55%" };

const CORES_POR_SEXO: Record<"MASCULINO" | "FEMININO" | "NEUTRO", { fundo: string; icone: string }> = {
  MASCULINO: { fundo: "bg-blue-100", icone: "text-blue-400" },
  FEMININO: { fundo: "bg-pink-100", icone: "text-pink-400" },
  NEUTRO: { fundo: "bg-stone-200", icone: "text-stone-400" },
};

function corPorSexo(sexo: Sexo | null): { fundo: string; icone: string } {
  if (sexo === "MASCULINO") return CORES_POR_SEXO.MASCULINO;
  if (sexo === "FEMININO") return CORES_POR_SEXO.FEMININO;
  return CORES_POR_SEXO.NEUTRO;
}

/** Avatar circular pra Pessoa — mostra a foto de perfil do iFREE Conecta
 * (via /pessoas/[id]/foto, que já checa vínculo com a empresa da sessão;
 * nunca a foto do totem, que é só do turno) quando ela existe. Sem foto,
 * cai num bonequinho colorido pelo gênero informado no cadastro do
 * Conecta (azul/rosa/cinza) — `sexo` null cobre tanto "prefiro não
 * dizer" quanto quem nunca passou pelo cadastro do Conecta (extra só de
 * totem), ambos caem no mesmo cinza neutro. */
export default function AvatarPessoa({
  pessoaId,
  nome,
  temFoto,
  sexo = null,
  tamanho = "md",
  className,
}: {
  pessoaId: number;
  nome: string;
  temFoto: boolean;
  sexo?: Sexo | null;
  tamanho?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = TAMANHO_PX[tamanho];
  const cor = corPorSexo(sexo);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${temFoto ? "bg-stone-100" : cor.fundo} ${className ?? ""}`}
      style={{ width: px, height: px }}
    >
      {temFoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar servido por rota própria (/pessoas/[id]/foto), não é asset estático
        <img src={`/pessoas/${pessoaId}/foto`} alt={nome} className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cor.icone} style={{ width: TAMANHO_ICONE[tamanho], height: TAMANHO_ICONE[tamanho] }}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
        </svg>
      )}
    </span>
  );
}
