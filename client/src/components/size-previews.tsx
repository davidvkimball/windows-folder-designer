import { useEffect, useRef, memo } from "react";
import { Layer, IconSize } from "@/types/icon-types";
import { CanvasRenderer } from "@/lib/canvas-utils";

interface SizePreviewsProps {
  layers: Layer[];
  activeSize: IconSize;
  onSizeSelect: (size: IconSize) => void;
}

export const SizePreview = memo(function SizePreview({ 
  layers, 
  size, 
  isActive, 
  onClick 
}: { 
  layers: Layer[]; 
  size: IconSize; 
  isActive: boolean; 
  onClick: () => void; 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const sizeMap: Record<IconSize, number> = {
    "16": 16,
    "20": 20,
    "24": 24,
    "32": 32,
    "40": 40,
    "64": 64,
    "256": 256,
  };

  const actualSize = sizeMap[size];
  // Better display sizes - make all preview containers the same size for consistency
  const displaySize = 72;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = actualSize;
    canvas.height = actualSize;

    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas);
    }

    // Use async rendering
    rendererRef.current.render(layers, actualSize);
  }, [layers, actualSize]);

  return (
    <div className="text-center">
      <div 
        className={`bg-dark-panel border rounded-lg flex items-center justify-center mb-2 relative overflow-hidden cursor-pointer transition-colors hover:border-gray-500 ${
          isActive ? "border-blue-500 border-2" : "border-dark-border"
        }`}
        style={{ width: displaySize, height: displaySize }}
        onClick={onClick}
        data-testid={`preview-${size}px`}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          style={{
            // Scale smaller icons up for better visibility, but cap larger ones
            width: actualSize <= 32 ? Math.min(actualSize * 2, 60) : Math.min(actualSize, 60),
            height: actualSize <= 32 ? Math.min(actualSize * 2, 60) : Math.min(actualSize, 60),
            imageRendering: actualSize <= 32 ? 'pixelated' : 'auto',
          }}
        />
      </div>
      <span className="text-xs text-gray-400">{size}px</span>
    </div>
  );
});

export function SizePreviews({ layers, activeSize, onSizeSelect }: SizePreviewsProps) {
  const allSizes: IconSize[] = ["256", "64", "40", "32", "24", "20", "16"];

  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">Size Previews</h2>
      
      {/* All sizes in a clean organized grid */}
      <div className="grid grid-cols-3 gap-3">
        {allSizes.map((size) => (
          <SizePreview
            key={size}
            layers={layers}
            size={size}
            isActive={activeSize === size}
            onClick={() => onSizeSelect(size)}
          />
        ))}
      </div>
    </div>
  );
}
