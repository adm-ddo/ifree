import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/// Data no formato exato que Date.prototype.toJSON() produz (é assim que
/// JSON.stringify serializa DateTime do Prisma) — usado pra reviver string
/// -> Date na volta, já que JSON.parse não faz isso sozinho. Decimal do
/// Prisma serializa como string simples e já é aceito assim de volta em
/// create/upsert, não precisa reviver.
const DATA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function revivalDeDatas(_chave: string, valor: unknown): unknown {
  if (typeof valor === "string" && DATA_ISO_REGEX.test(valor)) {
    return new Date(valor);
  }
  return valor;
}

/// Ordem que respeita toda FK do schema (prisma/schema.prisma) — uma
/// tabela só aparece depois de todas de quem ela depende. Ver
/// src/lib/backup.ts pros mesmos nomes de campo no JSON.
const ORDEM_TABELAS = [
  "empresas",
  "usuarios",
  "cobrancasMensalidade",
  "usuarioEmpresas",
  "totens",
  "pessoas",
  "vinculos",
  "historicoSalarial",
  "funcoes",
  "turnos",
  "avaliacoes",
  "registrosPonto",
  "pagamentos",
  "vagas",
  "candidaturas",
  "conversas",
  "mensagens",
] as const;

/// Prisma.<model>.upsert — nome do model client, um por chave do JSON
/// (nem sempre é só tirar o "s" do final, por isso o mapa explícito).
const MODELO_POR_TABELA: Record<(typeof ORDEM_TABELAS)[number], keyof PrismaClient> = {
  empresas: "empresa",
  usuarios: "usuario",
  cobrancasMensalidade: "cobrancaMensalidade",
  usuarioEmpresas: "usuarioEmpresa",
  totens: "totem",
  pessoas: "pessoa",
  vinculos: "vinculoPessoaEmpresa",
  historicoSalarial: "historicoSalarial",
  funcoes: "funcao",
  turnos: "turno",
  avaliacoes: "avaliacao",
  registrosPonto: "registroPonto",
  pagamentos: "pagamento",
  vagas: "vaga",
  candidaturas: "candidatura",
  conversas: "conversa",
  mensagens: "mensagem",
};

/// Nome real da tabela no Postgres (PascalCase, como o Prisma gera por
/// padrão) — usado só pra corrigir a sequência de autoincrement no final.
const TABELA_SQL_POR_TABELA: Record<(typeof ORDEM_TABELAS)[number], string> = {
  empresas: "Empresa",
  usuarios: "Usuario",
  cobrancasMensalidade: "CobrancaMensalidade",
  usuarioEmpresas: "UsuarioEmpresa",
  totens: "Totem",
  pessoas: "Pessoa",
  vinculos: "VinculoPessoaEmpresa",
  historicoSalarial: "HistoricoSalarial",
  funcoes: "Funcao",
  turnos: "Turno",
  avaliacoes: "Avaliacao",
  registrosPonto: "RegistroPonto",
  pagamentos: "Pagamento",
  vagas: "Vaga",
  candidaturas: "Candidatura",
  conversas: "Conversa",
  mensagens: "Mensagem",
};

async function main() {
  const caminho = process.argv[2];
  const confirmado = process.argv.includes("--confirmar");

  if (!caminho) {
    console.error(
      "Uso: npx tsx scripts/restaurar-backup.ts <caminho-ou-url-do-backup.json> --confirmar\n" +
        "Rode scripts/listar-backups.ts primeiro pra achar o arquivo certo."
    );
    process.exit(1);
  }

  const texto = caminho.startsWith("http")
    ? await (await fetch(caminho)).text()
    : readFileSync(caminho, "utf-8");
  const dados = JSON.parse(texto, revivalDeDatas) as Record<string, unknown[]> & {
    versao: number;
    geradoEm: string;
  };

  console.log(`Backup versão ${dados.versao}, gerado em ${dados.geradoEm}.`);
  const resumo = ORDEM_TABELAS.map((t) => `${t}: ${(dados[t] as unknown[] | undefined)?.length ?? 0}`);
  console.log("Conteúdo:", resumo.join(", "));

  if (!confirmado) {
    console.log(
      "\nModo de simulação (sem --confirmar) — nada foi gravado. Rode de novo" +
        " com --confirmar no final pra restaurar de verdade.\n" +
        "ATENÇÃO: isso GRAVA POR CIMA de qualquer linha com o mesmo id que já" +
        " exista no banco atual. Use só pra reconstruir um banco vazio/" +
        " corrompido, não numa base em uso normal."
    );
    return;
  }

  for (const tabela of ORDEM_TABELAS) {
    const linhas = (dados[tabela] as Record<string, unknown>[] | undefined) ?? [];
    if (linhas.length === 0) continue;

    const modelo = prisma[MODELO_POR_TABELA[tabela]] as unknown as {
      upsert: (args: { where: { id: number }; create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<unknown>;
    };

    let restauradas = 0;
    for (const linha of linhas) {
      await modelo.upsert({ where: { id: linha.id as number }, create: linha, update: linha });
      restauradas++;
    }
    console.log(`${tabela}: ${restauradas} linha(s) restaurada(s).`);
  }

  // Sem isso, o próximo INSERT automático (sem id explícito) tentaria usar
  // um id que o backup já reutilizou, batendo na constraint de chave única.
  for (const tabela of ORDEM_TABELAS) {
    const tabelaSql = TABELA_SQL_POR_TABELA[tabela];
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tabelaSql}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tabelaSql}"), 1))`
    );
  }
  console.log("\nSequências de autoincrement corrigidas. Restauração concluída.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
