import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

// Carregar APENAS do arquivo .env.supabase (não do .env padrão)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env.supabase') });

console.log('🔧 Carregando configuração Supabase...');
console.log(`📋 DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 70)}...`);

// Executar check-database diretamente
import pkg from 'pg';
const { Client } = pkg;

async function checkSupabase() {
  let client;
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não encontrado');
      return;
    }

    console.log('🔍 Conectando ao Supabase...');
    const connectionString = process.env.DATABASE_URL;
    
    client = new Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    
    // Verificar tabelas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tables = result.rows;
    
    console.log('✅ Conexão com Supabase bem-sucedida!');
    console.log(`📊 Total de tabelas: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('📭 Banco vazio - pronto para migrações!');
      console.log('💡 Execute: npx drizzle-kit push');
    } else {
      console.log('📋 Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

checkSupabase();