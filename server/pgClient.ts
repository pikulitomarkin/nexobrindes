import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from '../shared/schema.js';
import "dotenv/config";

const { Pool } = pkg;

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL não encontrado nas variáveis de ambiente na inicialização.\n" +
    "O Pool não será instanciado corretamente, e queries irão falhar."
  );
}

// Create connection pool with PostgreSQL settings
const sslConfig = DATABASE_URL && (DATABASE_URL.includes('supabase') || DATABASE_URL.includes('aws'))
  ? { rejectUnauthorized: false }
  : false;

console.error(`🔧 Configuração SSL do pool: ${sslConfig ? 'HABILITADA' : 'DESABILITADA'} (URL: ${DATABASE_URL ? 'PRESENTE' : 'AUSENTE'})`);

let poolInst: ReturnType<typeof Pool> | null = null;

try {
  poolInst = new Pool({
    connectionString: DATABASE_URL || 'postgresql://fake:fake@fake/fake', // fake to avoid crash, will fail on query
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: sslConfig
  });
} catch (e) {
  console.error("❌ Erro FATAL ao instanciar o Pool do PG (ex: dependência nativa faltando):", e);
}

const pool = poolInst as any; // Cast for now, will handle errors gracefully below

// Log pool events for debugging and configure statement timeout
if (pool) {
  pool.on('connect', async (client: any) => {
    console.log('✅ Nova conexão estabelecida no Pool PostgreSQL');

    // Set statement timeout to 30 seconds to prevent hanging queries
    try {
      await client.query('SET statement_timeout = 30000');
    } catch (err) {
      console.error('⚠️ Erro ao configurar statement_timeout:', err);
    }
  });

  pool.on('error', (err: any, client: any) => {
    console.error('❌ Erro inesperado no Pool PostgreSQL:', err.message);
  });

  pool.on('remove', () => {
    console.log('🔄 Conexão removida do Pool (idle timeout ou erro)');
  });
}

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