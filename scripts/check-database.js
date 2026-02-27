import pkg from 'pg';
const { Client } = pkg;

async function checkDatabase() {
  let client;
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não encontrado nas variáveis de ambiente');
      console.log('📝 Para configurar o banco PostgreSQL:');
      console.log('   1. Crie um projeto no Supabase (https://supabase.com)');
      console.log('   2. Vá em Project Settings -> Database -> Connection string');
      console.log('   3. Copie a string de conexão PostgreSQL');
      console.log('   4. Configure a variável DATABASE_URL no ambiente');
      return;
    }

    console.log('🔍 Conectando ao banco PostgreSQL...');
    const connectionString = process.env.DATABASE_URL;
    
    // Configurar SSL para Supabase
    const sslConfig = connectionString.includes('supabase.co') || connectionString.includes('supabase.com') 
      ? { rejectUnauthorized: false } 
      : false;
    
    client = new Client({
      connectionString: connectionString,
      ssl: sslConfig,
    });
    
    await client.connect();
    
    // Verificar se as tabelas existem
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tables = result.rows;
    
    console.log('✅ Conexão com banco PostgreSQL bem-sucedida!');
    console.log(`📊 Total de tabelas: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada. Execute as migrações:');
      console.log('   npx drizzle-kit push');
    } else {
      console.log('📋 Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
      // Verificar alguns registros de exemplo
      try {
        const userResult = await client.query('SELECT COUNT(*) as count FROM users');
        const orderResult = await client.query('SELECT COUNT(*) as count FROM orders');
        
        console.log('\n📈 Estatísticas:');
        console.log(`  - Usuários: ${userResult.rows[0].count}`);
        console.log(`  - Pedidos: ${orderResult.rows[0].count}`);
      } catch (e) {
        console.log('⚠️  Algumas tabelas podem estar em formato antigo, considere executar migrações');
        console.log('   Detalhes do erro:', e.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error.message);
    
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 Solução: O banco não existe ou não foi configurado corretamente');
      console.log('   1. Verifique se o projeto Supabase está ativo');
      console.log('   2. Confirme que o banco de dados foi provisionado');
      console.log('   3. Verifique se a string de conexão está correta');
    } else if (error.message.includes('password authentication')) {
      console.log('💡 Solução: Credenciais de acesso incorretas');
      console.log('   1. Verifique a senha no Supabase Project Settings');
      console.log('   2. Atualize a string de conexão com a senha correta');
      console.log('   3. Nota: Colchetes [] na senha podem causar problemas');
    } else if (error.message.includes('SSL')) {
      console.log('💡 Solução: Problema com conexão SSL');
      console.log('   Para Supabase, SSL é obrigatório. Usamos rejectUnauthorized: false');
      console.log('   Se ainda falhar, tente adicionar ?sslmode=require à URL');
    } else if (error.message.includes('self-signed certificate')) {
      console.log('💡 Solução: Certificado SSL autoassinado');
      console.log('   Estamos usando rejectUnauthorized: false (OK para desenvolvimento)');
      console.log('   Para produção, você pode precisar configurar certificados SSL');
    }
  } finally {
    if (client) {
      await client.end();
    }
  }
}

checkDatabase();