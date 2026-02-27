import fetch from 'node-fetch';

async function testLogin() {
    console.log('Testando login em nexobrindes.vercel.app...');
    try {
        const res = await fetch('https://nexobrindes.vercel.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: '123' })
        });

        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${text}`);
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
}

testLogin();
