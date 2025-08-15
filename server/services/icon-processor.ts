import sharp from "sharp";
import { createWriteStream, promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export class IconProcessor {
  private static readonly ICON_SIZES = [16, 20, 24, 32, 40, 64, 256];

  public static async processIcons(imageBuffers: Record<string, Buffer>): Promise<Buffer> {
    // Create temporary directory
    const tempDir = join(tmpdir(), `icon-processing-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Process each size and create PNG files
      const pngFiles: Array<{ size: number; path: string }> = [];

      for (const [sizeStr, buffer] of Object.entries(imageBuffers)) {
        const size = parseInt(sizeStr);
        if (this.ICON_SIZES.includes(size)) {
          const outputPath = join(tempDir, `icon_${size}.png`);
          
          await sharp(buffer)
            .resize(size, size, { 
              kernel: sharp.kernel.nearest,
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(outputPath);

          pngFiles.push({ size, path: outputPath });
        }
      }

      // Sort by size (ICO format expects this order)
      pngFiles.sort((a, b) => a.size - b.size);

      // Create ICO file manually since sharp doesn't support ICO output
      const icoBuffer = await this.createICOFromPNGs(pngFiles);

      return icoBuffer;
    } finally {
      // Cleanup temporary directory
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch (error) {
        console.warn("Failed to cleanup temp directory:", error);
      }
    }
  }

  public static async createZipFromPNGs(imageBuffers: Record<string, Buffer>): Promise<Buffer> {
    const JSZip = require('jszip');
    const zip = new JSZip();

    for (const [sizeStr, buffer] of Object.entries(imageBuffers)) {
      const size = parseInt(sizeStr);
      if (this.ICON_SIZES.includes(size)) {
        // Process the image to ensure it's properly sized
        const pngBuffer = await sharp(buffer)
          .resize(size, size, { 
            kernel: sharp.kernel.nearest,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();

        zip.file(`icon_${size}x${size}.png`, pngBuffer);
      }
    }

    return zip.generateAsync({ type: "nodebuffer" });
  }

  private static async createICOFromPNGs(pngFiles: Array<{ size: number; path: string }>): Promise<Buffer> {
    // ICO file format implementation
    const iconDir: Buffer[] = [];
    const iconImages: Buffer[] = [];
    let imageOffset = 6 + (pngFiles.length * 16); // Header + directory entries

    // ICO Header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);           // Reserved (0)
    header.writeUInt16LE(1, 2);           // Type (1 = ICO)
    header.writeUInt16LE(pngFiles.length, 4); // Number of images

    iconDir.push(header);

    for (const { size, path } of pngFiles) {
      const pngData = await fs.readFile(path);
      
      // Directory entry (16 bytes)
      const dirEntry = Buffer.alloc(16);
      dirEntry.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 = 256)
      dirEntry.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 = 256)
      dirEntry.writeUInt8(0, 2);                         // Color palette (0 = no palette)
      dirEntry.writeUInt8(0, 3);                         // Reserved (0)
      dirEntry.writeUInt16LE(1, 4);                      // Color planes (1)
      dirEntry.writeUInt16LE(32, 6);                     // Bits per pixel (32 for PNG)
      dirEntry.writeUInt32LE(pngData.length, 8);         // Image data size
      dirEntry.writeUInt32LE(imageOffset, 12);           // Image data offset

      iconDir.push(dirEntry);
      iconImages.push(pngData);
      imageOffset += pngData.length;
    }

    return Buffer.concat([...iconDir, ...iconImages]);
  }
}
