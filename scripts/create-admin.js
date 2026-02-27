import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env.supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.supabase') });

async function createAdminUser() {
  let client;
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não encontrado nas variáveis de ambiente');
      console.log('📝 Configure o arquivo .env.supabase com a URL do Supabase');
      return;
    }

    console.log('🔗 Conectando ao Supabase...');
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Conectado ao Supabase');
    
    // Verificar se o usuário admin já existe
    const checkResult = await client.query(
      'SELECT id, username, role, name, email FROM users WHERE username = $1',
      ['admin']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Usuário admin já existe:');
      console.log(`   ID: ${checkResult.rows[0].id}`);
      console.log(`   Usuário: ${checkResult.rows[0].username}`);
      console.log(`   Nome: ${checkResult.rows[0].name}`);
      console.log(`   Email: ${checkResult.rows[0].email}`);
      console.log(`   Role: ${checkResult.rows[0].role}`);
      
      // Perguntar se deseja atualizar (em um script interativo seria implementado)
      console.log('\n💡 Para atualizar a senha, execute o SQL manualmente no Supabase SQL Editor');
      console.log('   Ou exclua o usuário primeiro e execute este script novamente');
    } else {
      // Inserir novo usuário admin com estrutura atual da tabela
      console.log('👤 Criando usuário administrador...');
      
      const insertResult = await client.query(`
        INSERT INTO users (
          username,
          password,
          role,
          name,
          email,
          phone,
          vendor_id,
          is_active,
          specialty,
          address
        ) VALUES (
          'admin',
          '123456',
          'admin',
          'Administrador do Sistema',
          'admin@nexobrindes.com',
          '+55 (11) 99999-9999',
          NULL,
          true,
          NULL,
          NULL
        )
        RETURNING id, username, role, name, email, is_active
      `);
      
      const newUser = insertResult.rows[0];
      console.log('✅ Usuário admin criado com sucesso!');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Usuário: ${newUser.username}`);
      console.log(`   Nome: ${newUser.name}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Ativo: ${newUser.is_active}`);
      console.log('\n🔑 Credenciais de acesso:');
      console.log('   Usuário: admin');
      console.log('   Senha: 123456');
      console.log('\n⚠️  IMPORTANTE: A senha está em texto plano.');
      console.log('   Considere implementar hash de senhas para produção.');
    }
    
    // Verificar total de usuários
    const countResult = await client.query('SELECT COUNT(*) as total FROM users');
    console.log(`\n📊 Total de usuários no sistema: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    
    if (error.message.includes('users_username_key')) {
      console.log('💡 O usuário admin já existe (violação de chave única)');
    } else if (error.message.includes('relation "users" does not exist')) {
      console.log('💡 A tabela users não existe. Execute as migrações primeiro:');
      console.log('   npx drizzle-kit push');
    } else if (error.message.includes('password authentication')) {
      console.log('💡 Erro de autenticação. Verifique a DATABASE_URL no .env.supabase');
    } else {
      console.log('💡 Detalhes do erro:', error.message);
    }
  } finally {
    if (client) {
      await client.end();
      console.log('🔒 Conexão fechada');
    }
  }
}

// Executar a função
createAdminUser();