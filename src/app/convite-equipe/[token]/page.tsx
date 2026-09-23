import Link from "next/link";
import { buscarConviteValido } from "@/lib/conviteEquipe";
import { MODULOS_EQUIPE } from "@/lib/modulosEquipe";
import CadastrarViaConviteForm from "./CadastrarViaConviteForm";

const MOTIVO_LABEL: Record<string, string> = {
  expirado: "Esse convite expirou.",
  usado: "Esse convite já foi usado.",
  revogado: "Esse convite foi cancelado por quem te convidou.",
  invalido: "Esse link não é válido.",
};

export default async function ConviteEquipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultado = await buscarConviteValido(token);

  if (!resultado.valido) {
    return (
      <div className="flex flex-1 items-center justify-center py-8 px-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
          <h1 className="text-xl font-semibold text-navy-900">Convite inválido</h1>
          <p className="text-sm text-stone-600">
            {MOTIVO_LABEL[resultado.motivo]} Peça pra quem te convidou gerar um link novo.
          </p>
          <Link href="/login" className="text-brand-700 underline text-sm">
            Já tenho login — entrar
          </Link>
        </div>
      </div>
    );
  }

  const labelsModulos = MODULOS_EQUIPE.filter((m) => resultado.modulosPermitidos.includes(m.chave)).map(
    (m) => m.label
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 px-4 gap-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-navy-900">
          Convite pra acessar {resultado.empresaNome}
        </h1>
        <p className="text-sm text-stone-600">
          Você vai ter acesso a:
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {labelsModulos.map((label) => (
            <li
              key={label}
              className="text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2.5 py-1"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
      <CadastrarViaConviteForm token={token} />
    </div>
  );
}
