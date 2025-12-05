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
    try {
      // Extract extension from original filename
      const ext = originalFilename ? `.${originalFilename.split('.').pop()}` : '';
      const objectId = `${randomUUID()}${ext}`;
      const objectName = `${folder}/${objectId}`;
      
      console.log(`Attempting to upload: ${objectName}, size: ${buffer.length} bytes`);
      
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
      return `/objects/${objectName}`;
    } catch (error) {
      console.error("Object Storage upload error:", error);
      
      // Fallback: try to save to local uploads folder for debugging
      const fs = require('fs');
      const path = require('path');
      
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const ext = originalFilename ? `.${originalFilename.split('.').pop()}` : '';
        const filename = `image-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
        const filepath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filepath, buffer);
        console.log(`Fallback: File saved locally as ${filename}`);
        return `/uploads/${filename}`;
      } catch (fallbackError) {
        console.error("Fallback save also failed:", fallbackError);
        throw new Error(`Upload failed completely: ${error.message}`);
      }
    }
  }

  async getObject(objectPath: string): Promise<Buffer> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const objectName = objectPath.slice("/objects/".length);
    
    try {
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        const errorMessage = result.error?.message || result.error?.toString() || 'Unknown download error';
        console.error("Object Storage download failed:", {
          objectName,
          error: result.error,
          errorMessage
        });
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
        const errorMessage = result.error?.message || result.error?.toString() || 'Unknown download error';
        console.error("Object Storage download failed:", {
          objectName,
          error: result.error,
          errorMessage
        });
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
