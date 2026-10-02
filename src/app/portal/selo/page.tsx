import Link from "next/link";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { prisma } from "@/lib/prisma";
import { VALOR_SELO_PRATA, VALOR_SELO_OURO, BENEFICIOS_SELO, formatarValorSelo } from "@/lib/selo-freelancer";
import AutoRefresh from "@/components/AutoRefresh";
import GerarPixSeloForm from "./GerarPixSeloForm";
import type { SeloFreelancer } from "@/generated/prisma/enums";

const SELO_LABEL: Record<SeloFreelancer, string> = {
  BRONZE: "Bronze",
  PRATA: "Prata",
  OURO: "Ouro",
};

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

async function ultimaCobrancaDoSelo(pessoaId: number, selo: "PRATA" | "OURO") {
  return prisma.cobrancaSelo.findFirst({
    where: { pessoaId, selo },
    orderBy: { criadoEm: "desc" },
    select: { idTransacaoExterna: true, status: true, qrCode: true, qrCodeImagemUrl: true, expiraEm: true },
  });
}

/** Tela de assinatura do selo — pedido do Thiago em 2026-10-02: deixar
 * mais amigável, explicar melhor o diferencial do alerta por e-mail (o
 * motivo de existir é liberar a pessoa de ficar abrindo o app toda hora
 * só pra conferir se saiu vaga nova) e apresentar os 3 planos lado a
 * lado, de um jeito mais bonito/persuasivo que a tabela crua de antes.
 * Mantém a lógica de cobrança/Pix de GerarPixSeloForm.tsx intacta — só
 * a apresentação muda. */
export default async function SeloPortalPage() {
  const sessao = await requirePessoaComTermosAceitos();

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: { selo: true, seloVenceEm: true },
  });

  const [ultimaPrata, ultimaOuro] = await Promise.all([
    ultimaCobrancaDoSelo(sessao.pessoaId, "PRATA"),
    ultimaCobrancaDoSelo(sessao.pessoaId, "OURO"),
  ]);

  const cobrancaPendente = (c: typeof ultimaPrata) =>
    c?.status === "PENDENTE" && c.qrCode && c.idTransacaoExterna && c.expiraEm > new Date() ? c : null;

  const pendentePrata = cobrancaPendente(ultimaPrata);
  const pendenteOuro = cobrancaPendente(ultimaOuro);

  return (
    <div className="flex flex-col gap-6">
      {(pendentePrata || pendenteOuro) && <AutoRefresh intervaloMs={5000} />}

      <Link href="/portal" className="text-sm text-brand-700 hover:underline self-start">
        🏠 Meu perfil
      </Link>

      {/* Hero — ataca direto o "diferencial de verdade" pedido pelo
          Thiago: parar de precisar abrir o app toda hora. */}
      <div className="rounded-3xl bg-navy-900 text-white p-6 sm:p-8 flex flex-col gap-2">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-300">
          📬 O diferencial
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold leading-snug">
          Chega de ficar atualizando o app toda hora pra ver se saiu vaga.
        </h1>
        <p className="text-sm sm:text-[15px] text-white/70 max-w-xl">
          Com o selo Prata ou Ouro, a vaga nova chega direto no seu e-mail no instante em que a empresa
          publica — você fica sabendo antes de quem só olha pelo app, e consegue se candidatar primeiro.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-stone-600">
          Seu selo atual: <strong className="text-navy-900">{SELO_LABEL[pessoa.selo]}</strong>
          {pessoa.selo !== "BRONZE" && pessoa.seloVenceEm && (
            <> · próximo vencimento {formatarData(pessoa.seloVenceEm)}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <PlanoCard
          nome="Bronze"
          emoji="🥉"
          precoLabel="Grátis"
          corClasse="border-stone-200"
          selo={pessoa.selo}
          tier="BRONZE"
          frase="O básico pra começar: veja as vagas e se candidate quando quiser."
        />

        <PlanoCard
          nome="Prata"
          emoji="🥈"
          precoLabel={`${formatarValorSelo(VALOR_SELO_PRATA)}/mês`}
          corClasse="border-slate-300 ring-1 ring-slate-200"
          selo={pessoa.selo}
          tier="PRATA"
          frase="Pare de ficar checando o app. A vaga avisa você."
          form={
            pessoa.selo !== "PRATA" && pessoa.selo !== "OURO" ? (
              <GerarPixSeloForm
                selo="PRATA"
                label="Prata"
                valorLabel={`${formatarValorSelo(VALOR_SELO_PRATA)}/mês`}
                cobrancaInicial={
                  pendentePrata
                    ? {
                        idTransacaoExterna: pendentePrata.idTransacaoExterna!,
                        qrCode: pendentePrata.qrCode!,
                        qrCodeImagemUrl: pendentePrata.qrCodeImagemUrl,
                        expiraEm: pendentePrata.expiraEm.toISOString(),
                      }
                    : null
                }
                ultimaCobranca={
                  ultimaPrata
                    ? { idTransacaoExterna: ultimaPrata.idTransacaoExterna, status: ultimaPrata.status }
                    : null
                }
              />
            ) : null
          }
        />

        <PlanoCard
          nome="Ouro"
          emoji="🏅"
          precoLabel={`${formatarValorSelo(VALOR_SELO_OURO)}/mês`}
          corClasse="border-amber-300 ring-1 ring-amber-200"
          destaque
          selo={pessoa.selo}
          tier="OURO"
          frase="Tudo do Prata, e você aparece em destaque pra empresa decidir."
          form={
            pessoa.selo !== "OURO" ? (
              <GerarPixSeloForm
                selo="OURO"
                label="Ouro"
                valorLabel={`${formatarValorSelo(VALOR_SELO_OURO)}/mês`}
                cobrancaInicial={
                  pendenteOuro
                    ? {
                        idTransacaoExterna: pendenteOuro.idTransacaoExterna!,
                        qrCode: pendenteOuro.qrCode!,
                        qrCodeImagemUrl: pendenteOuro.qrCodeImagemUrl,
                        expiraEm: pendenteOuro.expiraEm.toISOString(),
                      }
                    : null
                }
                ultimaCobranca={
                  ultimaOuro ? { idTransacaoExterna: ultimaOuro.idTransacaoExterna, status: ultimaOuro.status } : null
                }
              />
            ) : (
              <p className="text-sm text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                🏅 Você já está no selo mais alto.
              </p>
            )
          }
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200">
          <h2 className="font-semibold text-navy-900 text-sm">Compare tudo</h2>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-4 py-2 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wide border-b border-stone-100">
          <span />
          <span className="text-center w-8">🥉</span>
          <span className="text-center w-8">🥈</span>
          <span className="text-center w-8">🏅</span>
        </div>
        <div className="divide-y divide-stone-100">
          {BENEFICIOS_SELO.map((b) => (
            <div key={b.label} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 items-center">
              <div>
                <p className={`text-sm ${b.destaque ? "font-semibold text-navy-900" : "text-stone-700"}`}>
                  {b.label}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 hidden sm:block">{b.descricao}</p>
              </div>
              <CelulaBeneficio ativo={b.bronze} />
              <CelulaBeneficio ativo={b.prata} />
              <CelulaBeneficio ativo={b.ouro} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CelulaBeneficio({ ativo }: { ativo: boolean }) {
  return (
    <span className={`w-8 text-center ${ativo ? "text-brand-600" : "text-stone-300"}`}>{ativo ? "✓" : "—"}</span>
  );
}

function PlanoCard({
  nome,
  emoji,
  precoLabel,
  corClasse,
  selo,
  tier,
  frase,
  destaque,
  form,
}: {
  nome: string;
  emoji: string;
  precoLabel: string;
  corClasse: string;
  selo: SeloFreelancer;
  tier: SeloFreelancer;
  frase: string;
  destaque?: boolean;
  form?: React.ReactNode;
}) {
  const ehAtual = selo === tier;
  const beneficiosDoTier = BENEFICIOS_SELO.filter((b) =>
    tier === "BRONZE" ? b.bronze : tier === "PRATA" ? b.prata : b.ouro
  );

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 ${corClasse} ${
        destaque ? "sm:scale-[1.03] shadow-lg" : "shadow-sm"
      }`}
    >
      {destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 shadow">
          Recomendado
        </span>
      )}
      {ehAtual && (
        <span className="absolute -top-3 right-4 rounded-full bg-navy-900 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 shadow">
          Seu plano
        </span>
      )}

      <div className="text-3xl">{emoji}</div>
      <div>
        <h3 className="font-extrabold text-navy-900 text-lg">{nome}</h3>
        <p className="text-xl font-extrabold text-navy-900 mt-0.5">{precoLabel}</p>
      </div>
      <p className="text-xs text-stone-500 min-h-[2.2em]">{frase}</p>

      <ul className="flex flex-col gap-1.5 text-sm text-stone-700">
        {beneficiosDoTier.map((b) => (
          <li key={b.label} className="flex items-start gap-1.5">
            <span className="text-brand-600 shrink-0">✓</span>
            <span>{b.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-2">
        {ehAtual ? (
          <p className="text-sm text-center text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
            Já é o seu plano
          </p>
        ) : tier === "BRONZE" ? (
          <p className="text-xs text-center text-stone-400">Sempre disponível, sem assinar nada.</p>
        ) : (
          form
        )}
      </div>
    </div>
  );
}
