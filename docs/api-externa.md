# API externa do iFREE — manual rápido

API só-leitura pra outro sistema (ex.: o financeiro da empresa) consultar, em tempo real, o saldo Pix e os pagamentos feitos pelo iFREE. Não existe nenhum endpoint de escrita — nada aqui cria, edita ou cancela turno, pagamento ou qualquer outro dado.

## Autenticação

Toda chamada precisa do cabeçalho:

```
Authorization: Bearer <chave>
```

A chave é gerada pela própria empresa em **Configurações → Integração via API** (`/v2/configuracoes/api`) e é exibida **uma única vez**, no momento da criação — guarde-a com segurança (ex.: variável de ambiente no sistema financeiro), já que não tem como visualizá-la de novo depois. Se vazar ou não for mais usada, revogue a qualquer momento na mesma tela — o efeito é imediato.

Cada chave pertence a uma empresa só (nunca enxerga dados de outra empresa) e tem **escopos** próprios — veja abaixo.

## Escopos

Na hora de gerar a chave, a empresa escolhe quais endpoints ela pode chamar:

| Escopo | Libera |
|---|---|
| `saldo` | `GET /api/v1/financeiro/saldo` |
| `pagamentos` | `GET /api/v1/financeiro/pagamentos` |

Uma chave sem o escopo do endpoint chamado recebe `403` mesmo sendo uma chave válida.

> **Recomendação pra um sistema que controla saídas de caixa:** habilite os dois escopos. `pagamentos` é o dado essencial (é exatamente o registro de saída de dinheiro — cada Pix que de fato saiu). `saldo` é o complemento natural pra conferência: permite o sistema bater "saldo atual = saldo anterior − saídas do período", sem precisar confiar cegamente na soma.

## Endpoints

### `GET /api/v1/financeiro/saldo`

Saldo disponível **agora** na conta Pix da empresa — consulta ao vivo na Asaas (não é um valor em cache/desatualizado).

**Resposta `200`:**
```json
{
  "saldo": 4521.30,
  "moeda": "BRL",
  "consultadoEm": "2026-10-02T19:40:00.000Z"
}
```

**Resposta `502`** (não é erro de autenticação — a Asaas não respondeu ou a empresa ainda não tem conta conectada):
```json
{ "erro": "Não foi possível consultar o saldo agora — tente de novo em instantes." }
```

### `GET /api/v1/financeiro/pagamentos?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`

Lista os Pix **efetivamente pagos** (nunca os pendentes, em processamento, falhos ou cancelados) com confirmação dentro do período — `inicio`/`fim` são obrigatórios e interpretados em horário de Brasília.

**Resposta `200`:**
```json
{
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
}
```

Nenhum resultado no período → `total: 0`, `pagamentos: []` (não é erro).

## Erros

| Status | Quando | Corpo |
|---|---|---|
| `400` | `inicio`/`fim` ausentes, mal formatados, ou `inicio` depois de `fim` | `{ "erro": "..." }` |
| `401` | Cabeçalho `Authorization` ausente, chave inválida ou revogada | `{ "erro": "..." }` |
| `403` | Chave válida, mas sem o escopo deste endpoint | `{ "erro": "..." }` |
| `502` | Só em `/saldo` — Asaas não respondeu ou conta não conectada | `{ "erro": "..." }` |

## Exemplo (curl)

```bash
curl -H "Authorization: Bearer ifree_xxxxxxxx" \
  "https://ifree.app.br/api/v1/financeiro/pagamentos?inicio=2026-09-01&fim=2026-09-30"
```
