async function testVercelAPI() {
  console.log('🔍 Testando API do Vercel...');
  console.log('📋 URL: https://nexobrindes.vercel.app/api/auth/login');
  
  try {
    const response = await fetch('https://nexobrindes.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: '123456'
      })
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`);
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login bem-sucedido!');
      console.log(`📦 Resposta: ${JSON.stringify(data, null, 2)}`);
    } else {
      const text = await response.text();
      console.log(`❌ Erro ${response.status}: ${text}`);
      
      if (response.status === 404) {
        console.log('\n🔍 Possíveis causas do erro 404:');
        console.log('1. Rota /api/auth/login não está registrada no Vercel');
        console.log('2. Arquivo dist/api.mjs não foi deployado');
        console.log('3. vercel.json com configuração incorreta');
        console.log('4. Deploy ainda não concluído (aguarde 5 minutos)');
        console.log('5. Cache do Vercel (tente redeploy manual)');
        
        // Testar outras rotas para diagnóstico
        console.log('\n🔧 Testando outras rotas para diagnóstico:');
        await testRoute('/');
        await testRoute('/api/');
        await testRoute('/api/health');
      }
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    console.error('💡 Detalhes:', error);
  }
}

async function testRoute(path) {
  try {
    const url = `https://nexobrindes.vercel.app${path}`;
    const response = await fetch(url, { method: 'GET' });
    console.log(`  ${path.padEnd(20)} → ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`  ${path.padEnd(20)} → ERRO: ${error.message}`);
  }
}

// Executar teste
testVercelAPI();