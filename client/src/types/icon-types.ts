import { z } from "zod";

export const LayerType = z.enum(["back-folder", "front-folder", "user-image"]);
export const ColorType = z.enum(["solid", "linear", "radial"]);
export const IconSize = z.enum(["16", "20", "24", "32", "40", "64", "256"]);

export const ColorSchema = z.object({
  type: ColorType,
  value: z.string(),
  gradient: z.object({
    start: z.string(),
    end: z.string(),
    direction: z.number().optional(),
  }).optional(),
});

export const LayerSchema = z.object({
  id: z.string(),
  type: LayerType,
  visible: z.boolean(),
  opacity: z.number().min(0).max(100),
  color: ColorSchema.optional(),
  useColor: z.boolean().default(false), // Toggle for color overlay
  imageUrl: z.string().optional(),
  sizeSpecificImages: z.record(z.string()).optional(), // Size-specific images for ICO uploads
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  scale: z.number().min(0.1).max(2),
  order: z.number(), // Layer order for drag and drop
  visibilityBySize: z.record(z.boolean()).optional(), // Per-size visibility overrides
  positionBySize: z.record(z.object({
    x: z.number(),
    y: z.number(),
  })).optional(), // Per-size position overrides
  scaleBySize: z.record(z.number()).optional(), // Per-size scale overrides
});

export const IconProjectSettingsSchema = z.object({
  name: z.string(),
  exportFormat: z.enum(["ico", "png-zip"]),
  includeAllSizes: z.boolean(),
  customSizes: z.array(IconSize).optional(),
});

export type Layer = z.infer<typeof LayerSchema>;
export type Color = z.infer<typeof ColorSchema>;
export type IconProjectSettings = z.infer<typeof IconProjectSettingsSchema>;
export type LayerType = z.infer<typeof LayerType>;
export type ColorType = z.infer<typeof ColorType>;
export type IconSize = z.infer<typeof IconSize>;
