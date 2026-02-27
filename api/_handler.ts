console.error('[DEBUG VERCEL TOP-LEVEL] Iniciando imports do express');
import express from 'express';
console.error('[DEBUG VERCEL TOP-LEVEL] Express importado');
// Using dynamic imports inside the handler to catch top-level errors (like DB connection fails)
// import { registerRoutes } from '../server/routes';
// import { serveStatic } from '../server/vite';
console.error('[DEBUG VERCEL TOP-LEVEL] Importando dotenv');
import 'dotenv/config';
console.error('[DEBUG VERCEL TOP-LEVEL] Dotenv importado');

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logging middleware (optional)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  console.error(err);
});

// Initialize the app asynchronously
let initializedApp: express.Express | null = null;
let initializationPromise: Promise<express.Express> | null = null;

async function initializeApp(): Promise<express.Express> {
  if (initializedApp) {
    return initializedApp;
  }

  // Prevent multiple initializations
  if (!initializationPromise) {
    initializationPromise = (async () => {
      console.error('[DEBUG VERCEL] 🚀 Initializing Vercel serverless function...');

      try {
        console.error('[DEBUG VERCEL] Importing ../server/routes');
        // Use dynamic imports to catch top-level errors during initialization
        const { registerRoutes } = await import('../server/routes');
        console.error('[DEBUG VERCEL] Importing ../server/vite');
        const { serveStatic } = await import('../server/vite');

        // In Vercel, static files are served automatically from the public directory
        // We'll only use serveStatic if running in development or other environments
        if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
          console.error('[DEBUG VERCEL] 📁 Setting up static file serving for development');
          serveStatic(app);
        }

        // Register all API routes
        console.error('[DEBUG VERCEL] 🔄 Registering API routes... Database URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 'MISSING');
        await registerRoutes(app);

        initializedApp = app;
        console.error('[DEBUG VERCEL] ✅ App initialization complete');
        return initializedApp;
      } catch (err) {
        console.error('[DEBUG VERCEL FATAL] Erro capturado dentro da promise de inicialização:', err);
        throw err;
      }
    })();
  }

  return await initializationPromise;
}

// Vercel serverless function handler
export default async function handler(req: express.Request, res: express.Response) {
  try {
    // Add timeout for initialization (25 seconds max for cold start)
    const initializationTimeout = 25000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Initialization timeout')), initializationTimeout);
    });

    const appInstance = await Promise.race([
      initializeApp(),
      timeoutPromise
    ]) as express.Express;

    return appInstance(req, res);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('❌ Error in Vercel handler:', errorMessage);
    console.error('Stack:', errorStack);

    const isTimeout = errorMessage.includes('timeout');

    res.status(500).json({
      error: 'Internal server error',
      message: isTimeout ? 'Server initialization timeout. Please try again.' : errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}