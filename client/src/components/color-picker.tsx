import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Color, ColorType } from "@/types/icon-types";

interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  title: string;
  useColor: boolean;
  onUseColorChange: (useColor: boolean) => void;
}

const presetColors = [
  "#FFFFFF", "#000000", "#C99101", "#A26D00", "#F97316", "#EA580C",
  "#DC2626", "#EC4899", "#A855F7", "#8B5CF6", "#6366F1", "#3B82F6", 
  "#0EA5E9", "#06B6D4", "#10B981", "#22C55E", "#84CC16", "#65A30D"
];

export function ColorPicker({ color, onChange, title, useColor, onUseColorChange }: ColorPickerProps) {
  const [activeType, setActiveType] = useState<ColorType>(color.type);

  const handleTypeChange = (type: ColorType) => {
    setActiveType(type);
    
    if (type === "solid") {
      onChange({
        type,
        value: color.value,
      });
    } else {
      onChange({
        type,
        value: color.value,
        gradient: color.gradient || {
          start: color.value,
          end: "#000000",
          direction: 45,
        },
      });
    }
  };

  const handleColorChange = (newColor: string) => {
    if (activeType === "solid") {
      onChange({
        ...color,
        type: activeType,
        value: newColor,
      });
    } else {
      onChange({
        ...color,
        type: activeType,
        value: newColor, // Keep this for compatibility 
        gradient: {
          start: newColor,
          end: color.gradient?.end || "#000000",
          direction: color.gradient?.direction || 45,
        },
      });
    }
  };

  const handleGradientEndChange = (endColor: string) => {
    onChange({
      ...color,
      type: activeType,
      gradient: {
        start: color.gradient?.start || color.value,
        end: endColor,
        direction: color.gradient?.direction || 45,
      },
    });
  };

  return (
    <div className="mb-6">
      {/* Color Toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Color</span>
          <Switch
            checked={useColor}
            onCheckedChange={onUseColorChange}
            data-testid={`switch-color-${title.toLowerCase().replace(' ', '-')}`}
          />
        </div>
      </div>

      {/* Color Controls - only show when useColor is enabled */}
      {useColor && (
        <div className="space-y-3">
          {/* Color type buttons */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Type</span>
            <div className="flex space-x-1">
              <Button
                variant={activeType === "solid" ? "default" : "secondary"}
                size="sm"
                onClick={() => handleTypeChange("solid")}
                className={`px-2 py-1 text-xs ${
                  activeType === "solid" 
                    ? "bg-blue-600 hover:bg-blue-500" 
                    : "bg-gray-700 hover:bg-gray-600 border border-gray-600"
                }`}
                data-testid={`button-color-type-solid-${title.toLowerCase().replace(" ", "-")}`}
              >
                Solid
              </Button>
              <Button
                variant={activeType === "linear" ? "default" : "secondary"}
                size="sm"
                onClick={() => handleTypeChange("linear")}
                className={`px-2 py-1 text-xs ${
                  activeType === "linear" 
                    ? "bg-blue-600 hover:bg-blue-500" 
                    : "bg-gray-700 hover:bg-gray-600 border border-gray-600"
                }`}
                data-testid={`button-color-type-linear-${title.toLowerCase().replace(" ", "-")}`}
              >
                Linear
              </Button>
              <Button
                variant={activeType === "radial" ? "default" : "secondary"}
                size="sm"
                onClick={() => handleTypeChange("radial")}
                className={`px-2 py-1 text-xs ${
                  activeType === "radial" 
                    ? "bg-blue-600 hover:bg-blue-500" 
                    : "bg-gray-700 hover:bg-gray-600 border border-gray-600"
                }`}
                data-testid={`button-color-type-radial-${title.toLowerCase().replace(" ", "-")}`}
              >
                Radial
              </Button>
            </div>
          </div>
          
          <div className="bg-dark-panel rounded-lg p-3 mb-3">
            {/* Color preview and input */}
            <div className="flex items-center space-x-3 mb-3">
              <div 
                className="w-8 h-8 rounded border-2 border-gray-500 cursor-pointer"
                style={{
                  background: activeType === "solid" 
                    ? color.value 
                    : `linear-gradient(45deg, ${color.gradient?.start || color.value}, ${color.gradient?.end || "#000000"})`
                }}
                data-testid={`color-preview-${title.toLowerCase().replace(" ", "-")}`}
              />
              <Input
                type="text"
                value={activeType === "solid" ? color.value : color.gradient?.start || color.value}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 bg-dark-primary border-dark-border text-sm h-8"
                data-testid={`input-color-${title.toLowerCase().replace(" ", "-")}`}
              />
            </div>

            {/* Gradient end color input */}
            {activeType !== "solid" && (
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="w-8 h-8 rounded border-2 border-gray-500 cursor-pointer"
                  style={{ background: color.gradient?.end || "#000000" }}
                />
                <Input
                  type="text"
                  value={color.gradient?.end || "#000000"}
                  onChange={(e) => handleGradientEndChange(e.target.value)}
                  className="flex-1 bg-dark-primary border-dark-border text-sm h-8"
                  placeholder="End color"
                  data-testid={`input-gradient-end-${title.toLowerCase().replace(" ", "-")}`}
                />
              </div>
            )}

            {/* Preset colors for gradient end */}
            {activeType !== "solid" && (
              <div className="mb-3">
                <span className="text-xs text-gray-400 mb-2 block">End Color Presets</span>
                <div className="grid grid-cols-9 gap-1">
                  {presetColors.map((presetColor) => (
                    <button
                      key={`end-${presetColor}`}
                      className={`w-6 h-6 rounded border-2 hover:border-gray-300 transition-colors ${
                        presetColor === "#FFFFFF" 
                          ? "border-gray-400 hover:border-gray-200" 
                          : "border-gray-500"
                      }`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => handleGradientEndChange(presetColor)}
                      data-testid={`preset-end-color-${presetColor.slice(1)}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Preset colors */}
            <div className="mb-3">
              <span className="text-xs text-gray-400 mb-2 block">
                {activeType === "solid" ? "Colors" : "Start Color Presets"}
              </span>
              <div className="grid grid-cols-9 gap-1">
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    className={`w-6 h-6 rounded border-2 hover:border-gray-300 transition-colors ${
                      presetColor === "#FFFFFF" 
                        ? "border-gray-400 hover:border-gray-200" 
                        : "border-gray-500"
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handleColorChange(presetColor)}
                    data-testid={`preset-color-${presetColor.slice(1)}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}