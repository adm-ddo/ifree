import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const empresa = await prisma.empresa.deleteMany({ where: { nome: "Restaurante Teste" } });
const usuario = await prisma.usuario.deleteMany({ where: { email: { contains: "@example.com" } } });
console.log("empresas removidas:", empresa.count, "| usuarios removidos:", usuario.count);

await prisma.$disconnect();
await pool.end();
