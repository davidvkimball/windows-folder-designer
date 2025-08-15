// Client-side icon generation utilities
// Replaces server-side Sharp processing with Canvas API

import JSZip from 'jszip';
import type { Layer } from '../../../shared/schema';
import { getFolderAsset } from './folder-assets';

export class ClientIconGenerator {
  private static readonly ICON_SIZES = [16, 20, 24, 32, 40, 64, 256];

  /**
   * Generate ICO file from canvas layers (client-side)
   */
  static async generateIcoFromLayers(layers: Layer[]): Promise<Blob> {
    console.log("Starting ICO generation with layers:", layers.map(l => ({ id: l.id, type: l.type, visible: l.visible, order: l.order })));
    
    const imageBuffers: Record<string, ArrayBuffer> = {};

    // Generate PNG for each size
    for (const size of this.ICON_SIZES) {
      console.log(`Generating size ${size}px...`);
      
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d')!;
      
      // Render layers to canvas
      await this.renderLayersToCanvas(ctx, layers, size);
      
      // Convert to PNG buffer
      const blob = await this.canvasToBlob(canvas, 'image/png');
      const arrayBuffer = await blob.arrayBuffer();
      imageBuffers[size.toString()] = arrayBuffer;
      
      console.log(`Size ${size}px generated, buffer size: ${arrayBuffer.byteLength} bytes`);
    }

    console.log("Creating ICO file from", Object.keys(imageBuffers).length, "sizes");
    // Create ICO file from PNG buffers
    return this.createIcoFromPngs(imageBuffers);
  }

  /**
   * Generate ZIP of PNG files from canvas layers
   */
  static async generatePngZipFromLayers(layers: Layer[]): Promise<Blob> {
    const zip = new JSZip();

    // Generate PNG for each size
    for (const size of this.ICON_SIZES) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d')!;
      
      // Render layers to canvas
      await this.renderLayersToCanvas(ctx, layers, size);
      
      // Convert to PNG blob
      const blob = await this.canvasToBlob(canvas, 'image/png');
      
      // Add to ZIP
      zip.file(`icon_${size}x${size}.png`, blob);
    }

    return zip.generateAsync({ type: 'blob' });
  }

  /**
   * Render layers to canvas context
   */
  private static async renderLayersToCanvas(ctx: CanvasRenderingContext2D, layers: Layer[], size: number): Promise<void> {
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Sort layers by order (lower numbers render first)
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    
    console.log(`Rendering ${sortedLayers.length} layers for size ${size}px:`, sortedLayers.map(l => ({ id: l.id, type: l.type, visible: l.visible, order: l.order })));
    
    for (const layer of sortedLayers) {
      if (!layer.visible) {
        console.log(`Skipping invisible layer: ${layer.id}`);
        continue;
      }
      
      console.log(`Rendering layer: ${layer.id} (${layer.type})`);
      
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      
      try {
        switch (layer.type) {
          case 'back-folder':
          case 'front-folder':
            await this.renderFolderLayer(ctx, layer, size);
            break;
          case 'user-image':
            await this.renderUserImageLayer(ctx, layer, size);
            break;
        }
      } catch (error) {
        console.error(`Failed to render layer ${layer.id}:`, error);
      }
      
      ctx.restore();
    }
  }

  /**
   * Render folder layer (back or front)
   */
  private static async renderFolderLayer(ctx: CanvasRenderingContext2D, layer: Layer, size: number): Promise<void> {
    const isBack = layer.type === 'back-folder';
    
    // Use the same asset loading method as CanvasRenderer
    const assetPath = getFolderAsset(isBack ? 'back' : 'front', size);
    
    try {
      const img = await this.loadImage(assetPath);
      
      if (layer.useColor && layer.color) {
        this.applyColorToImage(ctx, img, layer.color, size);
      } else {
        ctx.drawImage(img, 0, 0, size, size);
      }
    } catch (error) {
      console.error(`Failed to load folder asset for ${isBack ? 'back' : 'front'} at size ${size}:`, error);
      // Fallback to simple colored rectangles if assets not found
      this.renderFolderFallback(ctx, layer, isBack, size);
    }
  }

  /**
   * Render user image layer
   */
  private static async renderUserImageLayer(ctx: CanvasRenderingContext2D, layer: Layer, size: number): Promise<void> {
    let imageUrl: string | undefined;
    
    // Check for size-specific image first
    if (layer.sizeSpecificImages) {
      imageUrl = layer.sizeSpecificImages[size.toString()];
    }
    
    // Fall back to main image if no size-specific image
    if (!imageUrl) {
      imageUrl = layer.imageUrl;
    }
    
    if (!imageUrl) return;
    
    try {
      const img = await this.loadImage(imageUrl);
      
      const scaleFactor = size / 256;
      const currentPosition = layer.positionBySize?.[size.toString()] || layer.position;
      const currentScale = layer.scaleBySize?.[size.toString()] || layer.scale;
      
      const scaledSize = size * currentScale;
      const x = (currentPosition.x * scaleFactor) - (scaledSize / 2);
      const y = (currentPosition.y * scaleFactor) - (scaledSize / 2);
      
      if (layer.useColor && layer.color) {
        this.applyColorToImage(ctx, img, layer.color, scaledSize, x, y);
      } else {
        ctx.drawImage(img, x, y, scaledSize, scaledSize);
      }
    } catch (error) {
      console.error('Failed to load user image:', error);
    }
  }

  /**
   * Apply color overlay to image
   */
  private static applyColorToImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, color: any, size: number, x: number = 0, y: number = 0): void {
    // Create temporary canvas for color manipulation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = size;
    tempCanvas.height = size;

    // Draw original image
    tempCtx.drawImage(img, 0, 0, size, size);

    // Apply color overlay using source-atop to preserve alpha
    tempCtx.globalCompositeOperation = 'source-atop';
    
    if (color.type === 'linear' && color.gradient) {
      const gradient = tempCtx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, color.gradient.start);
      gradient.addColorStop(1, color.gradient.end);
      tempCtx.fillStyle = gradient;
    } else if (color.type === 'radial' && color.gradient) {
      const gradient = tempCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, color.gradient.start);
      gradient.addColorStop(1, color.gradient.end);
      tempCtx.fillStyle = gradient;
    } else {
      tempCtx.fillStyle = color.value;
    }
    
    tempCtx.fillRect(0, 0, size, size);

    // Draw the colored image to main canvas
    ctx.drawImage(tempCanvas, x, y);
  }

  /**
   * Render fallback folder shape
   */
  private static renderFolderFallback(ctx: CanvasRenderingContext2D, layer: Layer, isBack: boolean, size: number): void {
    if (!layer.useColor) return;

    const color = layer.color?.value || (isBack ? '#EA580C' : '#F59E0B');
    
    if (layer.color?.type === 'linear' && layer.color.gradient) {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, layer.color.gradient.start);
      gradient.addColorStop(1, layer.color.gradient.end);
      ctx.fillStyle = gradient;
    } else if (layer.color?.type === 'radial' && layer.color.gradient) {
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, layer.color.gradient.start);
      gradient.addColorStop(1, layer.color.gradient.end);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = color;
    }

    // Draw folder shape
    if (isBack) {
      ctx.fillRect(size * 0.05, size * 0.2, size * 0.8, size * 0.65);
      ctx.fillRect(size * 0.05, size * 0.1, size * 0.3, size * 0.1);
    } else {
      ctx.fillRect(size * 0.15, size * 0.15, size * 0.7, size * 0.6);
      ctx.fillRect(size * 0.15, size * 0.05, size * 0.25, size * 0.1);
    }
  }

  /**
   * Load image from URL
   */
  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Convert canvas to blob
   */
  private static canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      }, type);
    });
  }

  /**
   * Create ICO file from PNG buffers
   */
  private static async createIcoFromPngs(imageBuffers: Record<string, ArrayBuffer>): Promise<Blob> {
    const sizes = Object.keys(imageBuffers).map(Number).sort((a, b) => a - b);
    const count = sizes.length;
    
    // Calculate header size: 6 bytes header + 16 bytes per entry
    const headerSize = 6 + (count * 16);
    let totalSize = headerSize;
    
    // Calculate total size needed
    for (const size of sizes) {
      totalSize += imageBuffers[size.toString()].byteLength;
    }
    
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    
    // Write ICO header
    view.setUint16(0, 0, true); // Reserved
    view.setUint16(2, 1, true); // Type (1 = ICO)
    view.setUint16(4, count, true); // Count
    
    let currentOffset = headerSize;
    
    // Write directory entries and image data
    for (let i = 0; i < count; i++) {
      const size = sizes[i];
      const imageBuffer = imageBuffers[size.toString()];
      const entryOffset = 6 + (i * 16);
      
      // Write directory entry
      view.setUint8(entryOffset, size === 256 ? 0 : size); // Width
      view.setUint8(entryOffset + 1, size === 256 ? 0 : size); // Height
      view.setUint8(entryOffset + 2, 0); // Color count
      view.setUint8(entryOffset + 3, 0); // Reserved
      view.setUint16(entryOffset + 4, 1, true); // Color planes
      view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
      view.setUint32(entryOffset + 8, imageBuffer.byteLength, true); // Image size
      view.setUint32(entryOffset + 12, currentOffset, true); // Image offset
      
      // Copy image data
      uint8View.set(new Uint8Array(imageBuffer), currentOffset);
      currentOffset += imageBuffer.byteLength;
    }
    
    return new Blob([buffer], { type: 'image/x-icon' });
  }
}