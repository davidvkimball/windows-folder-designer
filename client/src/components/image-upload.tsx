import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CloudUpload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientIcoProcessor } from "@/lib/ico-processor";

interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  onIcoUpload?: (sizeImages: Record<string, string>) => void;
  onSvgUpload?: (sizeImages: Record<string, string>) => void;
  onSizeSpecificImageUpload?: (size: string, imageUrl: string) => void;
  autoResize: boolean;
  onAutoResizeChange: (autoResize: boolean) => void;
}

export function ImageUpload({ onImageUpload, onIcoUpload, onSvgUpload, onSizeSpecificImageUpload, autoResize, onAutoResizeChange }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sizeInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCustomSizes, setShowCustomSizes] = useState(false);
  const { toast } = useToast();

  const iconSizes = ["16", "20", "24", "32", "40", "64", "256"];

  // Utility function to convert file to data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    const isIcoFile = file.name.toLowerCase().endsWith('.ico') || file.type === 'application/octet-stream';
    const isSvgFile = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
    const isImageFile = file.type.startsWith('image/');
    
    if (!isImageFile && !isIcoFile && !isSvgFile) {
      toast({
        title: "Invalid file type",
        description: "Please select a PNG, JPG, ICO, or SVG file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      if (isIcoFile && onIcoUpload) {
        // Handle ICO file upload - client-side processing
        const sizeImages = await ClientIcoProcessor.parseIcoFile(file);
        onIcoUpload(sizeImages);

        toast({
          title: "ICO file processed",
          description: `Extracted ${Object.keys(sizeImages).length} images from ICO file. Auto-resize disabled.`,
        });
      } else if (isSvgFile && onSvgUpload) {
        // Handle SVG file upload - client-side processing
        // For now, treat SVG as regular image, future enhancement can add SVG processing
        const dataUrl = await fileToDataUrl(file);
        onImageUpload(dataUrl);
        
        toast({
          title: "SVG file uploaded",
          description: "SVG file uploaded as regular image. Size-specific processing coming soon.",
        });
      } else {
        // Handle regular image file upload - convert to data URL
        const dataUrl = await fileToDataUrl(file);
        onImageUpload(dataUrl);

        toast({
          title: "Image uploaded",
          description: "Your image has been added to the user image layer.",
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSizeSpecificFileSelect = async (file: File, size: string) => {
    const isImageFile = file.type.startsWith('image/');
    
    if (!isImageFile) {
      toast({
        title: "Invalid file type",
        description: "Please select a PNG or JPG file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      onSizeSpecificImageUpload?.(size, dataUrl);
      
      toast({
        title: "Image uploaded",
        description: `Image uploaded for ${size}px size.`,
      });
    } catch (error) {
      console.error('Error uploading size-specific image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="p-4 border-b border-dark-border">
      <h2 className="text-sm font-semibold mb-3 text-gray-300">USER IMAGE</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-3 ${
          isDragOver 
            ? "border-blue-500 bg-blue-500/10" 
            : "border-gray-600 hover:border-blue-500"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        data-testid="dropzone-image-upload"
      >
        <CloudUpload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
        <p className="text-sm text-gray-400 mb-1">
          {uploading ? "Uploading..." : "Drop images or SVGs here or"}
        </p>
        <Button 
          variant="ghost" 
          className="text-blue-400 text-sm font-medium hover:text-blue-300 p-0 h-auto"
          disabled={uploading}
          data-testid="button-browse-files"
        >
          Browse Files
        </Button>
        <p className="text-xs text-gray-500 mt-2">PNG, JPG, ICO, SVG up to 10MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,.ico,.svg,image/svg+xml,application/octet-stream"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-file-hidden"
      />

      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <span>Auto-resize to all sizes</span>
        <Switch
          checked={autoResize}
          onCheckedChange={onAutoResizeChange}
          data-testid="switch-auto-resize"
        />
      </div>

      <Button 
        variant="secondary" 
        className="w-full bg-gray-600 hover:bg-gray-500 text-sm font-medium"
        onClick={() => setShowCustomSizes(!showCustomSizes)}
        disabled={autoResize}
        data-testid="button-custom-size-settings"
      >
        <Settings className="w-4 h-4 mr-2" />
        Custom Size Settings
      </Button>

      {/* Per-Size Upload Interface */}
      {!autoResize && showCustomSizes && (
        <div className="mt-4 p-3 bg-dark-panel rounded-lg border border-dark-border">
          <h3 className="text-xs font-medium text-gray-300 mb-3 uppercase tracking-wider">
            Upload Images for Specific Sizes
          </h3>
          <div className="space-y-2">
            {iconSizes.map((size) => (
              <div key={size} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8">{size}px</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs bg-dark-secondary border-dark-border hover:bg-gray-600"
                  onClick={() => sizeInputRefs.current[size]?.click()}
                  disabled={uploading}
                  data-testid={`button-upload-${size}px`}
                >
                  <CloudUpload className="w-3 h-3 mr-1" />
                  Upload {size}px
                </Button>
                <input
                  ref={(el) => (sizeInputRefs.current[size] = el)}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleSizeSpecificFileSelect(file, size);
                    }
                  }}
                  data-testid={`input-size-${size}px`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Upload specific images for each icon size. Each image will only be used for its corresponding size.
          </p>
        </div>
      )}
    </div>
  );
}
