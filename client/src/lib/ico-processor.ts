// Client-side ICO file processing utilities
// Replaces server-side ICO parsing with browser-compatible version

interface IcoImage {
  width: number;
  height: number;
  data: ArrayBuffer;
  format: 'png' | 'bmp';
}

export class ClientIcoProcessor {
  /**
   * Parse an ICO file and extract individual images
   */
  static async parseIcoFile(file: File): Promise<Record<string, string>> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    if (buffer.length < 6) {
      throw new Error('Invalid ICO file: too small');
    }

    // ICO header parsing
    const view = new DataView(arrayBuffer);
    const reserved = view.getUint16(0, true); // little endian
    const type = view.getUint16(2, true);
    const count = view.getUint16(4, true);

    if (reserved !== 0 || type !== 1) {
      throw new Error('Invalid ICO file: incorrect header');
    }

    if (count === 0 || count > 255) {
      throw new Error('Invalid ICO file: invalid image count');
    }

    const images: IcoImage[] = [];

    // Parse directory entries
    for (let i = 0; i < count; i++) {
      const entryOffset = 6 + (i * 16);
      
      if (entryOffset + 16 > buffer.length) {
        throw new Error('Invalid ICO file: truncated directory entry');
      }

      const entryView = new DataView(arrayBuffer, entryOffset, 16);
      const width = entryView.getUint8(0) || 256;
      const height = entryView.getUint8(1) || 256;
      const imageSize = entryView.getUint32(8, true);
      const imageOffset = entryView.getUint32(12, true);

      if (imageOffset + imageSize > buffer.length) {
        throw new Error('Invalid ICO file: image data out of bounds');
      }

      // Extract image data
      const imageData = arrayBuffer.slice(imageOffset, imageOffset + imageSize);
      const imageBuffer = new Uint8Array(imageData);
      
      // Determine format by checking magic bytes
      let format: 'png' | 'bmp' = 'bmp';
      if (imageBuffer.length >= 8 && 
          imageBuffer[0] === 0x89 && 
          imageBuffer[1] === 0x50 && 
          imageBuffer[2] === 0x4E && 
          imageBuffer[3] === 0x47) {
        format = 'png';
      }

      images.push({
        width,
        height,
        data: imageData,
        format
      });
    }

    // Convert images to data URLs for each target size
    const targetSizes = [16, 20, 24, 32, 40, 64, 256];
    const sizeImages: Record<string, string> = {};

    for (const targetSize of targetSizes) {
      const bestMatch = this.getBestMatch(images, targetSize);
      if (bestMatch) {
        try {
          let dataUrl: string;
          
          if (bestMatch.format === 'png') {
            // PNG can be used directly
            const blob = new Blob([bestMatch.data], { type: 'image/png' });
            dataUrl = await this.blobToDataURL(blob);
          } else {
            // BMP needs conversion - load on canvas and convert to PNG
            dataUrl = await this.convertBmpToPng(bestMatch.data, bestMatch.width, bestMatch.height, targetSize);
          }
          
          sizeImages[targetSize.toString()] = dataUrl;
        } catch (error) {
          console.error(`Failed to process image for size ${targetSize}:`, error);
        }
      }
    }

    return sizeImages;
  }

  /**
   * Find the best matching image for a target size
   */
  private static getBestMatch(images: IcoImage[], targetSize: number): IcoImage | null {
    if (images.length === 0) return null;

    // First, try to find exact match
    const exactMatch = images.find(img => img.width === targetSize && img.height === targetSize);
    if (exactMatch) return exactMatch;

    // Find the smallest image that's larger than target
    const largerImages = images.filter(img => img.width >= targetSize && img.height >= targetSize);
    if (largerImages.length > 0) {
      return largerImages.reduce((best, current) => 
        (current.width * current.height) < (best.width * best.height) ? current : best
      );
    }

    // If no larger image, use the largest available
    return images.reduce((best, current) => 
      (current.width * current.height) > (best.width * best.height) ? current : best
    );
  }

  /**
   * Convert BMP data to PNG using canvas
   */
  private static async convertBmpToPng(bmpData: ArrayBuffer, width: number, height: number, targetSize: number): Promise<string> {
    // Create a temporary image element to load the BMP
    const blob = new Blob([bmpData], { type: 'image/bmp' });
    const url = URL.createObjectURL(blob);
    
    try {
      const img = await this.loadImage(url);
      
      // Create canvas and resize to target size
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d')!;
      
      // Draw image scaled to target size
      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      
      // Convert to data URL
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Load image from URL
   */
  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Convert blob to data URL
   */
  private static blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}