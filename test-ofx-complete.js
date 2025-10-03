
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testOFXUpload() {
  try {
    console.log("🚀 TESTE COMPLETO DE UPLOAD OFX\n");
    
    const filePath = path.join(__dirname, 'attached_assets', 'Extrato-22-07-2025-a-28-07-2025-OFX_1759509671913.ofx');
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo não encontrado: ${filePath}`);
      return;
    }
    
    console.log("📁 Arquivo encontrado, preparando upload...");
    
    // Criar FormData para simular upload
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    formData.append('file', fileBuffer, {
      filename: 'Extrato-22-07-2025-a-28-07-2025-OFX_1759509671913.ofx',
      contentType: 'application/x-ofx'
    });
    
    console.log("📤 Enviando arquivo para o servidor...");
    
    // Testar endpoints
    const endpoints = [
      'http://localhost:5000/api/finance/ofx-import',
      'http://localhost:5000/api/upload-ofx'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔗 Testando endpoint: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders()
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        const result = await response.json();
        
        if (response.ok) {
          console.log("✅ Upload realizado com sucesso!");
          console.log(`🎉 Resultado:`, JSON.stringify(result, null, 2));
        } else {
          console.log("❌ Erro no upload:");
          console.log(`🔍 Detalhes:`, JSON.stringify(result, null, 2));
        }
        
      } catch (error) {
        console.log(`❌ Erro na requisição para ${endpoint}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  }
}

// Aguardar um pouco para o servidor iniciar
setTimeout(testOFXUpload, 3000);
