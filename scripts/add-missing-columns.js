import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env.supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.supabase') });

async function addMissingColumns() {
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
    console.log('✅ Conectado ao Supabase');
    
    // Verificar colunas atuais
    console.log('\n📋 Verificando estrutura atual da tabela users...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log(`Colunas atuais (${columnsResult.rows.length}):`);
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar se is_commissioned existe
    const hasIsCommissioned = columnsResult.rows.some(col => col.column_name === 'is_commissioned');
    const hasPhotoUrl = columnsResult.rows.some(col => col.column_name === 'photo_url');
    
    console.log('\n🔍 Colunas faltantes:');
    console.log(`  is_commissioned: ${hasIsCommissioned ? '✅ Existe' : '❌ Faltando'}`);
    console.log(`  photo_url: ${hasPhotoUrl ? '✅ Existe' : '❌ Faltando'}`);
    
    if (!hasIsCommissioned || !hasPhotoUrl) {
      console.log('\n🔄 Adicionando colunas faltantes...');
      
      // Adicionar is_commissioned se não existir
      if (!hasIsCommissioned) {
        console.log('  Adicionando coluna is_commissioned...');
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN is_commissioned BOOLEAN DEFAULT true
        `);
        console.log('  ✅ Coluna is_commissioned adicionada');
      }
      
      // Adicionar photo_url se não existir
      if (!hasPhotoUrl) {
        console.log('  Adicionando coluna photo_url...');
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN photo_url TEXT
        `);
        console.log('  ✅ Coluna photo_url adicionada');
      }
      
      // Atualizar valores padrão
      if (!hasIsCommissioned) {
        console.log('  Atualizando valores padrão para is_commissioned...');
        await client.query(`
          UPDATE users 
          SET is_commissioned = true 
          WHERE is_commissioned IS NULL
        `);
        console.log('  ✅ Valores padrão atualizados');
      }
      
      console.log('\n✅ Todas as colunas foram adicionadas com sucesso!');
    } else {
      console.log('\n✅ Todas as colunas já existem. Nenhuma alteração necessária.');
    }
    
    // Verificar estrutura final
    console.log('\n📋 Estrutura final da tabela users:');
    const finalResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    finalResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar dados do usuário admin
    console.log('\n👤 Dados do usuário admin:');
    const adminResult = await client.query(
      'SELECT id, username, role, is_active, is_commissioned FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`  ID: ${admin.id}`);
      console.log(`  Usuário: ${admin.username}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Ativo: ${admin.is_active}`);
      console.log(`  Comissionado: ${admin.is_commissioned}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error.message);
    
    if (error.message.includes('duplicate column name')) {
      console.log('💡 A coluna já existe. Ignorando erro...');
    } else if (error.message.includes('permission denied')) {
      console.log('💡 Permissão negada. Verifique as credenciais do banco de dados.');
    } else {
      console.log('💡 Detalhes do erro:', error.message);
    }
  } finally {
    if (client) {
      await client.end();
      console.log('\n🔒 Conexão fechada');
    }
  }
}

// Executar a função
addMissingColumns();