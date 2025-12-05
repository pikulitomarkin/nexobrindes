import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const client = new Client();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async uploadBuffer(buffer: Buffer, folder: string = "uploads", contentType: string = "application/octet-stream"): Promise<string> {
    const objectId = randomUUID();
    const objectName = `${folder}/${objectId}`;
    
    await client.uploadFromBytes(objectName, buffer, {
      contentType: contentType,
    });

    console.log(`File uploaded to Object Storage: ${objectName}`);
    return `/objects/${objectName}`;
  }

  async getObject(objectPath: string): Promise<Buffer> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const objectName = objectPath.slice("/objects/".length);
    
    try {
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        throw new ObjectNotFoundError();
      }
      return Buffer.from(result.value);
    } catch (error) {
      console.error("Error downloading object:", error);
      throw new ObjectNotFoundError();
    }
  }

  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (!objectPath.startsWith("/objects/")) {
        throw new ObjectNotFoundError();
      }

      const objectName = objectPath.slice("/objects/".length);
      
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        throw new ObjectNotFoundError();
      }

      const buffer = Buffer.from(result.value);
      
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
      const contentType = mimeTypes[ext] || 'application/octet-stream';

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
      const result = await client.exists(objectName);
      return result.ok && result.value;
    } catch (error) {
      return false;
    }
  }
}
