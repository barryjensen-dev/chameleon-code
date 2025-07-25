import { type User, type InsertUser, type ProcessedScript, type InsertProcessedScript } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProcessedScript(id: string): Promise<ProcessedScript | undefined>;
  createProcessedScript(script: InsertProcessedScript): Promise<ProcessedScript>;
  getAllProcessedScripts(): Promise<ProcessedScript[]>;
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
    const script: ProcessedScript = { ...insertScript, id };
    this.processedScripts.set(id, script);
    return script;
  }

  async getAllProcessedScripts(): Promise<ProcessedScript[]> {
    return Array.from(this.processedScripts.values());
  }
}

export const storage = new MemStorage();
