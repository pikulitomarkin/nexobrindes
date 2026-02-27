import(process.cwd() + '/api/index.js').then(async (m) => {
    const handler = m.default;
    console.log("Handler carregado. Tentando executar...");

    const req = {
        method: 'POST',
        path: '/api/auth/login',
        url: '/api/auth/login',
        headers: {},
        body: { username: 'admin', password: '123' },
        get: (key) => ''
    };

    const res = {
        status: (code) => {
            console.log('STATUS:', code);
            return res;
        },
        json: (data) => {
            console.log('JSON:', data);
            return res;
        },
        on: () => { }
    };

    try {
        await handler(req, res);
        console.log("Execução finalizada!");
        process.exit(0);
    } catch (e) {
        console.error("ERRO FATAL CAPTURADO:", e);
        process.exit(1);
    }
}).catch(err => {
    console.error("ERRO AO IMPORTAR BUNDLE:", err);
});
