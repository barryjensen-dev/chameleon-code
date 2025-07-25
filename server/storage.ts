import { users, processedScripts, type User, type InsertUser, type ProcessedScript, type InsertProcessedScript } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProcessedScript(id: string): Promise<ProcessedScript | undefined>;
  createProcessedScript(script: InsertProcessedScript): Promise<ProcessedScript>;
  getAllProcessedScripts(): Promise<ProcessedScript[]>;
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
      processingTime: insertScript.processingTime ?? 0
    };
    this.processedScripts.set(id, script);
    return script;
  }

  async getAllProcessedScripts(): Promise<ProcessedScript[]> {
    return Array.from(this.processedScripts.values());
  }
}

export const storage = new DatabaseStorage();
