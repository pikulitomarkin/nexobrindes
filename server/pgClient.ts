import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "../shared/schema";
import "dotenv/config";

const { Pool } = pkg;

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL não encontrado nas variáveis de ambiente.\n" +
    "Configure DATABASE_URL no arquivo .env antes de usar o PostgreSQL.\n" +
    "Exemplo: DATABASE_URL=postgresql://user:password@host/database"
  );
}

// Create connection pool with PostgreSQL settings
const sslConfig = DATABASE_URL.includes('supabase') || DATABASE_URL.includes('aws') 
  ? { rejectUnauthorized: false }
  : false;

console.log(`🔧 Configuração SSL do pool: ${sslConfig ? 'HABILITADA' : 'DESABILITADA'}`);
if (sslConfig) {
  console.log(`🔧 SSL rejectUnauthorized: ${sslConfig.rejectUnauthorized}`);
}

const pool = new Pool({
  connectionString: DATABASE_URL,

  // Pool size configuration
  max: 10, // Maximum number of clients in the pool

  // Idle timeout: Close idle connections after 3 minutes
  idleTimeoutMillis: 180000,

  // Connection timeout: How long to wait for a connection from the pool
  connectionTimeoutMillis: 10000,

  // Maximum lifetime of a connection: Force recreation after 10 minutes
  // This prevents using stale connections
  maxUses: 7500, // ~10 minutes worth of queries at typical rates

  // SSL configuration for Supabase/cloud databases
  ssl: sslConfig
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

console.log('🔌 Pool de conexões PostgreSQL/Supabase inicializado com sucesso');