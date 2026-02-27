import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import ws from "ws";

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL não encontrado nas variáveis de ambiente.\n" +
    "Configure DATABASE_URL no arquivo .env antes de usar o PostgreSQL.\n" +
    "Exemplo: DATABASE_URL=postgresql://user:password@host/database"
  );
}

// Configure Neon to use WebSocket only if it's actually connecting to Neon
// Otherwise, it breaks standard postgresql:// connections
if (DATABASE_URL.includes("neon.tech")) {
  neonConfig.webSocketConstructor = ws;
}

// Create connection pool with Neon-optimized settings
const pool = new Pool({
  connectionString: DATABASE_URL,

  // Pool size configuration
  max: 10, // Maximum number of clients in the pool

  // Idle timeout: Close idle connections after 3 minutes
  // This is CRITICAL - we close connections BEFORE Neon does (Neon closes after ~5-10 min)
  // 3 minutes allows connection reuse while staying below Neon's auto-suspend threshold
  idleTimeoutMillis: 180000,

  // Connection timeout: How long to wait for a connection from the pool
  connectionTimeoutMillis: 10000,

  // Maximum lifetime of a connection: Force recreation after 10 minutes
  // This prevents using stale connections that Neon might have suspended
  maxUses: 7500, // ~10 minutes worth of queries at typical rates
});

// Log pool events for debugging and configure statement timeout
pool.on('connect', async (client) => {
  console.log('✅ Nova conexão estabelecida no Pool PostgreSQL');

  // Set statement timeout to 30 seconds to prevent hanging queries
  // This ensures queries fail fast instead of hanging indefinitely
  try {
    await client.query('SET statement_timeout = 30000');
  } catch (err) {
    console.error('⚠️ Erro ao configurar statement_timeout:', err);
  }
});

pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no Pool PostgreSQL:', err.message);
});

pool.on('remove', () => {
  console.log('🔄 Conexão removida do Pool (idle timeout ou erro)');
});

// Create Drizzle instance with Pool
export const pg = drizzle(pool, { schema });

// Export pool for direct access if needed
export { pool };

// Export schema for use in queries
export { schema };

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM recebido, fechando Pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT recebido, fechando Pool...');
  await pool.end();
  process.exit(0);
});

console.log('🔌 Pool de conexões PostgreSQL/Neon inicializado com sucesso');
