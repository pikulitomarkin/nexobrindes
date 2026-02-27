// This file is a placeholder - it gets overwritten during build by:
// esbuild api/_handler.ts --platform=node --packages=external --bundle --format=esm --outfile=api/index.js
// The actual bundled code will be deployed by Vercel as a serverless function.
export default async function handler(req, res) {
    res.status(503).json({ error: 'Build not completed' });
}
