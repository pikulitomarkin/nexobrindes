import https from 'https';

async function testEndpoint(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {}
    };
    
    if (body && method === 'POST') {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body && method === 'POST') {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function diagnoseVercel() {
  console.log('🔍 Diagnóstico do Vercel - nexobrindes.vercel.app\n');
  
  const baseUrl = 'https://nexobrindes.vercel.app';
  const endpoints = [
    { path: '/', method: 'GET', description: 'Frontend principal' },
    { path: '/api/auth/login', method: 'GET', description: 'GET na API login' },
    { path: '/api/auth/login', method: 'POST', description: 'POST na API login', body: { username: 'admin', password: '123456' } },
    { path: '/api/', method: 'GET', description: 'API raiz' },
    { path: '/api/health', method: 'GET', description: 'Health check' },
    { path: '/assets/index-BRFPqsdC.js', method: 'GET', description: 'Arquivo JS estático' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔧 Testando: ${endpoint.description}`);
      console.log(`   ${endpoint.method} ${baseUrl}${endpoint.path}`);
      
      const result = await testEndpoint(
        `${baseUrl}${endpoint.path}`,
        endpoint.method,
        endpoint.body
      );
      
      console.log(`   Status: ${result.status} ${result.statusText}`);
      
      if (result.status === 404) {
        console.log(`   ❌ 404 NOT_FOUND - Rota não existe`);
        
        if (endpoint.path.includes('/api/')) {
          console.log(`   💡 Possíveis causas:`);
          console.log(`      1. Arquivo api/index.mjs não foi deployado`);
          console.log(`      2. vercel.json com roteamento incorreto`);
          console.log(`      3. Handler não está exportando função padrão`);
          console.log(`      4. Deploy ainda não finalizado`);
        }
      } else if (result.status === 200) {
        console.log(`   ✅ 200 OK - Rota funciona`);
        
        if (endpoint.path === '/') {
          console.log(`   💡 Frontend carregado`);
        }
      } else {
        console.log(`   ⚠️  Status inesperado: ${result.status}`);
        
        // Mostrar headers relevantes
        const contentType = result.headers['content-type'];
        if (contentType) {
          console.log(`   📋 Content-Type: ${contentType}`);
        }
        
        // Mostrar um pouco do conteúdo se for texto pequeno
        if (result.data && result.data.length < 500) {
          console.log(`   📦 Conteúdo: ${result.data.substring(0, 200)}...`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      console.log('');
    }
  }
  
  // Verificar arquivos no repositório
  console.log('📁 Verificando arquivos no repositório local:');
  
  const fs = await import('fs');
  const path = await import('path');
  
  const importantFiles = [
    'api/index.mjs',
    'vercel.json',
    'package.json',
    'api/index.ts'
  ];
  
  for (const file of importantFiles) {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    console.log(`   ${exists ? '✅' : '❌'} ${file} ${exists ? '(existe)' : '(faltando)'}`);
    
    if (exists && file === 'api/index.mjs') {
      const stats = fs.statSync(filePath);
      console.log(`      Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
    }
  }
  
  console.log('\n🎯 Análise do problema:');
  console.log('Se /api/auth/login retorna 404, mas / retorna 200:');
  console.log('1. O frontend está sendo servido corretamente');
  console.log('2. A API não está sendo encontrada pelo Vercel');
  console.log('\n🔄 Soluções possíveis:');
  console.log('A. Verifique se api/index.mjs foi commitado e pushado');
  console.log('B. Aguarde 5-10 minutos para deploy completo');
  console.log('C. Forçar redeploy manual no painel do Vercel');
  console.log('D. Verificar logs do deploy no painel do Vercel');
}

// Executar diagnóstico
diagnoseVercel().catch(console.error);