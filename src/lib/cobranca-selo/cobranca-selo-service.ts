import type { SeloFreelancer } from "@/generated/prisma/enums";

export type DadosCobrancaSelo = {
  pessoaId: number;
  selo: Extract<SeloFreelancer, "PRATA" | "OURO">;
  valor: number;
  referenciaMes: string;
};

export type ResultadoCobrancaSelo =
  | {
      sucesso: true;
      idTransacaoExterna: string;
      qrCode: string;
      qrCodeImagemUrl: string | null;
      expiraEm: Date;
    }
  | { sucesso: false; erro: string };

/** Ponto único de integração com quem gera o PIX de verdade pra cobrar o
 * selo do freelancer — mesmo espírito de src/lib/cobranca/cobranca-service.ts
 * (mensalidade da empresa), duplicado em vez de generalizado porque Empresa/
 * CobrancaMensalidade já estão fortemente acoplados (tablet, cnpj) e mexer
 * neles arriscaria a cobrança que já roda em produção. */
export interface CobrancaSeloService {
  criarCobrancaPix(dados: DadosCobrancaSelo): Promise<ResultadoCobrancaSelo>;
}
