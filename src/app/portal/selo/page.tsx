import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { prisma } from "@/lib/prisma";
import { VALOR_SELO_PRATA, VALOR_SELO_OURO } from "@/lib/selo-freelancer";
import AutoRefresh from "@/components/AutoRefresh";
import GerarPixSeloForm from "./GerarPixSeloForm";
import type { SeloFreelancer } from "@/generated/prisma/enums";

const SELO_LABEL: Record<SeloFreelancer, string> = {
  BRONZE: "Bronze",
  PRATA: "Prata",
  OURO: "Ouro",
};

const SELO_CLASSE: Record<SeloFreelancer, string> = {
  BRONZE: "bg-stone-100 text-stone-600 border-stone-200",
  PRATA: "bg-slate-100 text-slate-700 border-slate-300",
  OURO: "bg-amber-50 text-amber-700 border-amber-300",
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
    <div className="flex flex-1 flex-col items-center py-8 px-4">
      {/* Atualiza sozinho enquanto há algum Pix pendente esperando
       * confirmação — mesmo motivo de AssinaturaPage/GerarPixForm. */}
      {(pendentePrata || pendenteOuro) && <AutoRefresh intervaloMs={5000} />}

      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy-900">Selo iFREE Conecta</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              Quanto mais alto o selo, mais recursos você libera na busca por vagas.
            </p>
          </div>
          <span className={`text-xs rounded-full border px-3 py-1.5 shrink-0 ${SELO_CLASSE[pessoa.selo]}`}>
            {SELO_LABEL[pessoa.selo]}
          </span>
        </div>

        {pessoa.selo !== "BRONZE" && pessoa.seloVenceEm && (
          <p className="text-sm text-stone-600">
            Próximo vencimento: {formatarData(pessoa.seloVenceEm)}.
          </p>
        )}

        <div className="rounded-lg border border-stone-200 overflow-hidden text-sm">
          <div className="grid grid-cols-4 bg-stone-50 text-stone-500 text-xs font-medium">
            <div className="px-3 py-2">Benefício</div>
            <div className="px-2 py-2 text-center">Bronze</div>
            <div className="px-2 py-2 text-center">Prata</div>
            <div className="px-2 py-2 text-center">Ouro</div>
          </div>
          {[
            { label: "Ver vagas manualmente", bronze: true, prata: true, ouro: true },
            { label: "Currículo em PDF", bronze: false, prata: true, ouro: true },
            { label: "Alerta por e-mail de vaga nova", bronze: false, prata: true, ouro: true },
            { label: "Destaque dourado pras empresas", bronze: false, prata: false, ouro: true },
          ].map((linha) => (
            <div key={linha.label} className="grid grid-cols-4 border-t border-stone-100">
              <div className="px-3 py-2 text-stone-700">{linha.label}</div>
              <div className="px-2 py-2 text-center">{linha.bronze ? "✅" : "—"}</div>
              <div className="px-2 py-2 text-center">{linha.prata ? "✅" : "—"}</div>
              <div className="px-2 py-2 text-center">{linha.ouro ? "✅" : "—"}</div>
            </div>
          ))}
        </div>

        {pessoa.selo !== "PRATA" && pessoa.selo !== "OURO" && (
          <GerarPixSeloForm
            selo="PRATA"
            label="Prata"
            valorLabel={`R$ ${VALOR_SELO_PRATA.toFixed(2)}/mês`}
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
        )}

        {pessoa.selo !== "OURO" && (
          <GerarPixSeloForm
            selo="OURO"
            label="Ouro"
            valorLabel={`R$ ${VALOR_SELO_OURO.toFixed(2)}/mês`}
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
        )}

        {pessoa.selo === "OURO" && (
          <p className="text-sm text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            🏅 Você já está no selo Ouro, o mais alto disponível.
          </p>
        )}
      </div>
    </div>
  );
}
