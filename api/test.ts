export default function handler(req: any, res: any) {
    res.status(200).json({
        ok: true,
        msg: "Hello from test lambda! The basic Vercel node environment works."
    });
}
