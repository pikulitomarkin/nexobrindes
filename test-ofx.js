
const fs = require('fs');
const path = require('path');

// Helper function to extract field values from OFX content
function extractOFXField(content, fieldName) {
  const startTag = `<${fieldName}>`;
  const endTag = `</${fieldName}>`;
  
  const startIndex = content.indexOf(startTag);
  if (startIndex === -1) return '';
  
  const valueStart = startIndex + startTag.length;
  const endIndex = content.indexOf(endTag, valueStart);
  
  if (endIndex === -1) {
    // If no closing tag, look for next opening tag or newline
    const nextTag = content.indexOf('<', valueStart);
    const nextNewline = content.indexOf('\n', valueStart);
    const valueEnd = nextTag > -1 && nextNewline > -1 ? Math.min(nextTag, nextNewline) : 
                   nextTag > -1 ? nextTag : nextNewline > -1 ? nextNewline : content.length;
    return content.substring(valueStart, valueEnd).trim();
  }
  
  return content.substring(valueStart, endIndex).trim();
}

// Helper function to extract transactions from OFX content
function extractOFXTransactions(ofxContent) {
  const transactions = [];
  
  try {
    console.log("🔄 Iniciando parsing do arquivo OFX...");
    
    // Simple OFX parsing - look for STMTTRN blocks
    const transactionBlocks = ofxContent.split('<STMTTRN>');
    console.log(`📋 Encontrados ${transactionBlocks.length - 1} blocos de transação`);
    
    for (let i = 1; i < transactionBlocks.length; i++) {
      const block = transactionBlocks[i];
      const endBlock = block.indexOf('</STMTTRN>');
      const transactionData = endBlock > -1 ? block.substring(0, endBlock) : block;
      
      // Extract transaction fields
      const trnType = extractOFXField(transactionData, 'TRNTYPE');
      const datePosted = extractOFXField(transactionData, 'DTPOSTED');
      const amount = extractOFXField(transactionData, 'TRNAMT');
      const fitId = extractOFXField(transactionData, 'FITID');
      const memo = extractOFXField(transactionData, 'MEMO') || extractOFXField(transactionData, 'NAME');
      
      if (fitId && amount && datePosted) {
        // Parse date (format: YYYYMMDD or YYYYMMDDHHMMSS)
        const dateStr = datePosted.substring(0, 8);
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateStr.substring(6, 8));
        
        const transaction = {
          id: fitId,
          date: new Date(year, month, day),
          amount: parseFloat(amount).toFixed(2),
          description: memo || `Transação ${trnType}`,
          type: parseFloat(amount) >= 0 ? 'credit' : 'debit',
          bankRef: fitId,
          trnType: trnType
        };
        
        transactions.push(transaction);
        
        console.log(`✅ Transação ${i}: ${transaction.date.toLocaleDateString('pt-BR')} - R$ ${transaction.amount} - ${transaction.description.substring(0, 50)}...`);
      } else {
        console.log(`❌ Transação ${i} incompleta - FITID: ${fitId}, AMOUNT: ${amount}, DATE: ${datePosted}`);
      }
    }
    
    console.log(`\n🎉 Parsing concluído: ${transactions.length} transações extraídas com sucesso`);
    
    // Mostrar estatísticas
    const credits = transactions.filter(t => t.type === 'credit');
    const debits = transactions.filter(t => t.type === 'debit');
    const totalCredits = credits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalDebits = debits.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    
    console.log(`\n📊 ESTATÍSTICAS:`);
    console.log(`💰 Créditos: ${credits.length} transações - R$ ${totalCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`💸 Débitos: ${debits.length} transações - R$ ${totalDebits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`📈 Saldo líquido: R$ ${(totalCredits - totalDebits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
    return transactions;
    
  } catch (error) {
    console.error("❌ Erro durante o parsing do OFX:", error);
    return [];
  }
}

// Teste principal
function testOFXImport() {
  try {
    console.log("🚀 TESTE DE IMPORTAÇÃO OFX\n");
    
    const filePath = path.join(__dirname, 'attached_assets', 'Extrato-22-07-2025-a-28-07-2025-OFX_1759509671913.ofx');
    
    console.log(`📁 Lendo arquivo: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo não encontrado: ${filePath}`);
      return;
    }
    
    const ofxContent = fs.readFileSync(filePath, 'utf-8');
    console.log(`📄 Arquivo lido com sucesso - ${ofxContent.length} caracteres`);
    
    console.log(`🔍 Preview do conteúdo:`);
    console.log(ofxContent.substring(0, 500) + '...\n');
    
    // Verificar se é um arquivo OFX válido
    if (!ofxContent.includes('<OFX>') && !ofxContent.includes('OFXHEADER')) {
      console.error("❌ Arquivo não parece ser um formato OFX válido");
      return;
    }
    
    console.log("✅ Arquivo OFX válido identificado\n");
    
    // Extrair transações
    const transactions = extractOFXTransactions(ofxContent);
    
    if (transactions.length > 0) {
      console.log("\n🎯 PRIMEIRAS 5 TRANSAÇÕES EXTRAÍDAS:");
      transactions.slice(0, 5).forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.date.toLocaleDateString('pt-BR')} | R$ ${txn.amount} | ${txn.type.toUpperCase()} | ${txn.description}`);
      });
      
      console.log("\n🎯 ÚLTIMAS 5 TRANSAÇÕES EXTRAÍDAS:");
      transactions.slice(-5).forEach((txn, index) => {
        console.log(`${transactions.length - 4 + index}. ${txn.date.toLocaleDateString('pt-BR')} | R$ ${txn.amount} | ${txn.type.toUpperCase()} | ${txn.description}`);
      });
    }
    
    console.log("\n✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log(`🎉 Total de transações processadas: ${transactions.length}`);
    
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  }
}

// Executar o teste
testOFXImport();
