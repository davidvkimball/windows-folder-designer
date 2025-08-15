import { useEffect, useRef, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { CanvasRenderer } from "@/lib/canvas-utils";
import { Layer, IconSize } from "@/types/icon-types";
import { Minus, Plus, Eye, EyeOff } from "lucide-react";

interface IconCanvasProps {
  layers: Layer[];
  activeSize: IconSize;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
}

export const IconCanvas = memo(function IconCanvas({ layers, activeSize, onLayerUpdate }: IconCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showGuides, setShowGuides] = useState(true);

  const sizeMap: Record<IconSize, number> = {
    "16": 16,
    "20": 20,
    "24": 24,
    "32": 32,
    "40": 40,
    "64": 64,
    "256": 256,
  };

  const actualSize = sizeMap[activeSize];

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

  const handleZoomIn = () => setZoom(Math.min(zoom + 50, 500));
  const handleZoomOut = () => setZoom(Math.max(zoom - 50, 50));

  const displaySize = Math.round((actualSize * zoom) / 100);

  return (
    <div className="flex-1 flex flex-col bg-dark-primary">
      {/* Canvas Header */}
      <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">Preview ({activeSize}px)</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400">Zoom:</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            className="w-6 h-6 p-0 bg-gray-600 hover:bg-gray-500"
            data-testid="button-zoom-out"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-sm font-mono min-w-[3rem] text-center">{zoom}%</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            className="w-6 h-6 p-0 bg-gray-600 hover:bg-gray-500"
            data-testid="button-zoom-in"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGuides(!showGuides)}
            className={`px-3 py-1 text-xs ${
              showGuides 
                ? "bg-blue-600 hover:bg-blue-500" 
                : "bg-gray-600 hover:bg-gray-500"
            }`}
            data-testid="button-toggle-guides"
          >
            {showGuides ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            Guides
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* Checkerboard background */}
          <div 
            className="absolute inset-0 opacity-20 transparency-bg rounded-lg"
            style={{
              width: displaySize + 8,
              height: displaySize + 8,
              left: -4,
              top: -4,
            }}
          />
          
          {/* Main canvas container */}
          <div 
            className="relative border-2 border-gray-600 rounded-lg overflow-hidden bg-transparent"
            style={{
              width: displaySize,
              height: displaySize,
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{
                imageRendering: zoom > 200 ? 'pixelated' : 'auto',
              }}
              data-testid="canvas-main"
            />
            
            {/* Overlay guides */}
            {showGuides && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-px bg-blue-500 opacity-30" />
                <div className="absolute left-1/2 top-0 h-full w-px bg-blue-500 opacity-30" />
              </div>
            )}
          </div>
          
          {/* Corner resize handles */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white pointer-events-none" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white pointer-events-none" />
        </div>
      </div>

      {/* Canvas Footer */}
      <div className="border-t border-dark-border px-6 py-3 flex items-center justify-between text-sm text-gray-400">
        <span data-testid="text-position">Position: 128, 128</span>
        <span data-testid="text-size">Size: {actualSize}x{actualSize}px</span>
        <span data-testid="text-active-layer">Layer: {layers.find(l => l.id === "user-image")?.type || "None"}</span>
      </div>
    </div>
  );
});
