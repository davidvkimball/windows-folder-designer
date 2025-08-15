// Client-side ICO file processing utilities
// Optimized for serverless deployment on Netlify

interface IcoImage {
  width: number;
  height: number;
  data: ArrayBuffer;
  format: 'png' | 'bmp';
}

export class ClientIcoProcessor {
  /**
   * Validate if a file is a valid ICO file
   */
  static validateIcoFile(file: File): boolean {
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.ico')) {
      return false;
    }
    
    // Check file size (ICO files should be at least 22 bytes for header + directory entry)
    if (file.size < 22) {
      return false;
    }
    
    return true;
  }

  /**
   * Parse an ICO file and extract individual images
   */
  static async parseIcoFile(file: File): Promise<Record<string, string>> {
    console.log("Starting ICO file parsing:", { fileName: file.name, fileSize: file.size });
    
    // Validate the file first
    if (!this.validateIcoFile(file)) {
      throw new Error('Invalid ICO file: file format or size is invalid');
    }
    
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

    console.log("ICO header:", { reserved, type, count, fileSize: buffer.length });

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

      console.log(`Directory entry ${i}:`, { width, height, imageSize, imageOffset });

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

      console.log(`Image ${i} format:`, format);

      images.push({
        width,
        height,
        data: imageData,
        format
      });
    }

    console.log("Parsed images:", images.map(img => ({ width: img.width, height: img.height, format: img.format })));

    // Convert images to data URLs for each target size
    const targetSizes = [16, 20, 24, 32, 40, 64, 256];
    const sizeImages: Record<string, string> = {};

    for (const targetSize of targetSizes) {
      const bestMatch = this.getBestMatch(images, targetSize);
      if (bestMatch) {
        try {
          console.log(`Processing size ${targetSize}px with image:`, { 
            width: bestMatch.width, 
            height: bestMatch.height, 
            format: bestMatch.format,
            dataSize: bestMatch.data.byteLength
          });
          
          // Convert everything to PNG regardless of original format
          const dataUrl = await this.convertToPNG(bestMatch.data, bestMatch.width, bestMatch.height, targetSize);
          sizeImages[targetSize.toString()] = dataUrl;
          console.log(`Successfully created data URL for size ${targetSize}px`);
        } catch (error) {
          console.error(`Failed to process image for size ${targetSize}:`, error);
          // Create a simple fallback image
          const fallbackUrl = await this.createFallbackImage(targetSize);
          sizeImages[targetSize.toString()] = fallbackUrl;
        }
      } else {
        console.warn(`No suitable image found for size ${targetSize}px`);
      }
    }

    console.log("Final size images:", Object.keys(sizeImages));
    return sizeImages;
  }

  /**
   * Convert any image data to PNG at the target size
   */
  private static async convertToPNG(imageData: ArrayBuffer, originalWidth: number, originalHeight: number, targetSize: number): Promise<string> {
    console.log(`Converting image to PNG: ${originalWidth}x${originalHeight} -> ${targetSize}x${targetSize}, data size: ${imageData.byteLength}`);
    
    try {
      // Check if this is actually PNG data by looking at the magic bytes
      const buffer = new Uint8Array(imageData);
      const isPNG = buffer.length >= 8 && 
        buffer[0] === 0x89 && 
        buffer[1] === 0x50 && 
        buffer[2] === 0x4E && 
        buffer[3] === 0x47;
      
      if (isPNG) {
        // PNG can be loaded directly
        console.log(`Detected format: PNG, loading directly`);
        const blob = new Blob([imageData], { type: 'image/png' });
        const dataUrl = await this.blobToDataURL(blob);
        const img = await this.loadImage(dataUrl);
        return await this.resizeImage(img, targetSize);
      } else {
        // BMP needs to be converted to PNG first
        console.log(`Detected format: BMP, converting to PNG`);
        const pngDataUrl = await this.convertBmpToPng(imageData, originalWidth, originalHeight);
        const img = await this.loadImage(pngDataUrl);
        return await this.resizeImage(img, targetSize);
      }
    } catch (error) {
      console.error(`Failed to convert image to PNG:`, error);
      throw error;
    }
  }

  /**
   * Convert BMP data to PNG using canvas
   */
  private static async convertBmpToPng(bmpData: ArrayBuffer, width: number, height: number): Promise<string> {
    console.log(`Converting BMP to PNG: ${width}x${height}`);
    
    try {
      // Create a canvas and draw the BMP data
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // Create an ImageData object from the BMP data
      const imageData = ctx.createImageData(width, height);
      
      // Parse BMP data and convert to RGBA
      const bmpBuffer = new Uint8Array(bmpData);
      const rgbaData = this.parseBmpToRgba(bmpBuffer, width, height);
      
      // Set the image data
      imageData.data.set(rgbaData);
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to PNG data URL
      const pngDataUrl = canvas.toDataURL('image/png');
      console.log(`BMP converted to PNG successfully`);
      return pngDataUrl;
    } catch (error) {
      console.error(`Failed to convert BMP to PNG:`, error);
      throw error;
    }
  }

  /**
   * Parse BMP data to RGBA format
   */
  private static parseBmpToRgba(bmpBuffer: Uint8Array, width: number, height: number): Uint8Array {
    console.log(`Parsing BMP data: ${width}x${height}, buffer size: ${bmpBuffer.length}`);
    
    // ICO BMP data has a different structure than standard BMP files
    // It starts with a BITMAPINFOHEADER (40 bytes) followed by the pixel data
    const rgbaData = new Uint8Array(width * height * 4);
    
    // Skip BITMAPINFOHEADER (40 bytes)
    const headerSize = 40;
    const dataOffset = headerSize;
    
    // Check if we have enough data
    if (dataOffset + width * height * 4 > bmpBuffer.length) {
      console.error(`BMP data too small for ${width}x${height} image`);
      throw new Error(`BMP data too small for ${width}x${height} image`);
    }
    
    // ICO BMP data is stored bottom-up (like standard BMP)
    // and uses BGRA format
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sourceIndex = dataOffset + ((height - 1 - y) * width + x) * 4;
        const targetIndex = (y * width + x) * 4;
        
        // ICO BMP uses BGRA format, convert to RGBA
        rgbaData[targetIndex] = bmpBuffer[sourceIndex + 2];     // R (was B)
        rgbaData[targetIndex + 1] = bmpBuffer[sourceIndex + 1]; // G
        rgbaData[targetIndex + 2] = bmpBuffer[sourceIndex];     // B (was R)
        rgbaData[targetIndex + 3] = bmpBuffer[sourceIndex + 3]; // A
      }
    }
    
    console.log(`BMP parsing completed successfully`);
    return rgbaData;
  }

  /**
   * Resize an image to target size
   */
  private static async resizeImage(img: HTMLImageElement, targetSize: number): Promise<string> {
    console.log(`Resizing image to ${targetSize}x${targetSize}`);
    
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, targetSize, targetSize);
    
    // Draw image scaled to target size
    ctx.drawImage(img, 0, 0, targetSize, targetSize);
    
    const dataUrl = canvas.toDataURL('image/png');
    console.log(`Canvas resized successfully, data URL length: ${dataUrl.length}`);
    return dataUrl;
  }

  /**
   * Create a fallback image when conversion fails
   */
  private static async createFallbackImage(targetSize: number): Promise<string> {
    console.log(`Creating fallback image for size ${targetSize}px`);
    
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d')!;
    
    // Create a simple colored square as fallback
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    // Add a simple icon pattern
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(targetSize * 0.2, targetSize * 0.2, targetSize * 0.6, targetSize * 0.6);
    
    return canvas.toDataURL('image/png');
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
   * Load image from URL
   */
  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error("Failed to load image:", error);
        reject(new Error(`Failed to load image from URL: ${error}`));
      };
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
      reader.onerror = (error) => {
        console.error("Failed to read blob:", error);
        reject(new Error(`Failed to convert blob to data URL: ${error}`));
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Test function to verify ICO processing works
   */
  static async testIcoProcessing(): Promise<void> {
    console.log("Testing ICO processing...");
    
    try {
      // Read the test ICO file
      const response = await fetch('/test-icon.ico');
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], 'test-icon.ico', { type: 'application/octet-stream' });
      
      console.log("Test ICO file loaded, size:", file.size);
      
      // Process the ICO file
      const result = await this.parseIcoFile(file);
      
      console.log("ICO processing test result:", result);
      console.log("Number of sizes processed:", Object.keys(result).length);
      
      // Test each size
      for (const [size, dataUrl] of Object.entries(result)) {
        console.log(`Size ${size}px:`, dataUrl.substring(0, 50) + "...");
      }
      
    } catch (error) {
      console.error("ICO processing test failed:", error);
    }
  }
}