
const fetch = require('node-fetch');

async function createLogBackup() {
  try {
    console.log('Iniciando backup automático de logs...');
    
    const response = await fetch('http://0.0.0.0:5000/api/admin/logs/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer system-backup-token' // Token para automação
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Backup criado com sucesso!`);
      console.log(`📊 Logs arquivados: ${result.backup?.logCount || 0}`);
      console.log(`📅 Data do backup: ${new Date().toLocaleDateString('pt-BR')}`);
    } else {
      console.log('⚠️ Backup concluído sem erros, mas sem logs para arquivar');
    }

  } catch (error) {
    console.error('❌ Erro ao criar backup de logs:', error.message);
    process.exit(1);
  }
}

// Executar backup
createLogBackup();
