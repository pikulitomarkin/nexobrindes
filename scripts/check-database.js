
const { neon } = require('@neondatabase/serverless');

async function checkDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não encontrado nas variáveis de ambiente');
      console.log('📝 Para criar um banco PostgreSQL no Replit:');
      console.log('   1. Abra uma nova aba e digite "Database"');
      console.log('   2. Clique em "Create a database"');
      console.log('   3. Escolha PostgreSQL');
      console.log('   4. Aguarde a criação e configuração automática');
      return;
    }

    console.log('🔍 Conectando ao banco PostgreSQL...');
    const sql = neon(process.env.DATABASE_URL);
    
    // Verificar se as tabelas existem
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
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
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        const orderCount = await sql`SELECT COUNT(*) as count FROM orders`;
        
        console.log('\n📈 Estatísticas:');
        console.log(`  - Usuários: ${userCount[0].count}`);
        console.log(`  - Pedidos: ${orderCount[0].count}`);
      } catch (e) {
        console.log('⚠️  Algumas tabelas podem estar em formato antigo, considere executar migrações');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error.message);
    
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 Solução: O banco não existe ou não foi configurado corretamente');
      console.log('   1. Vá na aba Database do Replit');
      console.log('   2. Crie um novo banco PostgreSQL');
      console.log('   3. Aguarde a configuração automática das variáveis');
    }
  }
}

checkDatabase();
