// SVG processor for converting SVG to multiple PNG sizes for icon previews
// Uses Sharp for high-quality SVG to PNG conversion

import sharp from 'sharp';

interface SvgProcessedImage {
  width: number;
  height: number;
  buffer: Buffer;
  size: number;
}

export class SvgProcessor {
  /**
   * Process an SVG buffer and create PNG images for all target sizes
   */
  static async processToSizes(svgBuffer: Buffer, targetSizes: number[] = [16, 20, 24, 32, 40, 64, 256]): Promise<Record<string, string>> {
    if (!svgBuffer || svgBuffer.length === 0) {
      throw new Error('Invalid SVG buffer: empty or null');
    }

    // Validate that it's an SVG by checking for SVG tag and make it white by default
    let svgContent = svgBuffer.toString('utf-8');
    if (!svgContent.includes('<svg')) {
      throw new Error('Invalid SVG file: no SVG element found');
    }

    // Set default white color for SVG elements if no color is specified
    if (!svgContent.includes('fill=') && !svgContent.includes('style=')) {
      svgContent = svgContent.replace(/<svg([^>]*)>/, '<svg$1 fill="white">');
    }
    
    // Convert back to buffer for processing
    svgBuffer = Buffer.from(svgContent, 'utf-8');

    const processedImages: Record<string, string> = {};

    // Process each target size
    for (const size of targetSizes) {
      try {
        console.log(`Processing SVG to PNG at size ${size}px`);
        
        // Convert SVG to PNG at specific size using Sharp
        const pngBuffer = await sharp(svgBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
          })
          .png()
          .toBuffer();

        // Convert to base64 data URL
        const base64 = pngBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;
        
        processedImages[size.toString()] = dataUrl;
        
        console.log(`Successfully created PNG for size ${size}px, buffer size: ${pngBuffer.length}`);
      } catch (error) {
        console.error(`Failed to process SVG at size ${size}px:`, error);
        // Continue processing other sizes even if one fails
      }
    }

    if (Object.keys(processedImages).length === 0) {
      throw new Error('Failed to process SVG: no sizes could be generated');
    }

    return processedImages;
  }

  /**
   * Get SVG dimensions from the SVG content
   */
  static getSvgDimensions(svgBuffer: Buffer): { width?: number; height?: number; viewBox?: string } {
    const svgContent = svgBuffer.toString('utf-8');
    
    // Extract width and height attributes
    const widthMatch = svgContent.match(/width=["']([^"']+)["']/);
    const heightMatch = svgContent.match(/height=["']([^"']+)["']/);
    const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
    
    const result: { width?: number; height?: number; viewBox?: string } = {};
    
    if (widthMatch) {
      const width = parseFloat(widthMatch[1]);
      if (!isNaN(width)) result.width = width;
    }
    
    if (heightMatch) {
      const height = parseFloat(heightMatch[1]);
      if (!isNaN(height)) result.height = height;
    }
    
    if (viewBoxMatch) {
      result.viewBox = viewBoxMatch[1];
    }
    
    return result;
  }

  /**
   * Validate SVG content for security and format
   */
  static validateSvg(svgBuffer: Buffer): { valid: boolean; error?: string } {
    try {
      const svgContent = svgBuffer.toString('utf-8');
      
      // Basic validation
      if (!svgContent.includes('<svg')) {
        return { valid: false, error: 'No SVG element found' };
      }

      // Check for potentially dangerous elements/attributes
      const dangerousPatterns = [
        /<script/i,
        /on\w+\s*=/i, // event handlers like onclick, onload
        /javascript:/i,
        /<object/i,
        /<embed/i,
        /<iframe/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(svgContent)) {
          return { valid: false, error: 'SVG contains potentially unsafe content' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Failed to validate SVG content' };
    }
  }
}