import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedScripts = pgTable("shared_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  inputCode: text("input_code").notNull(),
  outputCode: text("output_code").notNull(),
  mode: text("mode").notNull(), // 'obfuscate' or 'deobfuscate'
  settings: text("settings"), // JSON string of settings
  authorId: varchar("author_id").references(() => users.id),
  authorName: text("author_name").notNull(), // denormalized for performance
  isPublic: boolean("is_public").default(true),
  tags: text("tags").array(),
  likes: integer("likes").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scriptLikes = pgTable("script_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptId: varchar("script_id").references(() => sharedScripts.id),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scriptComments = pgTable("script_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptId: varchar("script_id").references(() => sharedScripts.id),
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name").notNull(), // denormalized for performance
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sharedScripts: many(sharedScripts),
  scriptLikes: many(scriptLikes),
  scriptComments: many(scriptComments),
}));

export const sharedScriptsRelations = relations(sharedScripts, ({ one, many }) => ({
  author: one(users, {
    fields: [sharedScripts.authorId],
    references: [users.id],
  }),
  likes: many(scriptLikes),
  comments: many(scriptComments),
}));

export const scriptLikesRelations = relations(scriptLikes, ({ one }) => ({
  script: one(sharedScripts, {
    fields: [scriptLikes.scriptId],
    references: [sharedScripts.id],
  }),
  user: one(users, {
    fields: [scriptLikes.userId],
    references: [users.id],
  }),
}));

export const scriptCommentsRelations = relations(scriptComments, ({ one }) => ({
  script: one(sharedScripts, {
    fields: [scriptComments.scriptId],
    references: [sharedScripts.id],
  }),
  user: one(users, {
    fields: [scriptComments.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProcessedScriptSchema = createInsertSchema(processedScripts).omit({
  id: true,
  createdAt: true,
});

export const insertSharedScriptSchema = createInsertSchema(sharedScripts).omit({
  id: true,
  likes: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScriptCommentSchema = createInsertSchema(scriptComments).omit({
  id: true,
  createdAt: true,
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

export const shareScriptSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  inputCode: z.string().min(1, "Input code is required"),
  outputCode: z.string().min(1, "Output code is required"),
  mode: z.enum(["obfuscate", "deobfuscate"]),
  settings: z.string().optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ProcessedScript = typeof processedScripts.$inferSelect;
export type InsertProcessedScript = z.infer<typeof insertProcessedScriptSchema>;
export type ProcessRequest = z.infer<typeof processRequestSchema>;
export type SharedScript = typeof sharedScripts.$inferSelect;
export type InsertSharedScript = z.infer<typeof insertSharedScriptSchema>;
export type ScriptComment = typeof scriptComments.$inferSelect;
export type InsertScriptComment = z.infer<typeof insertScriptCommentSchema>;
export type ShareScriptRequest = z.infer<typeof shareScriptSchema>;
