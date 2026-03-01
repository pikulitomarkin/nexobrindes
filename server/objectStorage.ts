import { Response } from "express";
import { randomUUID } from "crypto";

const isReplit = process.env.REPL_ID !== undefined;

let client: any = null;

if (isReplit) {
  import("@replit/object-storage").then(module => {
    client = new module.Client();
  }).catch(err => {
    console.warn("Failed to initialize Replit Object Storage client. Will use fallback.", err);
  });
} else {
  console.log("Not running in Replit, Object Storage client will be mocked/bypassed.");
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private _dbInitialized = false;

  constructor() { }

  private async initializeTable() {
    if (this._dbInitialized) return;
    try {
      // Import pooling inside methods to ensure it loads at the right time
      const { pool } = await import('./pgClient.js');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS replit_object_fallback (
          id text PRIMARY KEY,
          mime_type text,
          data text,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this._dbInitialized = true;
    } catch (e) {
      console.error("Failed to initialize object storage fallback table:", e);
    }
  }

  private getMimeTypeFromObjectName(objectName: string): string {
    const ext = objectName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async uploadBuffer(buffer: Buffer, folder: string = "uploads", originalFilename: string = ""): Promise<string> {
    try {
      // Extract extension from original filename
      const ext = originalFilename ? `.${originalFilename.split('.').pop()}` : '';
      const objectId = `${randomUUID()}${ext}`;
      const objectName = `${folder}/${objectId}`;

      console.log(`Attempting to upload: ${objectName}, size: ${buffer.length} bytes`);

      if (!client) {
        await this.initializeTable();
        const { pool } = await import('./pgClient.js');
        const mimeType = this.getMimeTypeFromObjectName(objectName);
        const base64Data = buffer.toString('base64');

        await pool.query(
          'INSERT INTO replit_object_fallback (id, mime_type, data) VALUES ($1, $2, $3)',
          [objectName, mimeType, base64Data]
        );
        console.log(`Fallback: File saved to DB as ${objectName}`);
        return `/api/objects/${objectName}`;
      }

      const result = await client.uploadFromBytes(objectName, buffer);

      if (!result.ok) {
        const errorMessage = result.error?.message || result.error?.toString() || 'Unknown upload error';
        console.error("Object Storage upload failed:", {
          objectName,
          error: result.error,
          errorMessage
        });
        throw new Error(`Failed to upload to Object Storage: ${errorMessage}`);
      }

      console.log(`File uploaded successfully to Object Storage: ${objectName}`);
      return `/api/objects/${objectName}`;
    } catch (error) {
      console.error("Object Storage upload error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Upload failed completely: ${errorMessage}`);
    }
  }

  async getObject(objectPath: string): Promise<Buffer> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const objectName = objectPath.slice("/objects/".length);

    if (!client) {
      await this.initializeTable();
      const { pool } = await import('./pgClient.js');
      const result = await pool.query('SELECT data FROM replit_object_fallback WHERE id = $1', [objectName]);
      if (result.rows.length === 0) throw new ObjectNotFoundError();
      return Buffer.from(result.rows[0].data, 'base64');
    }

    try {
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        console.error("Object Storage download failed:", result.error);
        throw new ObjectNotFoundError();
      }
      return result.value[0];
    } catch (error) {
      console.error("Error downloading object:", error);
      throw new ObjectNotFoundError();
    }
  }

  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (!objectPath.startsWith("/api/objects/")) {
        throw new ObjectNotFoundError();
      }

      const objectName = objectPath.slice("/api/objects/".length);
      let buffer: Buffer;
      let contentType = this.getMimeTypeFromObjectName(objectName);

      if (!client) {
        await this.initializeTable();
        const { pool } = await import('./pgClient.js');
        const result = await pool.query('SELECT mime_type, data FROM replit_object_fallback WHERE id = $1', [objectName]);
        if (result.rows.length === 0) throw new ObjectNotFoundError();

        buffer = Buffer.from(result.rows[0].data, 'base64');
        contentType = result.rows[0].mime_type || contentType;
      } else {
        const result = await client.downloadAsBytes(objectName);
        if (!result.ok) {
          console.error("Object Storage download failed:", result.error);
          throw new ObjectNotFoundError();
        }
        buffer = result.value[0];
      }

      res.set({
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      res.send(buffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async deleteObject(objectPath: string): Promise<boolean> {
    try {
      if (!objectPath.startsWith("/objects/")) {
        return false;
      }
      const objectName = objectPath.slice("/objects/".length);

      if (!client) {
        await this.initializeTable();
        const { pool } = await import('./pgClient.js');
        const result = await pool.query('DELETE FROM replit_object_fallback WHERE id = $1', [objectName]);
        return (result.rowCount || 0) > 0;
      }

      const result = await client.delete(objectName);
      return result.ok;
    } catch (error) {
      console.error("Error deleting object:", error);
      return false;
    }
  }

  async objectExists(objectPath: string): Promise<boolean> {
    try {
      if (!objectPath.startsWith("/objects/")) {
        return false;
      }
      const objectName = objectPath.slice("/objects/".length);

      if (!client) {
        await this.initializeTable();
        const { pool } = await import('./pgClient.js');
        const result = await pool.query('SELECT 1 FROM replit_object_fallback WHERE id = $1', [objectName]);
        return result.rows.length > 0;
      }

      const result = await client.exists(objectName);
      return result.ok && result.value;
    } catch (error) {
      return false;
    }
  }
}
