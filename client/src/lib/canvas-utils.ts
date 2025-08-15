import { Layer, Color } from "@/types/icon-types";
import { getFolderAsset } from "./folder-assets";

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private folderBackImage: HTMLImageElement | null = null;
  private folderFrontImage: HTMLImageElement | null = null;
  private lastLayers: Layer[] | null = null;
  private lastSize: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadFolderImages();
  }

  private async loadFolderImages() {
    // This is now only used for the UI preview canvas (256px)
    try {
      const backAsset = getFolderAsset('back', 256);
      const frontAsset = getFolderAsset('front', 256);
      
      console.log("Loading folder images for preview:", { backAsset, frontAsset });
      
      const [backImg, frontImg] = await Promise.all([
        this.loadImage(backAsset),
        this.loadImage(frontAsset)
      ]);
      
      this.folderBackImage = backImg;
      this.folderFrontImage = frontImg;
      
      console.log("Preview folder images loaded successfully");
      
      // Force a re-render for the preview canvas
      if (this.lastLayers && this.lastSize === 256) {
        this.render(this.lastLayers, this.lastSize);
      }
    } catch (error) {
      console.error("Failed to load preview folder images:", error);
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error("Image load error for src:", src.substring(0, 50) + "...", error);
        reject(error);
      };
      
      // Handle data URLs and regular URLs
      if (src.startsWith('data:')) {
        img.src = src;
      } else if (src.startsWith('blob:')) {
        img.src = src;
      } else {
        img.src = src;
      }
    });
  }

  public async render(layers: Layer[], size: number = 256): Promise<void> {
    // Store current render state for potential re-render after image loading
    this.lastLayers = layers;
    this.lastSize = size;
    
    // Load size-specific folder images for optimal quality
    const folderImages = await this.loadFolderImagesForSize(size);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, size, size);
    
    // Sort layers by order (lowest order renders first, highest on top)
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    for (const layer of sortedLayers) {
      // Check per-size visibility first, then fall back to global visibility
      const isVisible = layer.visibilityBySize?.[size.toString()] ?? layer.visible;
      if (!isVisible) continue;

      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity / 100;

      switch (layer.type) {
        case "back-folder":
          await this.renderFolderLayer(layer, true, size, folderImages.back);
          break;
        case "front-folder":
          await this.renderFolderLayer(layer, false, size, folderImages.front);
          break;
        case "user-image":
          await this.renderUserImage(layer, size);
          break;
      }

      this.ctx.restore();
    }
  }

  private async loadFolderImagesForSize(size: number): Promise<{back: HTMLImageElement, front: HTMLImageElement}> {
    // Use exact size assets for optimal quality at each icon size
    const backAsset = getFolderAsset('back', size);
    const frontAsset = getFolderAsset('front', size);
    
    const [backImg, frontImg] = await Promise.all([
      this.loadImage(backAsset),
      this.loadImage(frontAsset)
    ]);
    
    return { back: backImg, front: frontImg };
  }

  private async renderFolderLayer(layer: Layer, isBack: boolean, size: number, folderImage?: HTMLImageElement) {
    if (!folderImage) {
      // This should not happen if loadFolderImagesForSize worked properly
      console.error(`Folder image not available for ${isBack ? 'back' : 'front'} folder at size ${size}px`);
      this.renderFolderFallback(layer, isBack, size);
      return;
    }

    // Apply color overlay only if useColor is enabled and color is specified
    if (layer.useColor && layer.color) {
      this.applyColorToImage(folderImage, layer.color, size);
    } else {
      // Draw original image without color overlay
      this.ctx.drawImage(folderImage, 0, 0, size, size);
    }
  }

  private renderFolderFallback(layer: Layer, isBack: boolean, size: number) {
    // Only render fallback if user explicitly wants colored folders
    if (!layer.useColor) {
      // If folder images aren't loaded and no color is wanted, skip rendering
      // The ensureFolderImagesLoaded should have handled loading
      console.warn(`Folder image not loaded for ${isBack ? 'back' : 'front'} folder at size ${size}px, skipping fallback`);
      return;
    }

    const color = layer.color?.value || (isBack ? "#EA580C" : "#F59E0B");
    
    if (layer.color?.type === "linear" && layer.color.gradient) {
      // Create diagonal gradient from top-left to bottom-right (Windows 11 style)
      const gradient = this.ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, layer.color.gradient.start);
      gradient.addColorStop(1, layer.color.gradient.end);
      this.ctx.fillStyle = gradient;
    } else if (layer.color?.type === "radial" && layer.color.gradient) {
      const gradient = this.ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, layer.color.gradient.start);
      gradient.addColorStop(1, layer.color.gradient.end);
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = color;
    }

    // Draw folder shape - simplified shapes that resemble Windows 11 folder icons
    if (isBack) {
      // Back folder - larger, positioned behind
      this.ctx.fillRect(size * 0.05, size * 0.2, size * 0.8, size * 0.65);
      // Folder tab
      this.ctx.fillRect(size * 0.05, size * 0.1, size * 0.3, size * 0.1);
    } else {
      // Front folder - smaller, positioned in front
      this.ctx.fillRect(size * 0.15, size * 0.15, size * 0.7, size * 0.6);
      // Folder tab
      this.ctx.fillRect(size * 0.15, size * 0.05, size * 0.25, size * 0.1);
    }
  }

  private applyColorToImage(image: HTMLImageElement, color: Color, size: number, x?: number, y?: number) {
    // Create temporary canvas for color manipulation
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCanvas.width = size;
    tempCanvas.height = size;

    // Draw original image
    tempCtx.drawImage(image, 0, 0, size, size);

    // Apply color overlay using source-atop to preserve alpha
    tempCtx.globalCompositeOperation = "source-atop";
    
    if (color.type === "linear" && color.gradient) {
      // Create diagonal gradient from top-left to bottom-right (Windows 11 style)
      const gradient = tempCtx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, color.gradient.start);
      gradient.addColorStop(1, color.gradient.end);
      tempCtx.fillStyle = gradient;
    } else if (color.type === "radial" && color.gradient) {
      const gradient = tempCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, color.gradient.start);
      gradient.addColorStop(1, color.gradient.end);
      tempCtx.fillStyle = gradient;
    } else {
      tempCtx.fillStyle = color.value;
    }
    
    tempCtx.fillRect(0, 0, size, size);

    // Draw the colored image to main canvas at specified position
    if (x !== undefined && y !== undefined) {
      this.ctx.drawImage(tempCanvas, x, y);
    } else {
      this.ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  private async renderUserImage(layer: Layer, size: number) {
    // Check if we have size-specific images
    if (layer.sizeSpecificImages) {
      const sizeKey = size.toString();
      const sizeSpecificImageUrl = layer.sizeSpecificImages[sizeKey];

      // If there's a size-specific image for this exact size, use it
      if (sizeSpecificImageUrl) {
        try {
          const img = await this.loadImage(sizeSpecificImageUrl);
          
          // For size-specific images, scale appropriately
          const scaleFactor = size / 256;
          
          // Use size-specific position and scale if available
          const currentPosition = layer.positionBySize?.[size.toString()] || layer.position;
          const currentScale = layer.scaleBySize?.[size.toString()] || layer.scale;
          
          const scaledSize = size * currentScale;
          const x = (currentPosition.x * scaleFactor) - (scaledSize / 2);
          const y = (currentPosition.y * scaleFactor) - (scaledSize / 2);

          this.ctx.globalAlpha = layer.opacity / 100;
          
          if (layer.useColor && layer.color) {
            // Apply color overlay to the image
            this.applyColorToImage(img, layer.color, scaledSize, x, y);
          } else {
            // Draw image normally
            this.ctx.drawImage(img, x, y, scaledSize, scaledSize);
          }
          
          this.ctx.globalAlpha = 1;
          return;
        } catch (error) {
          console.error("Failed to load size-specific image for size", size, ":", error);
          console.error("Image URL:", sizeSpecificImageUrl?.substring(0, 100) + "...");
        }
      }
      
      // If no size-specific image for this size, fall through to use the main imageUrl
      // This ensures that sizes without specific images still use the main image
    }

    // Fallback to regular image handling
    if (!layer.imageUrl) return;

    try {
      const img = await this.loadImage(layer.imageUrl);
      
      // Calculate position and size based on layer settings
      const scaleFactor = size / 256;
      
      // Use size-specific position and scale if available
      const currentPosition = layer.positionBySize?.[size.toString()] || layer.position;
      const currentScale = layer.scaleBySize?.[size.toString()] || layer.scale;
      
      const scaledSize = size * currentScale;
      const x = (currentPosition.x * scaleFactor) - (scaledSize / 2);
      const y = (currentPosition.y * scaleFactor) - (scaledSize / 2);

      this.ctx.globalAlpha = layer.opacity / 100;
      
      if (layer.useColor && layer.color) {
        // Apply color overlay to the image
        this.applyColorToImage(img, layer.color, scaledSize, x, y);
      } else {
        // Draw image normally
        this.ctx.drawImage(img, x, y, scaledSize, scaledSize);
      }
      
      this.ctx.globalAlpha = 1;
    } catch (error) {
      console.error("Failed to load user image:", error);
    }
  }

  public exportAsBlob(type: string = "image/png", quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas"));
      }, type, quality);
    });
  }

  public exportAsDataURL(type: string = "image/png", quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }
}

export function createDefaultLayers(): Layer[] {
  return [
    {
      id: "back-folder",
      type: "back-folder",
      visible: true,
      opacity: 100,
      position: { x: 128, y: 128 },
      scale: 1,
      order: 0, // Renders first (back)
      useColor: false, // Vanilla folder by default
      color: {
        type: "solid",
        value: "#EA580C",
      },
    },
    {
      id: "front-folder",
      type: "front-folder",
      visible: true,
      opacity: 100,
      position: { x: 128, y: 128 },
      scale: 1,
      order: 1, // Renders second (middle)
      useColor: false, // Vanilla folder by default
      color: {
        type: "solid",
        value: "#F59E0B",
      },
    },
    {
      id: "user-image",
      type: "user-image",
      visible: true,
      opacity: 100,
      position: { x: 128, y: 128 },
      scale: 1.0,
      order: 2, // Renders last (front)
      useColor: false,
      color: {
        type: "solid",
        value: "#FFFFFF",
      },
      sizeSpecificImages: undefined,
    },
  ];
}
