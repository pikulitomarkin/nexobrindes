import pkg from 'pg';
const { Client } = pkg;

async function testConnection() {
  // URL fornecida pelo usuário
  const connectionString = "postgresql://postgres.chdmycfidnsgvrpsndta:[ATtcmqmnckpWoN8e]@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
  
  console.log('🔍 Testando conexão com Supabase...');
  console.log(`📋 URL: ${connectionString.substring(0, 60)}...`);
  
  // Verificar se a senha tem colchetes (pode ser parte da senha ou apenas formatação)
  let actualConnectionString = connectionString;
  if (connectionString.includes('[ATtcmqmnckpWoN8e]')) {
    console.log('⚠️  Atenção: Senha contém colchetes. Testando como está...');
  }
  
  const client = new Client({
    connectionString: actualConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Conectando...');
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar algumas consultas básicas
    console.log('🧪 Testando consultas...');
    
    // 1. Verificar versão do PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log(`📊 Versão PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);
    
    // 2. Verificar se o banco está acessível
    const dbResult = await client.query('SELECT current_database()');
    console.log(`🗄️  Banco atual: ${dbResult.rows[0].current_database}`);
    
    // 3. Verificar usuário atual
    const userResult = await client.query('SELECT current_user');
    console.log(`👤 Usuário atual: ${userResult.rows[0].current_user}`);
    
    // 4. Listar tabelas (se existirem)
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
        LIMIT 10
      `);
      
      if (tablesResult.rows.length > 0) {
        console.log(`📋 ${tablesResult.rows.length} tabela(s) encontrada(s):`);
        tablesResult.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
      } else {
        console.log('📭 Nenhuma tabela encontrada (banco vazio) - OK para primeira configuração');
      }
    } catch (tableError) {
      console.log('⚠️  Não foi possível listar tabelas (banco provavelmente vazio ou sem permissões)');
    }
    
    console.log('🎉 Teste de conexão concluído com sucesso!');
    console.log('💡 Próximos passos:');
    console.log('   1. Configure esta URL como DATABASE_URL no Vercel');
    console.log('   2. Execute migrações: npx drizzle-kit push');
    console.log('   3. Teste o login com admin@nexobrindes.com / admin123');
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    
    // Análise de erros comuns
    if (error.message.includes('password authentication')) {
      console.log('💡 Problema: Autenticação com senha falhou');
      console.log('   Verifique se a senha está correta');
      console.log('   Nota: Colchetes [] podem fazer parte da senha ou não');
      console.log('   Tente remover os colchetes da senha na URL');
    } else if (error.message.includes('SSL')) {
      console.log('💡 Problema: Conexão SSL requerida');
      console.log('   Adicione ?sslmode=require ao final da URL');
      console.log('   URL sugerida: ' + connectionString + '?sslmode=require');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Problema: Timeout de conexão');
      console.log('   Verifique firewall ou rede');
      console.log('   O host pode estar bloqueado ou inacessível');
    } else if (error.message.includes('getaddrinfo')) {
      console.log('💡 Problema: Host não encontrado');
      console.log('   Verifique o nome do host na URL: aws-0-us-west-2.pooler.supabase.com');
      console.log('   O host pode estar incorreto ou região diferente');
    } else if (error.message.includes('no pg_hba.conf')) {
      console.log('💡 Problema: IP não autorizado');
      console.log('   No Supabase, vá para Project Settings > Database > Connection Pooling');
      console.log('   Adicione o IP do Vercel ou habilite "Allow all IPs" temporariamente');
    }
    
    // Sugerir teste alternativo sem colchetes
    console.log('\n🔧 Teste alternativo (removendo colchetes da senha):');
    const cleanPassword = 'ATtcmqmnckpWoN8e'; // Senha sem colchetes
    const cleanUrl = connectionString.replace('[ATtcmqmnckpWoN8e]', cleanPassword);
    console.log(`   URL limpa: ${cleanUrl.substring(0, 70)}...`);
    
  } finally {
    if (client) {
      await client.end();
      console.log('🔒 Conexão fechada');
    }
  }
}

// Executar teste
testConnection().catch(console.error);