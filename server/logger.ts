import { pgStorage } from './storage.pg';

export interface LogEvent {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  level?: 'info' | 'warning' | 'error' | 'success';
  details?: any;
  vendorId?: string;
}

class Logger {
  async log(event: LogEvent): Promise<void> {
    try {
      await pgStorage.logUserAction(
        event.userId,
        event.userName,
        event.userRole,
        event.action,
        event.entity,
        event.entityId,
        event.description,
        event.level || 'info',
        event.details,
        undefined,
        undefined,
        event.vendorId
      );
    } catch (error) {
      console.error('[Logger] Failed to log event (non-blocking):', error);
    }
  }

  async logBudgetCreated(vendorId: string, vendorName: string, budgetId: string, clientName: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'CREATE',
      entity: 'budget',
      entityId: budgetId,
      description: `Orçamento criado para cliente ${clientName}`,
      level: 'success'
    });
  }

  async logBudgetSent(vendorId: string, vendorName: string, budgetId: string, clientName: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'SEND',
      entity: 'budget',
      entityId: budgetId,
      description: `Orçamento enviado para cliente ${clientName}`,
      level: 'info'
    });
  }

  async logBudgetUpdated(vendorId: string, vendorName: string, budgetId: string, changes: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'UPDATE',
      entity: 'budget',
      entityId: budgetId,
      description: `Orçamento atualizado: ${changes}`,
      level: 'info'
    });
  }

  async logOrderCreated(vendorId: string, vendorName: string, orderId: string, clientName: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'CREATE',
      entity: 'order',
      entityId: orderId,
      description: `Pedido criado para cliente ${clientName}`,
      level: 'success'
    });
  }

  async logOrderUpdated(vendorId: string, vendorName: string, orderId: string, changes: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'UPDATE',
      entity: 'order',
      entityId: orderId,
      description: `Pedido atualizado: ${changes}`,
      level: 'info'
    });
  }

  async logOrderStatusChanged(vendorId: string, vendorName: string, orderId: string, oldStatus: string, newStatus: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'STATUS_CHANGE',
      entity: 'order',
      entityId: orderId,
      description: `Status do pedido alterado de "${oldStatus}" para "${newStatus}"`,
      level: 'info',
      details: { oldStatus, newStatus }
    });
  }

  async logClientCreated(vendorId: string, vendorName: string, clientId: string, clientName: string): Promise<void> {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: 'vendor',
      vendorId: vendorId,
      action: 'CREATE',
      entity: 'client',
      entityId: clientId,
      description: `Cliente ${clientName} cadastrado`,
      level: 'success'
    });
  }

  async logClientAction(clientUserId: string, clientName: string, vendorId: string, action: string, entity: string, entityId: string, description: string): Promise<void> {
    await this.log({
      userId: clientUserId,
      userName: clientName,
      userRole: 'client',
      action,
      entity,
      entityId,
      description,
      level: 'info',
      vendorId
    });
  }

  async logBudgetApprovedByClient(clientUserId: string, clientName: string, vendorId: string, budgetId: string): Promise<void> {
    await this.logClientAction(
      clientUserId,
      clientName,
      vendorId,
      'APPROVE',
      'budget',
      budgetId,
      `Cliente ${clientName} aprovou o orçamento`
    );
  }

  async logBudgetRejectedByClient(clientUserId: string, clientName: string, vendorId: string, budgetId: string): Promise<void> {
    await this.logClientAction(
      clientUserId,
      clientName,
      vendorId,
      'REJECT',
      'budget',
      budgetId,
      `Cliente ${clientName} rejeitou o orçamento`
    );
  }

  async logProductionOrderCreated(userId: string, userName: string, userRole: string, poId: string, producerName: string, orderId: string): Promise<void> {
    await this.log({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'production_order',
      entityId: poId,
      description: `Ordem de produção enviada para ${producerName}`,
      level: 'success',
      details: { orderId, producerName }
    });
  }

  async logPaymentReceived(userId: string, userName: string, userRole: string, orderId: string, amount: string, clientName: string): Promise<void> {
    await this.log({
      userId,
      userName,
      userRole,
      action: 'PAYMENT',
      entity: 'order',
      entityId: orderId,
      description: `Pagamento de R$ ${amount} recebido do cliente ${clientName}`,
      level: 'success',
      details: { amount, clientName }
    });
  }

  async logAdminAction(adminId: string, adminName: string, action: string, entity: string, entityId: string, description: string): Promise<void> {
    await this.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action,
      entity,
      entityId,
      description,
      level: 'info'
    });
  }
}

export const logger = new Logger();
