import type { Metadata } from "next";
import BotaoImprimir from "./BotaoImprimir";

export const metadata: Metadata = {
  title: "Manual da API externa — iFREE",
  description:
    "Como autenticar e consultar saldo Pix e pagamentos feitos pelo iFREE a partir de outro sistema.",
};

/** Manual técnico público (sem login — pensado pra ser mandado direto pra
 * quem vai IMPLEMENTAR a integração, que não necessariamente tem conta no
 * iFREE) da API externa (ver src/app/api/v1/financeiro/**). Espelha
 * docs/api-externa.md — mesmo conteúdo, só que navegável/imprimível
 * direto no navegador em vez de exigir abrir o repositório. Igual
 * /manual (ver src/app/manual/page.tsx), fica de fora do chrome do
 * painel (AppHeader/SplashScreen) — ver exclusão de prefixo "/manual" em
 * src/components/ChromeGate.tsx. Atualizar os dois juntos quando a API
 * mudar. */
export default function ManualApiExternaPage() {
  return (
    <div className="min-h-full bg-stone-50 text-stone-800">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14 flex flex-col gap-8 print:py-0 print:max-w-none">
        <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">iFREE</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1">API externa — manual rápido</h1>
          </div>
          <BotaoImprimir />
        </header>

        <p className="text-stone-600 text-base leading-relaxed -mt-4 print:mt-0">
          API só-leitura pra outro sistema (ex.: o financeiro da empresa) consultar, em tempo real, o
          saldo Pix e os pagamentos feitos pelo iFREE. Não existe nenhum endpoint de escrita — nada aqui
          cria, edita ou cancela turno, pagamento ou qualquer outro dado.
        </p>

        <Secao titulo="Autenticação">
          <p>Toda chamada precisa do cabeçalho:</p>
          <CodeBlock>{`Authorization: Bearer <chave>`}</CodeBlock>
          <p>
            A chave é gerada pela própria empresa em <strong>Configurações → Integração via API</strong>{" "}
            (<code className="bg-stone-100 rounded px-1 py-0.5 text-sm">/v2/configuracoes/api</code>) e é
            exibida <strong>uma única vez</strong>, no momento da criação — guarde-a com segurança (ex.:
            variável de ambiente no sistema financeiro), já que não tem como visualizá-la de novo depois.
            Se vazar ou não for mais usada, pode ser revogada a qualquer momento na mesma tela — o efeito
            é imediato.
          </p>
          <p>Cada chave pertence a uma empresa só (nunca enxerga dados de outra empresa) e tem escopos próprios.</p>
        </Secao>

        <Secao titulo="Escopos">
          <p>Na hora de gerar a chave, a empresa escolhe quais endpoints ela pode chamar:</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-2 pr-4 font-semibold">Escopo</th>
                <th className="py-2 font-semibold">Libera</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-stone-200">
                <td className="py-2 pr-4"><code className="bg-stone-100 rounded px-1 py-0.5">saldo</code></td>
                <td className="py-2"><code className="bg-stone-100 rounded px-1 py-0.5">GET /api/v1/financeiro/saldo</code></td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="bg-stone-100 rounded px-1 py-0.5">pagamentos</code></td>
                <td className="py-2"><code className="bg-stone-100 rounded px-1 py-0.5">GET /api/v1/financeiro/pagamentos</code></td>
              </tr>
            </tbody>
          </table>
          <p>Uma chave sem o escopo do endpoint chamado recebe <code className="bg-stone-100 rounded px-1 py-0.5 text-sm">403</code> mesmo sendo uma chave válida.</p>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-stone-700">
            <strong>Recomendação pra um sistema que controla saídas de caixa:</strong> habilite os dois
            escopos. <code className="bg-white rounded px-1 py-0.5">pagamentos</code> é o dado essencial
            (é exatamente o registro de saída de dinheiro — cada Pix que de fato saiu).{" "}
            <code className="bg-white rounded px-1 py-0.5">saldo</code> é o complemento natural pra
            conferência: permite bater &ldquo;saldo atual = saldo anterior − saídas do período&rdquo;, sem
            precisar confiar cegamente na soma.
          </div>
        </Secao>

        <Secao titulo="GET /api/v1/financeiro/saldo">
          <p>Saldo disponível <strong>agora</strong> na conta Pix da empresa — consulta ao vivo na Asaas (não é um valor em cache/desatualizado).</p>
          <p className="font-semibold text-sm text-stone-600">Resposta 200</p>
          <CodeBlock>{`{
  "saldo": 4521.30,
  "moeda": "BRL",
  "consultadoEm": "2026-10-02T19:40:00.000Z"
}`}</CodeBlock>
          <p className="font-semibold text-sm text-stone-600">Resposta 502 (sem conta Asaas conectada, ou a Asaas não respondeu)</p>
          <CodeBlock>{`{ "erro": "Não foi possível consultar o saldo agora — tente de novo em instantes." }`}</CodeBlock>
        </Secao>

        <Secao titulo="GET /api/v1/financeiro/pagamentos?inicio=YYYY-MM-DD&fim=YYYY-MM-DD">
          <p>
            Lista os Pix <strong>efetivamente pagos</strong> (nunca os pendentes, em processamento,
            falhos ou cancelados) com confirmação dentro do período — <code className="bg-stone-100 rounded px-1 py-0.5 text-sm">inicio</code>/
            <code className="bg-stone-100 rounded px-1 py-0.5 text-sm">fim</code> são obrigatórios e interpretados em horário de Brasília.
          </p>
          <p className="font-semibold text-sm text-stone-600">Resposta 200</p>
          <CodeBlock>{`{
  "periodo": { "inicio": "2026-09-01", "fim": "2026-09-30" },
  "total": 2,
  "valorTotal": 310.00,
  "pagamentos": [
    {
      "id": 4821,
      "turnoId": 9931,
      "pessoaNome": "Maria Souza",
      "valor": 150.00,
      "chavePixDestino": "11999999999",
      "tipoChavePixDestino": "TELEFONE",
      "idTransacaoExterna": "a1b2c3d4-asaas",
      "processadoEm": "2026-09-14T23:05:12.000Z"
    },
    {
      "id": 4855,
      "turnoId": 9980,
      "pessoaNome": "João Lima",
      "valor": 160.00,
      "chavePixDestino": "joao@exemplo.com",
      "tipoChavePixDestino": "EMAIL",
      "idTransacaoExterna": "e5f6g7h8-asaas",
      "processadoEm": "2026-09-20T22:40:03.000Z"
    }
  ]
}`}</CodeBlock>
          <p>Nenhum resultado no período → <code className="bg-stone-100 rounded px-1 py-0.5 text-sm">total: 0</code>, <code className="bg-stone-100 rounded px-1 py-0.5 text-sm">pagamentos: []</code> (não é erro).</p>
        </Secao>

        <Secao titulo="Erros">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 font-semibold">Quando</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-stone-200">
                <td className="py-2 pr-4 font-mono">400</td>
                <td className="py-2 pr-4">inicio/fim ausentes, mal formatados, ou inicio depois de fim</td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="py-2 pr-4 font-mono">401</td>
                <td className="py-2 pr-4">Cabeçalho Authorization ausente, chave inválida ou revogada</td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="py-2 pr-4 font-mono">403</td>
                <td className="py-2 pr-4">Chave válida, mas sem o escopo deste endpoint</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono">502</td>
                <td className="py-2 pr-4">Só em /saldo — Asaas não respondeu ou conta não conectada</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-stone-500">Toda resposta de erro vem no formato <code className="bg-stone-100 rounded px-1 py-0.5">{`{ "erro": "..." }`}</code>.</p>
        </Secao>

        <Secao titulo="Exemplo (curl)">
          <CodeBlock>{`curl -H "Authorization: Bearer ifree_xxxxxxxx" \\
  "https://ifree.app.br/api/v1/financeiro/pagamentos?inicio=2026-09-01&fim=2026-09-30"`}</CodeBlock>
        </Secao>

        <footer className="text-xs text-stone-400 border-t border-stone-200 pt-4 print:hidden">
          iFREE · ifree.app.br
        </footer>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-navy-900 break-words">{titulo}</h2>
      <div className="flex flex-col gap-3 text-stone-700 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-xl bg-navy-900 text-stone-100 p-4 text-xs sm:text-sm overflow-x-auto print:whitespace-pre-wrap print:break-words">
      <code>{children}</code>
    </pre>
  );
}
