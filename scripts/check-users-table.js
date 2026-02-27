import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env.supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.supabase') });

async function checkUsersTable() {
  let client;
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não encontrado');
      return;
    }

    console.log('🔗 Conectando ao Supabase...');
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Conectado ao Supabase\n');
    
    // 1. Listar colunas da tabela users
    console.log('📋 ESTRUTURA DA TABELA users:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    if (columnsResult.rows.length === 0) {
      console.log('❌ Tabela users não encontrada');
    } else {
      console.log(`Total de colunas: ${columnsResult.rows.length}`);
      console.log('=' .repeat(60));
      columnsResult.rows.forEach(col => {
        console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    console.log('\n📊 DADOS DA TABELA users:');
    const usersResult = await client.query('SELECT id, username, role, name, email, is_active FROM users LIMIT 10');
    
    if (usersResult.rows.length === 0) {
      console.log('Nenhum usuário encontrado');
    } else {
      console.log(`Total de usuários: ${usersResult.rows.length}`);
      console.log('=' .repeat(60));
      usersResult.rows.forEach(user => {
        console.log(`${user.username.padEnd(15)} ${user.role.padEnd(10)} ${user.name.substring(0, 30).padEnd(30)} ${user.email || 'N/A'}`);
      });
    }
    
    // Verificar se existe usuário admin
    console.log('\n🔍 VERIFICANDO USUÁRIO admin:');
    const adminResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminResult.rows.length > 0) {
      console.log('✅ Usuário admin encontrado:');
      const admin = adminResult.rows[0];
      Object.keys(admin).forEach(key => {
        console.log(`  ${key.padEnd(20)}: ${admin[key]}`);
      });
    } else {
      console.log('❌ Usuário admin não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (client) {
      await client.end();
      console.log('\n🔒 Conexão fechada');
    }
  }
}

checkUsersTable();