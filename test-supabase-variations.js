import pkg from 'pg';
const { Client } = pkg;

async function testConnection(url, description) {
  console.log(`\n🔍 Testando: ${description}`);
  console.log(`📋 URL: ${url.substring(0, 70)}...`);
  
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Conectando...');
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Consultas básicas
    const versionResult = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);
    
    const dbResult = await client.query('SELECT current_database()');
    console.log(`🗄️  Banco: ${dbResult.rows[0].current_database}`);
    
    const userResult = await client.query('SELECT current_user');
    console.log(`👤 Usuário: ${userResult.rows[0].current_user}`);
    
    await client.end();
    return { success: true, url };
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    await client.end().catch(() => {});
    return { success: false, url, error: error.message };
  }
}

async function runAllTests() {
  const baseUrl = "postgresql://postgres.chdmycfidnsgvrpsndta:[ATtcmqmnckpWoN8e]@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
  const cleanPassword = 'ATtcmqmnckpWoN8e';
  
  const testCases = [
    {
      url: baseUrl,
      description: 'URL original (com colchetes na senha)'
    },
    {
      url: baseUrl.replace('[ATtcmqmnckpWoN8e]', cleanPassword),
      description: 'Senha sem colchetes'
    },
    {
      url: baseUrl.replace('[ATtcmqmnckpWoN8e]', cleanPassword) + '?sslmode=require',
      description: 'Senha sem colchetes + SSL require'
    },
    {
      url: `postgresql://postgres:${cleanPassword}@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require`,
      description: 'Usuário "postgres" padrão (sem .chdmycfidnsgvrpsndta)'
    },
    {
      url: `postgresql://postgres.chdmycfidnsgvrpsndta:${cleanPassword}@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require`,
      description: 'Usuário com pooling + senha limpa + SSL'
    }
  ];

  console.log('🚀 Iniciando testes de conexão Supabase\n');
  console.log('📝 Análise da URL fornecida:');
  console.log(`   Host: aws-0-us-west-2.pooler.supabase.com`);
  console.log(`   Porta: 6543 (connection pooling)`);
  console.log(`   Usuário: postgres.chdmycfidnsgvrpsndta (usuário de pooling)`);
  console.log(`   Senha: [ATtcmqmnckpWoN8e] (colchetes podem ou não fazer parte)`);
  console.log(`   Banco: postgres\n`);

  const results = [];
  
  for (const testCase of testCases) {
    const result = await testConnection(testCase.url, testCase.description);
    results.push({ ...testCase, ...result });
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 RESUMO DOS TESTES:');
  console.log('=' .repeat(50));
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  if (successfulTests.length > 0) {
    console.log(`✅ ${successfulTests.length} teste(s) bem-sucedido(s):`);
    successfulTests.forEach((test, i) => {
      console.log(`   ${i+1}. ${test.description}`);
    });
    
    // Recomendar a melhor URL
    const bestUrl = successfulTests[0].url;
    console.log(`\n💡 URL recomendada para uso:`);
    console.log(`   ${bestUrl}`);
    
    // Verificar se é connection pooling
    if (bestUrl.includes('.pooler.supabase.com')) {
      console.log(`   🔗 Tipo: Connection Pooling (porta 6543)`);
    }
    
    if (bestUrl.includes('?sslmode=require')) {
      console.log(`   🔐 SSL: Habilitado (obrigatório para Supabase)`);
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ ${failedTests.length} teste(s) falhou/falharam:`);
    failedTests.forEach((test, i) => {
      console.log(`   ${i+1}. ${test.description}`);
      console.log(`      Erro: ${test.error.substring(0, 60)}...`);
    });
  }
  
  console.log('\n🔧 RECOMENDAÇÕES:');
  
  if (successfulTests.length === 0) {
    console.log('1. Verifique a senha no painel do Supabase');
    console.log('2. No Supabase, vá para Project Settings > Database');
    console.log('3. Verifique a senha e redefina se necessário');
    console.log('4. Verifique se o IP está autorizado (Connection Pooling)');
    console.log('5. Tente usar a porta padrão 5432 em vez de 6543');
  } else {
    console.log('1. Use a URL recomendada acima como DATABASE_URL no Vercel');
    console.log('2. Configure no Vercel: Settings > Environment Variables');
    console.log('3. Execute migrações: npx drizzle-kit push');
    console.log('4. Teste o sistema: admin@nexobrindes.com / admin123');
  }
  
  console.log('\n💡 NOTA: O Supabase requer SSL. Sempre use ?sslmode=require');
}

// Executar todos os testes
runAllTests().catch(console.error);