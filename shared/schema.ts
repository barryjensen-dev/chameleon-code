import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const processedScripts = pgTable("processed_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inputCode: text("input_code").notNull(),
  outputCode: text("output_code").notNull(),
  mode: text("mode").notNull(), // 'obfuscate' or 'deobfuscate'
  settings: text("settings"), // JSON string of settings
  inputLines: integer("input_lines").default(0),
  outputLines: integer("output_lines").default(0),
  variablesRenamed: integer("variables_renamed").default(0),
  stringsEncoded: integer("strings_encoded").default(0),
  processingTime: integer("processing_time").default(0), // in milliseconds
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProcessedScriptSchema = createInsertSchema(processedScripts).omit({
  id: true,
});

export const processRequestSchema = z.object({
  inputCode: z.string().min(1, "Input code is required"),
  mode: z.enum(["obfuscate", "deobfuscate"]),
  settings: z.object({
    variableRenaming: z.boolean().default(true),
    stringEncoding: z.boolean().default(true),
    controlFlowObfuscation: z.boolean().default(false),
    obfuscationLevel: z.enum(["light", "medium", "heavy"]).default("medium"),
  }).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ProcessedScript = typeof processedScripts.$inferSelect;
export type InsertProcessedScript = z.infer<typeof insertProcessedScriptSchema>;
export type ProcessRequest = z.infer<typeof processRequestSchema>;
