import { db } from "../server/db.js";

export default function handler(req: any, res: any) {
    res.status(200).json({
        ok: true,
        msg: "Hello from test lambda! DB imported: " + !!db
    });
}
