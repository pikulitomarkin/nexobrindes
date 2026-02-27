import { pg } from './server/pgClient.js';
import { sql } from 'drizzle-orm';

async function checkColumns() {
    try {
        const result = await pg.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error checking columns:', error);
    } finally {
        process.exit(0);
    }
}

checkColumns();
