import { pg } from "./pgClient";
import { users, branches, paymentMethods, shippingMethods, customizationOptions, commissionSettings } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seed script para popular o banco de dados com dados iniciais
 * Executa apenas se as tabelas estiverem vazias
 */
async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    // Verificar se já existem usuários
    const existingUsers = await pg.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log("✅ Banco já contém dados. Seed cancelado.");
      return;
    }

    console.log("📝 Criando usuário admin padrão...");
    
    // Criar usuário admin
    await pg.insert(users).values({
      username: "admin",
      password: "admin123", // Em produção, usar hash de senha!
      role: "admin",
      name: "Administrador",
      email: "admin@sistema.com",
      phone: null,
      vendorId: null,
      isActive: true
    });

    console.log("✅ Usuário admin criado (username: admin, password: admin123)");

    // Criar branch matriz
    console.log("📝 Criando branch matriz...");
    await pg.insert(branches).values({
      name: "Matriz",
      city: "São Paulo",
      isHeadquarters: true,
      isActive: true
    });

    // Criar métodos de pagamento padrão
    console.log("📝 Criando métodos de pagamento...");
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

    // Criar métodos de envio padrão
    console.log("📝 Criando métodos de envio...");
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

    // Criar configurações de comissão padrão
    console.log("📝 Criando configurações de comissão...");
    await pg.insert(commissionSettings).values({
      vendorCommissionRate: "10.00",
      partnerCommissionRate: "15.00",
      vendorPaymentTiming: "order_completion",
      partnerPaymentTiming: "order_start",
      isActive: true
    });

    console.log("✅ Seed concluído com sucesso!");
    console.log("\n📊 Resumo:");
    console.log("  - 1 usuário admin criado");
    console.log("  - 1 branch matriz criada");
    console.log("  - 4 métodos de pagamento criados");
    console.log("  - 4 métodos de envio criados");
    console.log("  - Configurações de comissão criadas");
    console.log("\n🔑 Credenciais de acesso:");
    console.log("  Usuário: admin");
    console.log("  Senha: admin123");

  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  }
}

// Executar seed
seed()
  .then(() => {
    console.log("\n✅ Processo de seed finalizado.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro fatal no seed:", error);
    process.exit(1);
  });
