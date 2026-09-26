"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CHAVES_TODOS_MODULOS } from "@/lib/modulosEquipe";
import { enviarEmailUpgradeCompleto } from "@/lib/email";

export type UpgradeState = { erro?: string; sucesso?: boolean } | undefined;

/** Migra a empresa do plano Conecta pro Completo — chamada pelo botão em
 * /v2/upgrade (ver UpsellModal em src/components/v2/NavShell.tsx e o
 * banner de /v2/dashboard, os dois pontos de entrada). `valorMensalidade:
 * null` faz valorMensalidadeEfetivo (src/lib/assinatura.ts) recalcular
 * pelo novo plano — preço promocional (R$129,90) contado a partir de
 * planoCompletoDesde, por 365 dias, depois cai pro padrão (R$199,90).
 * `modulosPermitidos`/responsavelEtica/Ged/Pgr liberam TODO vínculo já
 * existente dessa empresa (dono + qualquer convidado via /equipe), não só
 * quem clicou — mesmo espírito do backfill que corrigiu o cadastro. Sem
 * mexer em assinaturaVenceEm/statusAssinatura de propósito (ver "fora de
 * escopo" no plano): sem trial extra, sem rateio de mensalidade no meio
 * do ciclo. */
export async function fazerUpgradeParaCompleto(): Promise<UpgradeState> {
  const sessao = await requireTenant();

  const jaEhCompleto = await prisma.empresa.findUnique({
    where: { id: sessao.empresaEfetivoId },
    select: { planoEmpresa: true },
  });
  if (jaEhCompleto?.planoEmpresa === "COMPLETO") {
    return { erro: "Essa empresa já está no plano Completo." };
  }

  const empresa = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.empresa.update({
      where: { id: sessao.empresaEfetivoId },
      data: { planoEmpresa: "COMPLETO", planoCompletoDesde: new Date(), valorMensalidade: null },
      select: { nome: true, cnpj: true },
    });
    await tx.usuarioEmpresa.updateMany({
      where: { empresaId: sessao.empresaEfetivoId },
      data: {
        modulosPermitidos: CHAVES_TODOS_MODULOS,
        responsavelEtica: true,
        responsavelGed: true,
        responsavelPgr: true,
      },
    });
    return atualizada;
  });

  // Nunca pode travar o upgrade (que já aconteceu com sucesso acima) por
  // causa de um e-mail que falhou — mesmo padrão de notificarPessoasSobreVagaNova.
  if (process.env.MASTER_EMAIL) {
    try {
      await enviarEmailUpgradeCompleto(process.env.MASTER_EMAIL, {
        nomeEmpresa: empresa.nome,
        cnpj: empresa.cnpj,
      });
    } catch (err) {
      console.error("Falha ao notificar master sobre upgrade:", err);
    }
  }

  revalidatePath("/", "layout");
  return { sucesso: true };
}
