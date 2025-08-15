// ICO file parser for extracting individual PNG/BMP images from ICO files
// Based on ICO file format specification

interface IcoImage {
  width: number;
  height: number;
  buffer: Buffer;
  format: 'png' | 'bmp';
}

export class IcoParser {
  /**
   * Parse an ICO file buffer and extract individual images
   */
  static parse(icoBuffer: Buffer): IcoImage[] {
    if (icoBuffer.length < 6) {
      throw new Error('Invalid ICO file: too small');
    }

    // ICO header: 2 bytes reserved (0), 2 bytes type (1), 2 bytes count
    const reserved = icoBuffer.readUInt16LE(0);
    const type = icoBuffer.readUInt16LE(2);
    const count = icoBuffer.readUInt16LE(4);

    if (reserved !== 0 || type !== 1) {
      throw new Error('Invalid ICO file: incorrect header');
    }

    if (count === 0 || count > 255) {
      throw new Error('Invalid ICO file: invalid image count');
    }

    const images: IcoImage[] = [];

    // Each directory entry is 16 bytes
    for (let i = 0; i < count; i++) {
      const entryOffset = 6 + (i * 16);
      
      if (entryOffset + 16 > icoBuffer.length) {
        throw new Error('Invalid ICO file: truncated directory entry');
      }

      // Directory entry structure:
      // 0: width (1 byte, 0 = 256)
      // 1: height (1 byte, 0 = 256) 
      // 2: color count (1 byte)
      // 3: reserved (1 byte)
      // 4-5: color planes (2 bytes)
      // 6-7: bits per pixel (2 bytes)
      // 8-11: image size in bytes (4 bytes)
      // 12-15: image offset (4 bytes)

      const width = icoBuffer.readUInt8(entryOffset) || 256;
      const height = icoBuffer.readUInt8(entryOffset + 1) || 256;
      const imageSize = icoBuffer.readUInt32LE(entryOffset + 8);
      const imageOffset = icoBuffer.readUInt32LE(entryOffset + 12);

      if (imageOffset + imageSize > icoBuffer.length) {
        throw new Error('Invalid ICO file: image data out of bounds');
      }

      // Extract image data
      const imageBuffer = icoBuffer.subarray(imageOffset, imageOffset + imageSize);
      
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
        buffer: imageBuffer,
        format
      });
    }

    return images;
  }

  /**
   * Convert ICO images to a size-keyed object for easier access
   */
  static toSizeMap(images: IcoImage[]): Record<string, Buffer> {
    const sizeMap: Record<string, Buffer> = {};
    
    for (const image of images) {
      // Use the most common dimension as the key
      const size = Math.max(image.width, image.height);
      sizeMap[size.toString()] = image.buffer;
    }

    return sizeMap;
  }

  /**
   * Get the best matching image for a specific size
   */
  static getBestMatch(images: IcoImage[], targetSize: number): IcoImage | null {
    if (images.length === 0) return null;

    // Try to find exact match first
    const exactMatch = images.find(img => 
      img.width === targetSize && img.height === targetSize
    );
    if (exactMatch) return exactMatch;

    // Find closest larger size
    const largerSizes = images.filter(img => 
      Math.max(img.width, img.height) >= targetSize
    );
    if (largerSizes.length > 0) {
      return largerSizes.reduce((closest, current) => {
        const closestSize = Math.max(closest.width, closest.height);
        const currentSize = Math.max(current.width, current.height);
        return currentSize < closestSize ? current : closest;
      });
    }

    // Fall back to largest available
    return images.reduce((largest, current) => {
      const largestSize = Math.max(largest.width, largest.height);
      const currentSize = Math.max(current.width, current.height);
      return currentSize > largestSize ? current : largest;
    });
  }
}