import { pg } from './pgClient.js';
import { 
  users, clients, vendors, orders, productionOrders, 
  payments, producerPayments, commissions, partners,
  budgets, budgetItems, budgetPhotos, budgetPaymentInfo,
  accountsReceivable, paymentAllocations, bankImports, bankTransactions,
  expenseNotes, commissionPayouts, products, quoteRequests, quoteRequestItems,
  systemLogs, branches, paymentMethods, shippingMethods, customizationOptions,
  commissionSettings
} from '../shared/schema.js';

/**
 * ⚠️ SCRIPT DE RESET DO BANCO - USE COM CAUTELA! ⚠️
 * 
 * Este script DELETA TODOS OS DADOS do banco e recria apenas dados essenciais.
 * 
 * USO:
 * 1. Acesse o console do banco de PRODUÇÃO no Replit
 * 2. Execute: npx tsx server/reset-production.ts
 * 3. Confirme quando solicitado
 * 
 * DADOS QUE SERÃO DELETADOS:
 * - Todos os usuários (exceto admin que será recriado)
 * - Todos os clientes, vendedores, produtores
 * - Todos os pedidos e ordens de produção
 * - Todos os pagamentos e comissões
 * - Todos os orçamentos e produtos
 * 
 * DADOS QUE SERÃO CRIADOS:
 * - 1 usuário admin (username: admin, password: 123456)
 * - 1 branch matriz
 * - 4 métodos de pagamento padrão
 * - 4 métodos de envio padrão
 * - Configurações de comissão padrão
 */

async function resetDatabase() {
  console.log("\n⚠️  ATENÇÃO: RESET DE BANCO DE DADOS ⚠️\n");
  console.log("Este script irá DELETAR TODOS OS DADOS do banco atual!");
  console.log("Certifique-se de estar executando no ambiente correto.\n");
  
  // Em produção, pedir confirmação
  if (process.env.NODE_ENV === 'production') {
    console.log("❌ BLOQUEADO: Este script não pode ser executado com NODE_ENV=production");
    console.log("Para executar, remova temporariamente a variável NODE_ENV.");
    process.exit(1);
  }
  
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 50) + "...\n");
  console.log("Executando reset...\n");

  try {
    console.log("🗑️  Deletando todos os dados...\n");

    // Ordem de deleção respeitando foreign keys
    console.log("  - Deletando logs do sistema...");
    await pg.delete(systemLogs);
    
    console.log("  - Deletando itens de requisições de cotação...");
    await pg.delete(quoteRequestItems);
    
    console.log("  - Deletando requisições de cotação...");
    await pg.delete(quoteRequests);
    
    console.log("  - Deletando pagamentos de comissão...");
    await pg.delete(commissionPayouts);
    
    console.log("  - Deletando notas de despesa...");
    await pg.delete(expenseNotes);
    
    console.log("  - Deletando transações bancárias...");
    await pg.delete(bankTransactions);
    
    console.log("  - Deletando importações bancárias...");
    await pg.delete(bankImports);
    
    console.log("  - Deletando alocações de pagamento...");
    await pg.delete(paymentAllocations);
    
    console.log("  - Deletando pagamentos de produtores...");
    await pg.delete(producerPayments);
    
    console.log("  - Deletando ordens de produção...");
    await pg.delete(productionOrders);
    
    console.log("  - Deletando pagamentos...");
    await pg.delete(payments);
    
    console.log("  - Deletando contas a receber...");
    await pg.delete(accountsReceivable);
    
    console.log("  - Deletando comissões...");
    await pg.delete(commissions);
    
    console.log("  - Deletando pedidos...");
    await pg.delete(orders);
    
    console.log("  - Deletando informações de pagamento de orçamentos...");
    await pg.delete(budgetPaymentInfo);
    
    console.log("  - Deletando fotos de orçamentos...");
    await pg.delete(budgetPhotos);
    
    console.log("  - Deletando itens de orçamentos...");
    await pg.delete(budgetItems);
    
    console.log("  - Deletando orçamentos...");
    await pg.delete(budgets);
    
    console.log("  - Deletando produtos...");
    await pg.delete(products);
    
    console.log("  - Deletando comissões...");
    await pg.delete(commissions);
    
    console.log("  - Deletando parceiros...");
    await pg.delete(partners);
    
    console.log("  - Deletando clientes...");
    await pg.delete(clients);
    
    console.log("  - Deletando vendedores...");
    await pg.delete(vendors);
    
    console.log("  - Deletando usuários...");
    await pg.delete(users);
    
    console.log("  - Deletando configurações de comissão...");
    await pg.delete(commissionSettings);
    
    console.log("  - Deletando opções de customização...");
    await pg.delete(customizationOptions);
    
    console.log("  - Deletando métodos de envio...");
    await pg.delete(shippingMethods);
    
    console.log("  - Deletando métodos de pagamento...");
    await pg.delete(paymentMethods);
    
    console.log("  - Deletando branches...");
    await pg.delete(branches);

    console.log("\n✅ Todos os dados foram deletados!\n");

    // Criar dados essenciais
    console.log("🌱 Criando dados essenciais...\n");

    console.log("  - Criando usuário admin...");
    await pg.insert(users).values({
      username: "admin",
      password: "123456",
      role: "admin",
      name: "Administrador",
      email: "admin@sistema.com",
      phone: null,
      vendorId: null,
      isActive: true
    });

    console.log("  - Criando branch matriz...");
    await pg.insert(branches).values({
      name: "Matriz",
      city: "São Paulo",
      isHeadquarters: true,
      isActive: true
    });

    console.log("  - Criando métodos de pagamento...");
    await pg.insert(paymentMethods).values([
      {
        name: "PIX",
        type: "pix",
        maxInstallments: 1,
        installmentInterest: "0.00",
        isActive: true
      },
      {
        name: "Cartão de Crédito",
        type: "credit_card",
        maxInstallments: 12,
        installmentInterest: "2.50",
        isActive: true
      },
      {
        name: "Boleto Bancário",
        type: "boleto",
        maxInstallments: 1,
        installmentInterest: "0.00",
        isActive: true
      },
      {
        name: "Transferência Bancária",
        type: "transfer",
        maxInstallments: 1,
        installmentInterest: "0.00",
        isActive: true
      }
    ]);

    console.log("  - Criando métodos de envio...");
    await pg.insert(shippingMethods).values([
      {
        name: "Correios PAC",
        type: "calculated",
        basePrice: "0.00",
        freeShippingThreshold: "200.00",
        estimatedDays: 8,
        isActive: true
      },
      {
        name: "Correios SEDEX",
        type: "calculated",
        basePrice: "0.00",
        freeShippingThreshold: "300.00",
        estimatedDays: 3,
        isActive: true
      },
      {
        name: "Entrega Própria",
        type: "fixed",
        basePrice: "50.00",
        freeShippingThreshold: "500.00",
        estimatedDays: 1,
        isActive: true
      },
      {
        name: "Retirada no Local",
        type: "free",
        basePrice: "0.00",
        freeShippingThreshold: "0.00",
        estimatedDays: 0,
        isActive: true
      }
    ]);

    console.log("  - Criando configurações de comissão...");
    await pg.insert(commissionSettings).values({
      vendorCommissionRate: "10.00",
      partnerCommissionRate: "15.00",
      vendorPaymentTiming: "order_completion",
      partnerPaymentTiming: "order_start",
      isActive: true
    });

    console.log("\n✅ Reset concluído com sucesso!\n");
    console.log("📊 Dados criados:");
    console.log("  - 1 usuário admin");
    console.log("  - 1 branch matriz");
    console.log("  - 4 métodos de pagamento");
    console.log("  - 4 métodos de envio");
    console.log("  - Configurações de comissão\n");
    console.log("🔑 Credenciais de acesso:");
    console.log("  Usuário: admin");
    console.log("  Senha: 123456\n");

  } catch (error) {
    console.error("\n❌ Erro ao resetar banco:", error);
    throw error;
  }
}

// Executar reset
resetDatabase()
  .then(() => {
    console.log("✅ Processo finalizado.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  });
