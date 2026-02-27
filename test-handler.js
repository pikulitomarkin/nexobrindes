import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env.supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env.supabase') });

// Definir variáveis de ambiente para simular Vercel
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

console.log('🔧 Testando handler do Vercel com requisição simulada...');
console.log(`📋 DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 60)}...`);
console.log(`🏷️  VERCEL: ${process.env.VERCEL}, NODE_ENV: ${process.env.NODE_ENV}`);

// Importar o handler
try {
  console.log('🔄 Importando handler...');
  const module = await import('./dist/api.mjs');
  const handler = module.default;
  
  if (typeof handler !== 'function') {
    console.error('❌ Handler não é uma função');
    process.exit(1);
  }
  
  console.log('✅ Handler carregado');
  
  // Criar objetos de requisição e resposta simulados
  const mockReq = {
    method: 'POST',
    url: '/api/auth/login',
    path: '/api/auth/login',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Test/1.0'
    },
    body: {
      username: 'admin',
      password: '123456'
    }
  };
  
  let responseSent = false;
  let responseStatus = null;
  let responseBody = null;
  let responseHeaders = {};
  
  const mockRes = {
    status: function(statusCode) {
      responseStatus = statusCode;
      return this;
    },
    json: function(body) {
      responseBody = body;
      responseSent = true;
      console.log(`📤 Resposta enviada: ${responseStatus}`, body);
      return this;
    },
    setHeader: function(name, value) {
      responseHeaders[name] = value;
    },
    end: function() {
      responseSent = true;
      console.log(`📤 Resposta finalizada: ${responseStatus}`);
    }
  };
  
  // Adicionar propriedades extras para compatibilidade
  mockRes.statusCode = 200;
  
  console.log('🔄 Executando handler com requisição simulada...');
  
  // Executar o handler
  await handler(mockReq, mockRes);
  
  // Aguardar um pouco para a resposta
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (responseSent) {
    console.log('✅ Handler respondeu à requisição');
    console.log(`📊 Status: ${responseStatus}`);
    console.log(`📦 Body: ${JSON.stringify(responseBody, null, 2)}`);
    
    if (responseStatus === 200) {
      console.log('🎉 Login simulou com sucesso!');
    } else {
      console.log('⚠️  Handler retornou status não-200');
    }
  } else {
    console.log('❌ Handler não enviou resposta');
  }
  
} catch (error) {
  console.error('❌ Erro durante teste:', error.message);
  console.error('Stack:', error.stack);
  
  if (error.message.includes('Cannot find module')) {
    console.log('💡 Bundle não encontrado. Execute: npm run build');
  } else if (error.message.includes('Pool')) {
    console.log('💡 Erro na conexão com o banco de dados');
    console.log('   Verifique a DATABASE_URL no .env.supabase');
  }
}