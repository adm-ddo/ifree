import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const email = process.env.MASTER_EMAIL;
const senha = process.env.MASTER_PASSWORD;

if (!email || !senha) {
  console.error(
    "Defina MASTER_EMAIL e MASTER_PASSWORD no .env antes de rodar este script."
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const senhaHash = await bcrypt.hash(senha!, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { senhaHash, isMaster: true },
    create: { email: email!, senhaHash, isMaster: true },
  });

  console.log(`Usuário master pronto: ${usuario.email} (id ${usuario.id})`);
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
