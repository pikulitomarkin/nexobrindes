import { storage } from './server/storage';

async function main() {
    const orderNumber = 'PED-1772597270306';

    // Find order
    const orders = await storage.getOrders();
    const order = orders.find(o => o.orderNumber === orderNumber);

    if (!order) {
        console.log('Order not found');
        return;
    }

    console.log('Order:');
    console.log(JSON.stringify(order, null, 2));

    if (order.budgetId) {
        const budgetItems = await storage.getBudgetItems(order.budgetId);
        console.log('Budget Items:');
        console.log(JSON.stringify(budgetItems, null, 2));
    } else {
        console.log('No budget ID');
    }

    process.exit(0);
}

main().catch(console.error);
