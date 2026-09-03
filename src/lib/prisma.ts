import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
  pgPool: Pool | undefined;
};

// max baixo de propósito: em serverless (Vercel), cada instância que sobe
// sob concorrência cria seu próprio Pool — sem limite aqui, um pico de
// acessos simultâneos (várias pessoas usando ao mesmo tempo) multiplica
// instâncias × 10 conexões (padrão do pg) e estoura o teto de conexões do
// Postgres, derrubando o sistema inteiro até as conexões travadas
// expirarem. Com max baixo, cada instância pesa pouco no total mesmo sob
// concorrência alta.
const pool =
  globalForPrisma.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// Sem isso, um erro numa conexão ociosa do pool (rede, timeout, o próprio
// Postgres encerrando a conexão) vira uma exceção não tratada e derruba o
// processo Node inteiro — é o comportamento documentado do EventEmitter
// quando "error" não tem nenhum listener. Só logar aqui evita que uma
// falha pontual de conexão vire queda em cascata do site inteiro.
pool.on("error", (err) => {
  console.error("Erro numa conexão ociosa do pool do Postgres:", err);
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
