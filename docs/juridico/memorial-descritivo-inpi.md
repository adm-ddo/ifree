# Memorial Descritivo — Registro de Programa de Computador (INPI)

> Rascunho preparado pra dar base ao pedido de Registro de Programa de
> Computador no INPI (Lei nº 9.609/98), a ser feito pelo sistema e-INPI.
> Os campos marcados com **[PREENCHER]** são dados que só o titular sabe
> ou precisa decidir — o resto já reflete o sistema real.
>
> Isso NÃO é uma peça jurídica pronta pra protocolo — recomendo revisão
> por advogado/agente de propriedade industrial antes de submeter,
> especialmente os campos de titularidade e autoria.

## 1. Identificação do programa

| Campo | Valor |
|---|---|
| Título do programa | iFreela |
| Titular | **[PREENCHER — CPF ou CNPJ + nome/razão social]** |
| Autor(es) | **[PREENCHER — nome completo, CPF, nacionalidade de quem desenvolveu]** |
| Data de criação | 12/08/2026 (início do desenvolvimento) |
| Data de publicação/uso comercial | **[PREENCHER — data do primeiro uso comercial real, se já houver]** |
| Campo de aplicação | Gestão de recursos humanos e administração — controle de jornada, contratação e pagamento de prestadores de serviço autônomo (freelancers/"extras") |
| Tipo de programa | Aplicativo (SaaS — Software como Serviço), operação interativa, arquitetura cliente-servidor via navegador web |
| Linguagem(ns) de programação | TypeScript (JavaScript tipado), SQL |
| Linguagem-base do texto do programa | Português (interface e documentação) |

## 2. Ambiente operacional

- **Front-end**: navegador web padrão, qualquer sistema operacional e dispositivo (desktop, tablet ou celular) — não exige instalação de aplicativo nativo.
- **Back-end**: Next.js 16 (React 19) rodando sobre Node.js, hospedado em infraestrutura de nuvem (Vercel).
- **Banco de dados**: PostgreSQL (Prisma Postgres), acessado via Prisma ORM 7.
- **Armazenamento de arquivos**: Vercel Blob (fotos e assinaturas digitais).
- **Integração externa**: processamento de pagamentos via PIX.

## 3. Resumo das funcionalidades

O iFreela é um sistema de gestão de freelancers e prestadores de serviço
avulso ("extras"), voltado a empresas que contratam esse tipo de mão de
obra por hora, por dia ou por serviço específico. O sistema resolve o
controle manual (planilhas, papel) desse tipo de contratação, oferecendo:

1. **Check-in/check-out por totem digital**: o prestador se identifica
   por CPF ou CNPJ num terminal (tablet ou celular, fixo ou não),
   registra entrada e saída de turno, tira uma foto de comprovação e
   assina digitalmente um contrato de prestação de serviço eventual.
2. **Cálculo automático de remuneração**: o sistema calcula o valor
   devido de duas formas configuráveis pela empresa — por hora
   trabalhada (arredondada em blocos de 5 minutos, com desconto
   automático opcional de intervalo) ou por diária fixa, escalonada por
   faixas de horas configuráveis (ex.: meia diária, diária parcial,
   diária completa).
3. **Geração automática de documentos**: contrato de prestação de
   serviço e recibo de pagamento são gerados em PDF a partir dos dados
   do turno, incluindo a assinatura digital capturada na tela.
4. **Processamento de pagamento**: ao final do turno, o valor apurado é
   enviado ao prestador via PIX, na chave cadastrada por ele.
5. **Painel administrativo multiempresa (multi-tenant)**: cada empresa
   cliente gerencia suas próprias funções/cargos, valores de
   remuneração, freelancers cadastrados, relatórios de custo por
   período/pessoa/função, e configurações de pagamento e termos
   contratuais — com um mesmo login podendo operar múltiplas empresas.
6. **Conformidade com a LGPD**: cláusulas de tratamento de dados
   pessoais integradas ao próprio contrato assinado pelo prestador.

## 4. Fluxo resumido de operação

```
Prestador chega ao totem
  → identifica-se por CPF/CNPJ
    → (primeira vez) cadastro: nome, contato, chave PIX
    → foto de comprovação + assinatura digital do contrato
  → turno registrado como ABERTO
  ...prestação do serviço...
  → prestador retorna ao totem, encerra o turno
    → nova foto + assinatura digital do recibo
  → sistema calcula o valor (por hora ou por diária, conforme
    configuração da empresa)
  → pagamento disparado via PIX
  → turno registrado como CONCLUÍDO/PAGO
  → contrato e recibo disponíveis em PDF pro painel da empresa
```

## 5. Trecho representativo do código-fonte

O INPI exige a apresentação de um trecho representativo do código-fonte
(ou o código integral, que pode ser depositado em sigilo). **Isso ainda
precisa ser selecionado e anexado por vocês** — recomendo os módulos de
cálculo de remuneração (`src/lib/turno.ts`) e o fluxo principal do totem
(`src/app/t/[token]/actions.ts`) como trechos representativos da lógica
central do sistema, já que concentram a parte mais autoral/não-óbvia do
programa.

---

*Documento de apoio, não oficial. Revisão jurídica recomendada antes do
protocolo no INPI.*
