import React, { useState } from "react";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Layer } from "@/types/icon-types";

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId?: string;
  onLayerSelect: (layerId: string) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onLayerReorder: (dragIndex: number, hoverIndex: number) => void;
  selectedSize?: string; // For per-size visibility controls
  onSizeViewModeChange?: (mode: string) => void; // Callback for changing view mode
}

interface LayerItemProps {
  layer: Layer;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Layer>) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  selectedSize?: string;
}

function LayerItem({ 
  layer, 
  index, 
  isActive, 
  onSelect, 
  onUpdate, 
  onDragStart, 
  onDragOver, 
  onDrop,
  selectedSize 
}: LayerItemProps) {
  // Get the appropriate visibility state (per-size or global)
  const isVisible = selectedSize && layer.visibilityBySize 
    ? layer.visibilityBySize[selectedSize] ?? layer.visible
    : layer.visible;

  const toggleVisibility = () => {
    if (selectedSize && selectedSize !== "global") {
      // Toggle per-size visibility
      const currentVisibilityBySize = layer.visibilityBySize || {};
      const newVisibilityBySize = {
        ...currentVisibilityBySize,
        [selectedSize]: !isVisible
      };
      onUpdate({ visibilityBySize: newVisibilityBySize });
    } else {
      // Toggle global visibility
      onUpdate({ visible: !layer.visible });
    }
  };

  const getLayerDisplayName = (layer: Layer) => {
    switch (layer.type) {
      case "back-folder": return "Back Folder";
      case "front-folder": return "Front Folder";
      case "user-image": return "User Image";
      default: return layer.type;
    }
  };

  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case "back-folder": return "📁";
      case "front-folder": return "📂";
      case "user-image": return "🖼️";
      default: return "📄";
    }
  };

  return (
    <div
      className={`p-3 border rounded-lg transition-colors cursor-pointer ${
        isActive 
          ? "border-blue-500 bg-blue-500/10" 
          : "border-gray-600 hover:border-gray-500"
      }`}
      onClick={onSelect}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      data-testid={`layer-item-${layer.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
        <span className="text-lg">{getLayerIcon(layer)}</span>
        <span className="text-sm font-medium text-white flex-1">
          {getLayerDisplayName(layer)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility();
          }}
          className="h-8 w-8 p-0"
          data-testid={`button-toggle-visibility-${layer.id}`}
        >
          {isVisible ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isActive && (
        <div className="space-y-3 pt-2 border-t border-gray-600">
          <div>
            <Label className="text-xs text-gray-300 mb-1 block">
              Opacity: {layer.opacity}%
            </Label>
            <Slider
              value={[layer.opacity]}
              onValueChange={([value]) => onUpdate({ opacity: value })}
              max={100}
              min={0}
              step={1}
              className="w-full"
              data-testid={`slider-opacity-${layer.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function LayerPanel({ 
  layers, 
  activeLayerId, 
  onLayerSelect, 
  onLayerUpdate,
  onLayerReorder,
  selectedSize,
  onSizeViewModeChange
}: LayerPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sort layers by order for display (reverse order - highest first for UI)
  const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, hoverIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== hoverIndex) {
      onLayerReorder(draggedIndex, hoverIndex);
    }
    setDraggedIndex(null);
  };

  const iconSizes = ["16", "20", "24", "32", "40", "64", "256"];

  return (
    <div className="bg-gray-800 rounded-lg p-4" data-testid="layer-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Layers</h3>
      </div>

      {/* Size View Mode Selector */}
      <div className="mb-4">
        <Label className="text-xs text-gray-300 mb-2 block">
          Visibility Controls
        </Label>
        <Select value={selectedSize || "global"} onValueChange={onSizeViewModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select visibility mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">All Sizes (Global)</SelectItem>
            {iconSizes.map(size => (
              <SelectItem key={size} value={size}>
                {size}px Only
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSize && selectedSize !== "global" && (
          <p className="text-xs text-gray-400 mt-1">
            Changes only affect {selectedSize}px icons
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        {sortedLayers.map((layer, index) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            index={index}
            isActive={activeLayerId === layer.id}
            onSelect={() => onLayerSelect(layer.id)}
            onUpdate={(updates) => onLayerUpdate(layer.id, updates)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            selectedSize={selectedSize}
          />
        ))}
      </div>

      {selectedSize && selectedSize !== "global" && (
        <div className="mt-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
          💡 Tip: Visibility changes here only affect the {selectedSize}px size. 
          Switch to "global" view to change all sizes at once.
        </div>
      )}
    </div>
  );
}