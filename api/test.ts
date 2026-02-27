import { db } from "../server/db.js";
import { registerRoutes } from "../server/routes.js";

export default function handler(req: any, res: any) {
    res.status(200).json({
        ok: true,
        msg: "Hello from test lambda! DB: " + !!db + " Routes: " + !!registerRoutes
    });
}
