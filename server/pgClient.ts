import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL não encontrado nas variáveis de ambiente.\n" +
    "Configure DATABASE_URL no arquivo .env antes de usar o PostgreSQL.\n" +
    "Exemplo: DATABASE_URL=postgresql://user:password@host/database"
  );
}

// Create Neon HTTP client
const sql = neon(DATABASE_URL);

// Create Drizzle instance with schema
export const pg = drizzle(sql, { schema });

// Export schema for use in queries
export { schema };
