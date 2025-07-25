import { 
  users, 
  processedScripts, 
  sharedScripts,
  scriptLikes,
  scriptComments,
  type User, 
  type InsertUser, 
  type ProcessedScript, 
  type InsertProcessedScript,
  type SharedScript,
  type InsertSharedScript,
  type ScriptComment,
  type InsertScriptComment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Processed script operations
  getProcessedScript(id: string): Promise<ProcessedScript | undefined>;
  createProcessedScript(script: InsertProcessedScript): Promise<ProcessedScript>;
  getAllProcessedScripts(): Promise<ProcessedScript[]>;
  
  // Community sharing operations
  getSharedScripts(page?: number, limit?: number): Promise<SharedScript[]>;
  getSharedScriptById(id: string): Promise<SharedScript | undefined>;
  createSharedScript(script: InsertSharedScript): Promise<SharedScript>;
  updateSharedScript(id: string, updates: Partial<InsertSharedScript>): Promise<SharedScript | undefined>;
  deleteSharedScript(id: string, userId: string): Promise<boolean>;
  searchSharedScripts(query: string): Promise<SharedScript[]>;
  getSharedScriptsByAuthor(authorId: string): Promise<SharedScript[]>;
  
  // Like operations
  likeScript(scriptId: string, userId: string): Promise<boolean>;
  unlikeScript(scriptId: string, userId: string): Promise<boolean>;
  getUserLikedScripts(userId: string): Promise<string[]>;
  
  // Comment operations
  getScriptComments(scriptId: string): Promise<ScriptComment[]>;
  createScriptComment(comment: InsertScriptComment): Promise<ScriptComment>;
  deleteScriptComment(id: string, userId: string): Promise<boolean>;
  
  // Stats operations
  incrementScriptViews(scriptId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProcessedScript(id: string): Promise<ProcessedScript | undefined> {
    const [script] = await db.select().from(processedScripts).where(eq(processedScripts.id, id));
    return script || undefined;
  }

  async createProcessedScript(insertScript: InsertProcessedScript): Promise<ProcessedScript> {
    const [script] = await db
      .insert(processedScripts)
      .values(insertScript)
      .returning();
    return script;
  }

  async getAllProcessedScripts(): Promise<ProcessedScript[]> {
    return await db.select().from(processedScripts);
  }

  // Community sharing operations
  async getSharedScripts(page = 1, limit = 20): Promise<SharedScript[]> {
    const offset = (page - 1) * limit;
    return await db
      .select()
      .from(sharedScripts)
      .where(eq(sharedScripts.isPublic, true))
      .orderBy(desc(sharedScripts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getSharedScriptById(id: string): Promise<SharedScript | undefined> {
    const [script] = await db.select().from(sharedScripts).where(eq(sharedScripts.id, id));
    return script || undefined;
  }

  async createSharedScript(insertScript: InsertSharedScript): Promise<SharedScript> {
    const [script] = await db
      .insert(sharedScripts)
      .values(insertScript)
      .returning();
    return script;
  }

  async updateSharedScript(id: string, updates: Partial<InsertSharedScript>): Promise<SharedScript | undefined> {
    const [script] = await db
      .update(sharedScripts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sharedScripts.id, id))
      .returning();
    return script || undefined;
  }

  async deleteSharedScript(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(sharedScripts)
      .where(and(eq(sharedScripts.id, id), eq(sharedScripts.authorId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async searchSharedScripts(query: string): Promise<SharedScript[]> {
    return await db
      .select()
      .from(sharedScripts)
      .where(
        and(
          eq(sharedScripts.isPublic, true),
          sql`${sharedScripts.title} ILIKE ${`%${query}%`} OR ${sharedScripts.description} ILIKE ${`%${query}%`}`
        )
      )
      .orderBy(desc(sharedScripts.createdAt));
  }

  async getSharedScriptsByAuthor(authorId: string): Promise<SharedScript[]> {
    return await db
      .select()
      .from(sharedScripts)
      .where(eq(sharedScripts.authorId, authorId))
      .orderBy(desc(sharedScripts.createdAt));
  }

  // Like operations
  async likeScript(scriptId: string, userId: string): Promise<boolean> {
    try {
      await db.insert(scriptLikes).values({ scriptId, userId });
      await db
        .update(sharedScripts)
        .set({ likes: sql`${sharedScripts.likes} + 1` })
        .where(eq(sharedScripts.id, scriptId));
      return true;
    } catch {
      return false; // Already liked or script doesn't exist
    }
  }

  async unlikeScript(scriptId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(scriptLikes)
      .where(and(eq(scriptLikes.scriptId, scriptId), eq(scriptLikes.userId, userId)));
    
    if ((result.rowCount ?? 0) > 0) {
      await db
        .update(sharedScripts)
        .set({ likes: sql`${sharedScripts.likes} - 1` })
        .where(eq(sharedScripts.id, scriptId));
      return true;
    }
    return false;
  }

  async getUserLikedScripts(userId: string): Promise<string[]> {
    const likes = await db
      .select({ scriptId: scriptLikes.scriptId })
      .from(scriptLikes)
      .where(eq(scriptLikes.userId, userId));
    return likes.map(like => like.scriptId).filter((id): id is string => id !== null);
  }

  // Comment operations
  async getScriptComments(scriptId: string): Promise<ScriptComment[]> {
    return await db
      .select()
      .from(scriptComments)
      .where(eq(scriptComments.scriptId, scriptId))
      .orderBy(desc(scriptComments.createdAt));
  }

  async createScriptComment(insertComment: InsertScriptComment): Promise<ScriptComment> {
    const [comment] = await db
      .insert(scriptComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async deleteScriptComment(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(scriptComments)
      .where(and(eq(scriptComments.id, id), eq(scriptComments.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Stats operations
  async incrementScriptViews(scriptId: string): Promise<void> {
    await db
      .update(sharedScripts)
      .set({ views: sql`${sharedScripts.views} + 1` })
      .where(eq(sharedScripts.id, scriptId));
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private processedScripts: Map<string, ProcessedScript>;

  constructor() {
    this.users = new Map();
    this.processedScripts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProcessedScript(id: string): Promise<ProcessedScript | undefined> {
    return this.processedScripts.get(id);
  }

  async createProcessedScript(insertScript: InsertProcessedScript): Promise<ProcessedScript> {
    const id = randomUUID();
    const script: ProcessedScript = { 
      ...insertScript, 
      id,
      settings: insertScript.settings ?? null,
      inputLines: insertScript.inputLines ?? 0,
      outputLines: insertScript.outputLines ?? 0,
      variablesRenamed: insertScript.variablesRenamed ?? 0,
      stringsEncoded: insertScript.stringsEncoded ?? 0,
      processingTime: insertScript.processingTime ?? 0,
      createdAt: new Date()
    };
    this.processedScripts.set(id, script);
    return script;
  }

  async getAllProcessedScripts(): Promise<ProcessedScript[]> {
    return Array.from(this.processedScripts.values());
  }

  // Community sharing stubs (not implemented for MemStorage)
  async getSharedScripts(): Promise<SharedScript[]> { return []; }
  async getSharedScriptById(): Promise<SharedScript | undefined> { return undefined; }
  async createSharedScript(): Promise<SharedScript> { throw new Error("Not implemented"); }
  async updateSharedScript(): Promise<SharedScript | undefined> { return undefined; }
  async deleteSharedScript(): Promise<boolean> { return false; }
  async searchSharedScripts(): Promise<SharedScript[]> { return []; }
  async getSharedScriptsByAuthor(): Promise<SharedScript[]> { return []; }
  async likeScript(): Promise<boolean> { return false; }
  async unlikeScript(): Promise<boolean> { return false; }
  async getUserLikedScripts(): Promise<string[]> { return []; }
  async getScriptComments(): Promise<ScriptComment[]> { return []; }
  async createScriptComment(): Promise<ScriptComment> { throw new Error("Not implemented"); }
  async deleteScriptComment(): Promise<boolean> { return false; }
  async incrementScriptViews(): Promise<void> { return; }
}

export const storage = new DatabaseStorage();
