import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const empresa = await prisma.empresa.deleteMany({ where: { nome: "Padaria Teste" } });
  const usuario = await prisma.usuario.deleteMany({ where: { email: { contains: "@example.com" } } });
  const pessoa = await prisma.pessoa.deleteMany({ where: { nome: "Freelancer Teste" } });
  console.log({ empresa: empresa.count, usuario: usuario.count, pessoa: pessoa.count });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
