
const fs = require('fs');
const path = require('path');

// Cópia das funções do servidor para teste direto
function extractOFXField(content, fieldName) {
  const startTag = `<${fieldName}>`;
  const endTag = `</${fieldName}>`;
  
  const startIndex = content.indexOf(startTag);
  if (startIndex === -1) return '';
  
  const valueStart = startIndex + startTag.length;
  const endIndex = content.indexOf(endTag, valueStart);
  
  if (endIndex === -1) {
    const nextTag = content.indexOf('<', valueStart);
    const nextNewline = content.indexOf('\n', valueStart);
    const valueEnd = nextTag > -1 && nextNewline > -1 ? Math.min(nextTag, nextNewline) : 
                   nextTag > -1 ? nextTag : nextNewline > -1 ? nextNewline : content.length;
    return content.substring(valueStart, valueEnd).trim();
  }
  
  return content.substring(valueStart, endIndex).trim();
}

function extractOFXTransactions(ofxContent) {
  const transactions = [];
  
  try {
    console.log("🔄 Iniciando parsing do arquivo OFX...");
    
    if (!ofxContent.includes('<OFX>') && !ofxContent.includes('OFXHEADER')) {
      console.log("❌ Arquivo não parece ser um formato OFX válido");
      return transactions;
    }
    
    const transactionBlocks = ofxContent.split('<STMTTRN>');
    console.log(`📋 Encontrados ${transactionBlocks.length - 1} blocos de transação`);
    
    for (let i = 1; i < transactionBlocks.length; i++) {
      const block = transactionBlocks[i];
      const endBlock = block.indexOf('</STMTTRN>');
      const transactionData = endBlock > -1 ? block.substring(0, endBlock) : block;
      
      const trnType = extractOFXField(transactionData, 'TRNTYPE');
      const datePosted = extractOFXField(transactionData, 'DTPOSTED');
      const amount = extractOFXField(transactionData, 'TRNAMT');
      const fitId = extractOFXField(transactionData, 'FITID');
      const memo = extractOFXField(transactionData, 'MEMO') || extractOFXField(transactionData, 'NAME');
      
      if (fitId && amount && datePosted) {
        const dateStr = datePosted.substring(0, 8);
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
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
        
        if (i <= 3) {
          console.log(`✅ Transação ${i}: ${transaction.date.toLocaleDateString('pt-BR')} - R$ ${transaction.amount} - ${transaction.description.substring(0, 50)}...`);
        }
      }
    }
    
    const credits = transactions.filter(t => t.type === 'credit');
    const debits = transactions.filter(t => t.type === 'debit');
    const totalCredits = credits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalDebits = debits.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    
    console.log(`🎉 Parsing OFX concluído: ${transactions.length} transações extraídas`);
    console.log(`💰 Créditos: ${credits.length} - R$ ${totalCredits.toFixed(2)}`);
    console.log(`💸 Débitos: ${debits.length} - R$ ${totalDebits.toFixed(2)}`);
    
    return transactions;
    
  } catch (error) {
    console.error("❌ Erro durante parsing OFX:", error);
    return [];
  }
}

function testDirectOFX() {
  console.log("🧪 TESTE DIRETO DA LÓGICA OFX\n");
  
  const filePath = path.join(__dirname, 'attached_assets', 'Extrato-22-07-2025-a-28-07-2025-OFX_1759509671913.ofx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    return;
  }
  
  const ofxContent = fs.readFileSync(filePath, 'utf-8');
  console.log(`📄 Arquivo lido: ${ofxContent.length} caracteres\n`);
  
  const transactions = extractOFXTransactions(ofxContent);
  
  if (transactions.length > 0) {
    console.log("\n🔍 ANÁLISE DETALHADA DAS TRANSAÇÕES:");
    
    // Agrupar por tipo
    const creditTransactions = transactions.filter(t => t.type === 'credit');
    const debitTransactions = transactions.filter(t => t.type === 'debit');
    
    console.log(`\n💰 CRÉDITOS (${creditTransactions.length} transações):`);
    creditTransactions.slice(0, 5).forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.date.toLocaleDateString('pt-BR')} | R$ ${txn.amount} | ${txn.description}`);
    });
    
    console.log(`\n💸 DÉBITOS (${debitTransactions.length} transações):`);
    debitTransactions.slice(0, 5).forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.date.toLocaleDateString('pt-BR')} | R$ ${txn.amount} | ${txn.description}`);
    });
    
    // Verificar se há pagamentos potenciais para produtores
    const potentialProducerPayments = debitTransactions.filter(txn => 
      txn.description.toLowerCase().includes('pix') ||
      txn.description.toLowerCase().includes('pagamento') ||
      parseFloat(txn.amount) < -500 // Pagamentos grandes
    );
    
    console.log(`\n🏭 POSSÍVEIS PAGAMENTOS DE PRODUTORES (${potentialProducerPayments.length} transações):`);
    potentialProducerPayments.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.date.toLocaleDateString('pt-BR')} | R$ ${txn.amount} | ${txn.description}`);
    });
    
    console.log("\n✅ TESTE DIRETO CONCLUÍDO COM SUCESSO!");
    console.log(`📊 RESUMO: ${transactions.length} transações processadas`);
    console.log(`💰 ${creditTransactions.length} créditos | 💸 ${debitTransactions.length} débitos`);
    console.log(`🏭 ${potentialProducerPayments.length} possíveis pagamentos de produtores identificados`);
    
  } else {
    console.log("❌ Nenhuma transação foi extraída");
  }
}

testDirectOFX();
