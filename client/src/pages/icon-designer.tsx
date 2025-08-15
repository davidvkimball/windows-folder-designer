import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { IconCanvas } from "@/components/icon-canvas";
import { LayerPanel } from "@/components/layer-panel";
import { ColorPicker } from "@/components/color-picker";
import { SizePreviews } from "@/components/size-previews";
import { ImageUpload } from "@/components/image-upload";
import { createDefaultLayers } from "@/lib/canvas-utils";
import { ClientIconGenerator } from "@/lib/icon-generator";
import { Layer, IconSize, Color } from "@/types/icon-types";
import { 
  Folder, 
  Undo, 
  Redo, 
  Download, 
  Save, 
  FolderOpen, 
  Plus,
  Github
} from "lucide-react";

export default function IconDesigner() {
  const [layers, setLayers] = useState<Layer[]>(createDefaultLayers());
  const [activeLayerId, setActiveLayerId] = useState<string>("front-folder");
  const [activeSize, setActiveSize] = useState<IconSize>("256");
  const [sizeViewMode, setSizeViewMode] = useState<string>("global"); // "global" or specific size for layer visibility
  const [autoResize, setAutoResize] = useState(true);
  const [projectName, setProjectName] = useState("custom-folder");
  const [exportFormat, setExportFormat] = useState<"ico" | "png-zip">("ico");
  const [includeAllSizes, setIncludeAllSizes] = useState(true);
  const [imagePosition, setImagePosition] = useState({ x: 128, y: 128 });
  const [selectedPositionIndex, setSelectedPositionIndex] = useState(4); // Track selected position (center = 4)
  const [imageScale, setImageScale] = useState(100);
  const { toast } = useToast();



  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };

  const reorderLayers = (dragIndex: number, hoverIndex: number) => {
    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
    const draggedLayer = sortedLayers[dragIndex];
    const targetLayer = sortedLayers[hoverIndex];
    
    if (!draggedLayer || !targetLayer) return;

    // Swap the order values
    const newDragOrder = targetLayer.order;
    const newTargetOrder = draggedLayer.order;

    setLayers(prev => prev.map(layer => {
      if (layer.id === draggedLayer.id) {
        return { ...layer, order: newDragOrder };
      }
      if (layer.id === targetLayer.id) {
        return { ...layer, order: newTargetOrder };
      }
      return layer;
    }));
  };

  const handleUndo = () => {
    // TODO: Implement undo functionality
    toast({
      title: "Undo",
      description: "Undo functionality will be implemented.",
    });
  };

  const handleRedo = () => {
    // TODO: Implement redo functionality
    toast({
      title: "Redo", 
      description: "Redo functionality will be implemented.",
    });
  };

  const handleSaveProject = () => {
    // TODO: Implement save project functionality
    toast({
      title: "Save Project",
      description: "Save project functionality will be implemented.",
    });
  };

  const handleLoadProject = () => {
    // TODO: Implement load project functionality  
    toast({
      title: "Load Project",
      description: "Load project functionality will be implemented.",
    });
  };

  const handleNewProject = () => {
    // TODO: Implement new project functionality
    toast({
      title: "New Project", 
      description: "New project functionality will be implemented.",
    });
  };

  const handleExport = async () => {
    try {
      let blob: Blob;

      if (exportFormat === "ico") {
        blob = await ClientIconGenerator.generateIcoFromLayers(layers);
      } else {
        blob = await ClientIconGenerator.generatePngZipFromLayers(layers);
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.${exportFormat === "ico" ? "ico" : "zip"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `${projectName}.${exportFormat === "ico" ? "ico" : "zip"} has been downloaded.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to generate the icon file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    updateLayer("user-image", { 
      imageUrl, 
      visible: true,
      position: { x: imagePosition.x, y: imagePosition.y },
      scale: imageScale / 100,
      sizeSpecificImages: undefined, // Clear size-specific images when uploading regular image
    });
  };

  const handleSizeSpecificImageUpload = (size: string, imageUrl: string) => {
    const userImageLayer = layers.find(l => l.id === "user-image");
    const currentSizeSpecificImages = userImageLayer?.sizeSpecificImages || {};
    
    console.log("Size-specific upload:", { 
      size, 
      imageUrl: imageUrl.substring(0, 100) + "...",
      currentMainImage: userImageLayer?.imageUrl?.substring(0, 100) + "...",
      currentSizeSpecificImages: Object.keys(currentSizeSpecificImages)
    });
    
    updateLayer("user-image", {
      sizeSpecificImages: {
        ...currentSizeSpecificImages,
        [size]: imageUrl
      },
      visible: true,
      // Preserve the main imageUrl so other sizes can still use it
      imageUrl: userImageLayer?.imageUrl,
    });
  };

  const handleAutoResizeChange = useCallback((newAutoResize: boolean) => {
    setAutoResize(newAutoResize);
    
    // When auto-resize is turned back ON, clear size-specific images
    if (newAutoResize) {
      const userImageLayer = layers.find(l => l.id === "user-image");
      if (userImageLayer?.sizeSpecificImages) {
        updateLayer("user-image", {
          sizeSpecificImages: undefined
        });
      }
    }
  }, [layers, updateLayer]);

  const handleIcoUpload = (sizeImages: Record<string, string>) => {
    console.log("ICO upload received:", { 
      sizeCount: Object.keys(sizeImages).length, 
      sizes: Object.keys(sizeImages),
      sampleUrl: Object.values(sizeImages)[0]?.substring(0, 100) + "..." 
    });
    
    // Disable auto-resize when ICO is uploaded
    setAutoResize(false);
    
    // Ensure all layers are properly configured for the complete icon
    // Update back-folder layer to ensure it's visible
    updateLayer("back-folder", { 
      visible: true,
      opacity: 100
    });
    
    // Update front-folder layer to ensure it's visible  
    updateLayer("front-folder", { 
      visible: true,
      opacity: 100
    });
    
    // Update user-image layer with the uploaded ICO images
    updateLayer("user-image", { 
      sizeSpecificImages: sizeImages,
      visible: true,
      position: { x: imagePosition.x, y: imagePosition.y },
      scale: imageScale / 100,
      imageUrl: undefined, // Clear regular image URL when using size-specific images
    });
  };

  const handleSvgUpload = (sizeImages: Record<string, string>) => {
    console.log("SVG upload received:", { 
      sizeCount: Object.keys(sizeImages).length, 
      sizes: Object.keys(sizeImages),
      sampleUrl: Object.values(sizeImages)[0]?.substring(0, 100) + "..." 
    });
    
    // Disable auto-resize when SVG is uploaded
    setAutoResize(false);
    
    // Ensure all layers are properly configured for the complete icon
    // Update back-folder layer to ensure it's visible
    updateLayer("back-folder", { 
      visible: true,
      opacity: 100
    });
    
    // Update front-folder layer to ensure it's visible  
    updateLayer("front-folder", { 
      visible: true,
      opacity: 100
    });
    
    // Update user-image layer with the uploaded SVG images
    updateLayer("user-image", { 
      sizeSpecificImages: sizeImages,
      visible: true,
      position: { x: imagePosition.x, y: imagePosition.y },
      scale: imageScale / 100,
      imageUrl: undefined, // Clear regular image URL when using size-specific images
    });
  };

  const handleColorChange = (layerId: string, color: Color) => {
    updateLayer(layerId, { color });
  };

  const handleUseColorChange = (layerId: string, useColor: boolean) => {
    updateLayer(layerId, { useColor });
  };

  const handlePositionChange = (position: number) => {
    // Simple 9-grid position system
    const positions = [
      { x: 64, y: 64 },   // Top-left
      { x: 128, y: 64 },  // Top-center
      { x: 192, y: 64 },  // Top-right
      { x: 64, y: 128 },  // Middle-left
      { x: 128, y: 128 }, // Center
      { x: 192, y: 128 }, // Middle-right
      { x: 64, y: 192 },  // Bottom-left
      { x: 128, y: 192 }, // Bottom-center
      { x: 192, y: 192 }  // Bottom-right
    ];
    
    const newPosition = positions[position] || positions[4]; // Default to center
    setSelectedPositionIndex(position);
    setImagePosition(newPosition);
    
    if (sizeViewMode === "global") {
      // Update position for all sizes
      updateLayer("user-image", { 
        position: newPosition,
        positionBySize: undefined // Clear size-specific overrides
      });
    } else {
      // Update position for specific size only
      const userImageLayer = layers.find(l => l.id === "user-image");
      const currentPositionBySize = userImageLayer?.positionBySize || {};
      updateLayer("user-image", {
        positionBySize: {
          ...currentPositionBySize,
          [sizeViewMode]: newPosition
        }
      });
    }
  };

  const handleScaleChange = useCallback((scale: number) => {
    // Clamp value to valid range
    const clampedScale = Math.max(10, Math.min(200, scale));
    setImageScale(clampedScale);
    if (sizeViewMode === "global") {
      // Update scale for all sizes
      updateLayer("user-image", { 
        scale: clampedScale / 100,
        scaleBySize: undefined // Clear size-specific overrides
      });
    } else {
      // Update scale for specific size only
      const userImageLayer = layers.find(l => l.id === "user-image");
      const currentScaleBySize = userImageLayer?.scaleBySize || {};
      updateLayer("user-image", {
        scaleBySize: {
          ...currentScaleBySize,
          [sizeViewMode]: clampedScale / 100
        }
      });
    }
  }, [imageScale, sizeViewMode, layers, updateLayer]);

  const handleGranularPositionChange = useCallback((axis: 'x' | 'y', value: number) => {
    // Clamp value to valid range
    const clampedValue = Math.max(0, Math.min(256, value));
    const newPosition = { ...imagePosition, [axis]: clampedValue };
    setImagePosition(newPosition);
    
    if (sizeViewMode === "global") {
      // Update position for all sizes
      updateLayer("user-image", { 
        position: newPosition,
        positionBySize: undefined // Clear size-specific overrides
      });
    } else {
      // Update position for specific size only
      const userImageLayer = layers.find(l => l.id === "user-image");
      const currentPositionBySize = userImageLayer?.positionBySize || {};
      updateLayer("user-image", {
        positionBySize: {
          ...currentPositionBySize,
          [sizeViewMode]: newPosition
        }
      });
    }
  }, [imagePosition, sizeViewMode, layers, updateLayer]);

  return (
    <div className="bg-dark-primary text-white font-inter overflow-hidden h-screen">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-dark-border px-6 py-3 grid grid-cols-3 items-center">
        {/* Left: Title */}
        <div className="flex items-center space-x-4">
          <Folder className="text-yellow-500 text-xl" />
          <h1 className="text-lg font-semibold">Windows Folder Designer (Alpha) by <a href="https://davidvkimball.com" target="_blank" className="text-blue-400 hover:text-blue-300 underline">David V. Kimball</a></h1>
        </div>

        {/* Center: GitHub Button */}
        <div className="flex justify-center">
          <Button
            variant="secondary"
            className="bg-gray-600 hover:bg-gray-500 text-sm font-medium"
            asChild
          >
            <a
              href="https://github.com/davidvkimball/windows-folder-designer"
              target="_blank"
              className="flex items-center space-x-2"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Project</span>
            </a>
          </Button>
        </div>

        {/* Right: Undo/Redo */}
        <div className="flex items-center justify-end space-x-3">
          <Button 
            variant="secondary" 
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-sm font-medium"
            onClick={handleUndo}
            data-testid="button-undo"
          >
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button 
            variant="secondary"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-sm font-medium"
            onClick={handleRedo}
            data-testid="button-redo"
          >
            <Redo className="w-4 h-4 mr-2" />
            Redo
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <div className="w-80 bg-dark-secondary border-r border-dark-border flex flex-col overflow-y-auto">
          {/* Layer Management */}
          <LayerPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onLayerSelect={setActiveLayerId}
            onLayerUpdate={updateLayer}
            onLayerReorder={reorderLayers}
            selectedSize={sizeViewMode}
            onSizeViewModeChange={setSizeViewMode}
          />

          {/* Image Upload */}
          <ImageUpload
            onImageUpload={handleImageUpload}
            onIcoUpload={handleIcoUpload}
            onSvgUpload={handleSvgUpload}
            onSizeSpecificImageUpload={handleSizeSpecificImageUpload}
            autoResize={autoResize}
            onAutoResizeChange={handleAutoResizeChange}
          />

          {/* Color Controls */}
          <div className="p-4 flex-1">
            <h2 className="text-sm font-semibold mb-3 text-gray-300">COLORS</h2>
            
            {/* User Image Colors */}
            <ColorPicker
              color={layers.find(l => l.id === "user-image")?.color || { type: "solid", value: "#FFFFFF" }}
              onChange={(color) => handleColorChange("user-image", color)}
              useColor={layers.find(l => l.id === "user-image")?.useColor || false}
              onUseColorChange={(useColor) => handleUseColorChange("user-image", useColor)}
              title="User Image"
            />
            
            {/* Front Folder Colors */}
            <ColorPicker
              color={layers.find(l => l.id === "front-folder")?.color || { type: "solid", value: "#F59E0B" }}
              onChange={(color) => handleColorChange("front-folder", color)}
              useColor={layers.find(l => l.id === "front-folder")?.useColor || false}
              onUseColorChange={(useColor) => handleUseColorChange("front-folder", useColor)}
              title="Front Folder"
            />

            {/* Back Folder Colors */}
            <ColorPicker
              color={layers.find(l => l.id === "back-folder")?.color || { type: "solid", value: "#EA580C" }}
              onChange={(color) => handleColorChange("back-folder", color)}
              useColor={layers.find(l => l.id === "back-folder")?.useColor || false}
              onUseColorChange={(useColor) => handleUseColorChange("back-folder", useColor)}
              title="Back Folder"
            />

            {/* Position & Scale Controls */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Image Position & Scale</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {sizeViewMode === "global" ? "All sizes" : `${sizeViewMode}px only`}
                  </span>
                  <Switch
                    checked={sizeViewMode === "global"}
                    onCheckedChange={(checked) => setSizeViewMode(checked ? "global" : "256")}
                    data-testid="switch-position-mode"
                  />
                </div>
              </div>
              
              <div className="bg-dark-panel rounded-lg p-4 space-y-4">
                {/* Position Grid */}
                <div className="flex justify-center">
                  <div className="grid grid-cols-3 gap-1 w-fit">
                    {Array.from({ length: 9 }, (_, i) => (
                      <Button
                        key={i}
                        variant="secondary"
                        className={`w-8 h-8 p-0 transition-colors ${
                          i === selectedPositionIndex 
                            ? "bg-blue-600 hover:bg-blue-500 ring-2 ring-blue-400" 
                            : "bg-gray-600 hover:bg-gray-500"
                        }`}
                        onClick={() => handlePositionChange(i)}
                        data-testid={`button-position-${i}`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Horizontal Position */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Horizontal Position</span>
                    <Input
                      type="number"
                      value={Math.round(imagePosition.x)}
                      onChange={(e) => handleGranularPositionChange('x', parseInt(e.target.value) || 0)}
                      min="0"
                      max="256"
                      className="w-16 h-6 text-xs text-center bg-dark-primary border-dark-border"
                      data-testid="input-position-x"
                    />
                  </div>
                  <Slider
                    value={[imagePosition.x]}
                    onValueChange={([value]) => handleGranularPositionChange('x', value)}
                    min={0}
                    max={256}
                    step={1}
                    className="h-2"
                    data-testid="slider-position-x"
                  />
                </div>
                
                {/* Vertical Position */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Vertical Position</span>
                    <Input
                      type="number"
                      value={Math.round(imagePosition.y)}
                      onChange={(e) => handleGranularPositionChange('y', parseInt(e.target.value) || 0)}
                      min="0"
                      max="256"
                      className="w-16 h-6 text-xs text-center bg-dark-primary border-dark-border"
                      data-testid="input-position-y"
                    />
                  </div>
                  <Slider
                    value={[imagePosition.y]}
                    onValueChange={([value]) => handleGranularPositionChange('y', value)}
                    min={0}
                    max={256}
                    step={1}
                    className="h-2"
                    data-testid="slider-position-y"
                  />
                </div>
                
                {/* Scale */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Scale (%)</span>
                    <Input
                      type="number"
                      value={imageScale}
                      onChange={(e) => handleScaleChange(parseInt(e.target.value) || 10)}
                      min="10"
                      max="200"
                      className="w-16 h-6 text-xs text-center bg-dark-primary border-dark-border"
                      data-testid="input-scale"
                    />
                  </div>
                  <Slider
                    value={[imageScale]}
                    onValueChange={([value]) => handleScaleChange(value)}
                    min={10}
                    max={200}
                    step={5}
                    className="h-2"
                    data-testid="slider-image-scale"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <IconCanvas
          layers={layers}
          activeSize={activeSize}
          onLayerUpdate={updateLayer}
        />

        {/* Right Sidebar */}
        <div className="w-80 bg-dark-secondary border-l border-dark-border flex flex-col overflow-y-auto">
          {/* Size Previews */}
          <div className="border-b border-dark-border flex-shrink-0">
            <SizePreviews
              layers={layers}
              activeSize={activeSize}
              onSizeSelect={setActiveSize}
            />
          </div>

          {/* Export Settings */}
          <div className="p-6 border-b border-dark-border flex-shrink-0">
            <h2 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">Export Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">File Name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-dark-panel border-dark-border text-sm w-full"
                  placeholder="custom-folder"
                  data-testid="input-project-name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Format</label>
                <Select value={exportFormat} onValueChange={(value: "ico" | "png-zip") => setExportFormat(value)}>
                  <SelectTrigger className="bg-dark-panel border-dark-border text-sm w-full" data-testid="select-export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ico">.ico</SelectItem>
                    <SelectItem value="png-zip">.png (zip)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-medium text-gray-400">Include all sizes</label>
                <Switch
                  checked={includeAllSizes}
                  onCheckedChange={setIncludeAllSizes}
                  data-testid="switch-include-all-sizes"
                />
              </div>
            </div>

            <Button 
              className="w-full mt-6 bg-green-600 hover:bg-green-500 py-3 text-sm font-medium"
              onClick={handleExport}
              data-testid="button-download-ico"
            >
              <Download className="w-4 h-4 mr-2" />
              Download {exportFormat === "ico" ? "ICO" : "ZIP"} File
            </Button>
          </div>

          {/* Project Settings */}
          <div className="p-6 flex-1 min-h-0">
            <h2 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">Project</h2>
            
            <div className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full bg-dark-panel border-dark-border hover:bg-gray-600 text-sm"
                onClick={handleSaveProject}
                data-testid="button-save-project"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Project
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full bg-dark-panel border-dark-border hover:bg-gray-600 text-sm"
                onClick={handleLoadProject}
                data-testid="button-load-project"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Load Project
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full bg-dark-panel border-dark-border hover:bg-gray-600 text-sm"
                onClick={handleNewProject}
                data-testid="button-new-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            <div className="mt-8 pt-4 border-t border-dark-border">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Canvas Size:</span>
                  <span data-testid="text-canvas-size">256×256px</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Layers:</span>
                  <span data-testid="text-total-layers">{layers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span data-testid="text-file-size">~24KB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
