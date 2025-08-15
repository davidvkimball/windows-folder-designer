import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const iconProjects = pgTable("icon_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  layers: jsonb("layers").notNull(),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertIconProjectSchema = createInsertSchema(iconProjects).pick({
  name: true,
  layers: true,
  settings: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertIconProject = z.infer<typeof insertIconProjectSchema>;
export type IconProject = typeof iconProjects.$inferSelect;

// Icon-specific types
export const LayerType = z.enum(["back-folder", "front-folder", "user-image"]);
export const ColorType = z.enum(["solid", "linear", "radial"]);
export const IconSize = z.enum(["16", "20", "24", "32", "40", "64", "256"]);

export const ColorSchema = z.object({
  type: ColorType,
  value: z.string(), // hex color or gradient definition
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
  useColor: z.boolean().optional(), // Add useColor field for user-image layer
  imageUrl: z.string().optional(),
  sizeSpecificImages: z.record(z.string(), z.string()).optional(), // For ICO and SVG uploads
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  scale: z.number().min(0.1).max(2),
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
