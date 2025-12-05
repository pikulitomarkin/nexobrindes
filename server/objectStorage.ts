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

  async uploadBuffer(buffer: Buffer, folder: string = "uploads", originalFilename: string = ""): Promise<string> {
    // Extract extension from original filename
    const ext = originalFilename ? `.${originalFilename.split('.').pop()}` : '';
    const objectId = `${randomUUID()}${ext}`;
    const objectName = `${folder}/${objectId}`;
    
    const result = await client.uploadFromBytes(objectName, buffer);
    
    if (!result.ok) {
      console.error("Upload failed:", result.error);
      throw new Error(`Failed to upload: ${result.error.message}`);
    }

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
        console.error("Download failed:", result.error);
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
      if (!objectPath.startsWith("/objects/")) {
        throw new ObjectNotFoundError();
      }

      const objectName = objectPath.slice("/objects/".length);
      
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        console.error("Download failed:", result.error);
        throw new ObjectNotFoundError();
      }

      const buffer = result.value[0];
      
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
