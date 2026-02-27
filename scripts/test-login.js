import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env.supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.supabase') });

async function testLogin() {
  console.log('🔐 Testando login do usuário admin...');
  
  const loginData = {
    username: 'admin',
    password: '123456'
  };

  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Login bem-sucedido!');
      console.log(`👤 Usuário: ${data.user?.username || 'N/A'}`);
      console.log(`🎭 Role: ${data.user?.role || 'N/A'}`);
      console.log(`🔑 Token: ${data.token?.substring(0, 30)}...`);
      console.log('\n💡 O sistema está funcionando corretamente com o Supabase!');
      return true;
    } else {
      console.log('❌ Login falhou');
      console.log(`📝 Erro: ${data.error || data.message || 'Desconhecido'}`);
      
      if (response.status === 500) {
        console.log('\n🔧 Possíveis causas:');
        console.log('   1. Servidor não está rodando (execute: npm run dev)');
        console.log('   2. Banco de dados não conectado');
        console.log('   3. Tabela users vazia ou estrutura incorreta');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 O servidor local não está rodando.');
      console.log('   Execute o servidor primeiro:');
      console.log('   $env:DATABASE_URL="sua-url-supabase"; npm run dev');
    }
    return false;
  }
}

async function main() {
  // Verificar se o servidor está rodando primeiro
  console.log('🔄 Verificando se o servidor está disponível...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const healthCheck = await fetch('http://localhost:5000/api/health', { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (healthCheck.ok) {
      console.log('✅ Servidor está rodando na porta 5000');
      await testLogin();
    } else {
      console.log('⚠️  Servidor respondeu com erro:', healthCheck.status);
      console.log('   Mas tentando login mesmo assim...');
      await testLogin();
    }
  } catch (error) {
    console.log('❌ Não foi possível conectar ao servidor local.');
    console.log('💡 Execute o servidor primeiro com:');
    console.log('   $env:DATABASE_URL="postgresql://postgres.chdmycfidnsgvrpsndta:ATtcmqmnckpWoN8e@aws-0-us-west-2.pooler.supabase.com:6543/postgres"');
    console.log('   $env:JWT_SECRET="cbf0d4f26cb2560c72b0664895a49cf884a5f9e6ba83f47a8491835af8b36c5f"');
    console.log('   npm run dev');
  }
}

// Executar a função principal
main().catch(console.error);