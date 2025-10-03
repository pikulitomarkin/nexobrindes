import { storage } from "./storage";

async function seed() {
  console.log("Starting database seeding...");

  try {
    // Check if users already exist
    const existingUsers = await storage.getUsers();
    if (existingUsers.length > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }

    // Create admin user
    const admin = await storage.createUser({
      id: "admin-1",
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Administrador",
      email: "admin@empresa.com",
      phone: "(11) 98765-4321",
      isActive: true
    });
    console.log("✓ Admin user created");

    // Create vendor user
    const vendor = await storage.createUser({
      id: "vendor-1",
      username: "vendedor1",
      password: "vendor123",
      role: "vendor",
      name: "João Vendedor",
      email: "vendedor@empresa.com",
      phone: "(11) 91234-5678",
      isActive: true
    });
    console.log("✓ Vendor user created");

    // Create test producer
  const producer1 = await storage.createUser({
    id: "producer-1",
    username: "produtor1",
    password: "producer123",
    role: "producer",
    name: "Marcenaria Santos",
    email: "contato@marcenariasantos.com",
    phone: "(11) 98765-4321",
    specialty: "Móveis sob medida",
    address: "Rua Industrial, 456, Distrito Industrial, São Paulo, SP",
    isActive: true
  });

  console.log("✓ Producer user created");

  // Create test partner
  const partner = await storage.createUser({
    id: "partner-1",
    username: "partner1",
    password: "partner123",
    role: "partner",
    name: "Ana Parceira",
    email: "parceira@empresa.com",
    phone: "(11) 97777-6666",
    isActive: true
  });
  console.log("✓ Partner user created");

    // Create client user
    const clientUser = await storage.createUser({
      id: "client-1",
      username: "cliente1",
      password: "client123",
      role: "client",
      name: "Pedro Cliente",
      email: "cliente@email.com",
      phone: "(11) 98888-7777",
      vendorId: vendor.id,
      isActive: true
    });
    console.log("✓ Client user created");

    // Create vendor record directly in vendors table
    const { db } = await import("./db");
    const { vendors: vendorsTable, partners: partnersTable } = await import("@shared/schema");

    await db.insert(vendorsTable).values({
      userId: vendor.id,
      salesLink: "vendor-joao",
      commissionRate: "10.00",
      isActive: true
    });
    console.log("✓ Vendor record created");

    // Create partner record directly in partners table
    await db.insert(partnersTable).values({
      userId: partner.id,
      commissionRate: "15.00",
      isActive: true
    });
    console.log("✓ Partner record created");

    // Create client record
    const client = await storage.createClient({
      userId: clientUser.id,
      name: "Pedro Cliente",
      email: "cliente@email.com",
      phone: "(11) 98888-7777",
      whatsapp: "(11) 98888-7777",
      cpfCnpj: "123.456.789-00",
      address: "Rua dos Clientes, 456",
      vendorId: vendor.id,
      isActive: true
    });
    console.log("✓ Client record created");

    // Create a sample order
    const order = await storage.createOrder({
      orderNumber: "#12345",
      clientId: client.id,
      vendorId: vendor.id,
      product: "Mesa de Jantar Personalizada",
      description: "Mesa em madeira maciça, 2m x 1m, acabamento natural",
      totalValue: "5000.00",
      paidValue: "1500.00",
      status: "confirmed",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
    console.log("✓ Sample order created");

    // Create production order
    const productionOrder = await storage.createProductionOrder({
      orderId: order.id,
      producerId: producer1.id,
      status: "production",
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      notes: "Aguardando definição de valor pelo produtor"
    });
    console.log("✓ Production order created");

    // Create initial payment
    await storage.createPayment({
      orderId: order.id,
      amount: "1500.00",
      method: "pix",
      status: "confirmed",
      paidAt: new Date()
    });
    console.log("✓ Initial payment created");

    console.log("\n✓ Database seeded successfully!");
    console.log("\nTest Users:");
    console.log("  Admin:    admin / admin123");
    console.log("  Vendor:   vendedor1 / vendor123");
    console.log("  Producer: produtor1 / producer123");
    console.log("  Client:   cliente1 / client123");
    console.log("  Partner:  partner1 / partner123");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed().catch(console.error).finally(() => process.exit());