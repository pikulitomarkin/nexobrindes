import type { IStorage } from '../storage.js';
import type { Order, BudgetItem, Product, Client, User, ProductionOrder, Payment } from '../../shared/schema.js';

export type EnrichedOrder = Order & {
  clientName: string;
  vendorName: string;
  producerName: string | null;
  budgetPhotos: string[];
  budgetItems: Array<BudgetItem & { product: { name: string; description: string; category: string; imageLink: string } }>;
  hasUnreadNotes?: boolean;
  payments?: Payment[];
  paidValue?: string | null;
  remainingValue?: string | null;
  estimatedDelivery?: Date | null;
  budgetInfo?: any;
};

export type EnrichOptions = {
  includeUnreadNotes?: boolean;
  includePayments?: boolean;
  includeDetailedFinancials?: boolean;
};

export class OrderEnrichmentService {
  private storage: IStorage;
  
  private userCache: Map<string, User | undefined>;
  private clientCache: Map<string, Client | undefined>;
  private productCache: Map<string, Product | undefined>;
  private budgetPhotosCache: Map<string, string[]>;
  private budgetItemsCache: Map<string, Array<BudgetItem & { product: any }>>;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.userCache = new Map();
    this.clientCache = new Map();
    this.productCache = new Map();
    this.budgetPhotosCache = new Map();
    this.budgetItemsCache = new Map();
  }

  private async getUserCached(userId: string): Promise<User | undefined> {
    if (!this.userCache.has(userId)) {
      const user = await this.storage.getUser(userId);
      this.userCache.set(userId, user);
    }
    return this.userCache.get(userId);
  }

  private async getClientCached(clientId: string): Promise<Client | undefined> {
    if (!this.clientCache.has(clientId)) {
      const client = await this.storage.getClient(clientId);
      this.clientCache.set(clientId, client);
    }
    return this.clientCache.get(clientId);
  }

  private async getProductCached(productId: string): Promise<Product | undefined> {
    if (!this.productCache.has(productId)) {
      const product = await this.storage.getProduct(productId);
      this.productCache.set(productId, product);
    }
    return this.productCache.get(productId);
  }

  private async getBudgetPhotosCached(budgetId: string): Promise<string[]> {
    if (!this.budgetPhotosCache.has(budgetId)) {
      const photos = await this.storage.getBudgetPhotos(budgetId);
      const photoUrls = photos.map(photo => photo.imageUrl || photo.photoUrl);
      this.budgetPhotosCache.set(budgetId, photoUrls);
    }
    return this.budgetPhotosCache.get(budgetId)!;
  }

  private async getBudgetItemsCached(budgetId: string): Promise<Array<BudgetItem & { product: any }>> {
    if (!this.budgetItemsCache.has(budgetId)) {
      const items = await this.storage.getBudgetItems(budgetId);
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const product = await this.getProductCached(item.productId);
          return {
            ...item,
            product: {
              name: product?.name || 'Produto não encontrado',
              description: product?.description || '',
              category: product?.category || '',
              imageLink: product?.imageLink || ''
            }
          };
        })
      );
      this.budgetItemsCache.set(budgetId, enrichedItems);
    }
    return this.budgetItemsCache.get(budgetId)!;
  }

  async enrichOrder(order: Order, options: EnrichOptions = {}): Promise<EnrichedOrder> {
    // 1. Resolve client name with fallback chain
    let clientName = order.contactName;
    
    if (!clientName && order.clientId) {
      const clientRecord = await this.getClientCached(order.clientId);
      if (clientRecord) {
        clientName = clientRecord.name;
      } else {
        const clientByUserId = await this.storage.getClientByUserId(order.clientId);
        if (clientByUserId) {
          clientName = clientByUserId.name;
        } else {
          const clientUser = await this.getUserCached(order.clientId);
          if (clientUser) {
            clientName = clientUser.name;
          }
        }
      }
    }
    
    if (!clientName) {
      clientName = "Nome não informado";
    }

    // 2. Get vendor name
    const vendor = await this.getUserCached(order.vendorId);

    // Get producer name from production orders if exists
    let producerName: string | null = null;
    const productionOrders = await this.storage.getProductionOrdersByOrder(order.id);
    if (productionOrders.length > 0 && productionOrders[0].producerId) {
      const producer = await this.getUserCached(productionOrders[0].producerId);
      producerName = producer?.name || null;
    }

    // 3. Get budget photos and items
    let budgetPhotos: string[] = [];
    let budgetItems: Array<BudgetItem & { product: any }> = [];
    if (order.budgetId) {
      budgetPhotos = await this.getBudgetPhotosCached(order.budgetId);
      budgetItems = await this.getBudgetItemsCached(order.budgetId);
    }

    // 4. Check for unread notes (optional)
    let hasUnreadNotes = false;
    if (options.includeUnreadNotes && productionOrders.length > 0) {
      hasUnreadNotes = productionOrders.some(po => po.hasUnreadNotes);
    }

    // 5. Get payments and financial details (optional)
    let payments: Payment[] | undefined;
    let paidValue: string | undefined;
    let remainingValue: string | undefined;
    let trackingCode: string | null | undefined;
    let estimatedDelivery: Date | null | undefined;
    let budgetInfo: any;

    if (options.includePayments || options.includeDetailedFinancials) {
      payments = (await this.storage.getPaymentsByOrder(order.id))
        .filter(p => p.status === 'confirmed');
    }

    if (options.includeDetailedFinancials) {
      // Get production order for tracking (reuse if already fetched)
      const productionOrder = productionOrders.length > 0 ? productionOrders[0] : null;
      
      if (productionOrder) {
        trackingCode = order.trackingCode || productionOrder.trackingCode || null;
        estimatedDelivery = productionOrder.deliveryDeadline || null;
      }

      // Calculate paid/remaining values
      if (order.budgetId) {
        const budget = await this.storage.getBudget(order.budgetId);
        const budgetDownPayment = budget?.downPayment ? parseFloat(budget.downPayment) : 0;
        
        budgetInfo = budget ? {
          downPayment: budgetDownPayment,
          totalValue: budget.totalValue ? parseFloat(budget.totalValue) : 0
        } : null;

        const totalPaid = payments?.reduce((sum, p) => {
          const amount = p.amount ? parseFloat(p.amount.toString()) : 0;
          return sum + amount;
        }, 0) || 0;

        const actualPaidValue = totalPaid + budgetDownPayment;
        const totalValue = order.totalValue ? parseFloat(order.totalValue.toString()) : 0;
        const remainingBalance = totalValue - actualPaidValue;

        paidValue = actualPaidValue.toFixed(2);
        remainingValue = remainingBalance.toFixed(2);
      }
    }

    // Build enriched order
    const enriched: EnrichedOrder = {
      ...order,
      clientName,
      vendorName: vendor?.name || 'Vendedor',
      producerName,
      budgetPhotos,
      budgetItems
    };

    if (options.includeUnreadNotes) {
      enriched.hasUnreadNotes = hasUnreadNotes;
    }

    if (options.includePayments) {
      enriched.payments = payments;
    }

    if (options.includeDetailedFinancials) {
      enriched.paidValue = paidValue ?? null;
      enriched.remainingValue = remainingValue ?? null;
      enriched.trackingCode = trackingCode ?? null;
      enriched.estimatedDelivery = estimatedDelivery ?? null;
      enriched.budgetInfo = budgetInfo;
    }

    return enriched;
  }

  async enrichOrders(orders: Order[], options: EnrichOptions = {}): Promise<EnrichedOrder[]> {
    return Promise.all(orders.map(order => this.enrichOrder(order, options)));
  }
}
