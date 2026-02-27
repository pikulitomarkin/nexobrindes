const { execSync } = require('child_process');
const fs = require('fs');

async function syncSupabase() {
    const supabaseUrl = "postgresql://postgres.chdmycfidnsgvrpsndta:ATtcmqmnckpWoN8e@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
    console.log("Sincronizando banco Supabase...");

    try {
        // Temporariamente sobrescreve DATABASE_URL para o push
        execSync(`npx drizzle-kit push`, {
            env: {
                ...process.env,
                DATABASE_URL: supabaseUrl
            },
            stdio: 'inherit'
        });
        console.log("✅ Supabase sincronizado com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao sincronizar Supabase:", error.message);
    }
}

syncSupabase();
