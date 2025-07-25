import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processRequestSchema } from "@shared/schema";
import { processLuaCode } from "./services/luaProcessor";

export async function registerRoutes(app: Express): Promise<Server> {
  // Process Lua code endpoint
  app.post("/api/process", async (req, res) => {
    try {
      const validatedData = processRequestSchema.parse(req.body);
      
      const startTime = Date.now();
      const result = await processLuaCode(validatedData);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Calculate stats
      const inputLines = validatedData.inputCode.split('\n').length;
      const outputLines = result.outputCode.split('\n').length;

      // Store the processed script
      const processedScript = await storage.createProcessedScript({
        inputCode: validatedData.inputCode,
        outputCode: result.outputCode,
        mode: validatedData.mode,
        settings: validatedData.settings ? JSON.stringify(validatedData.settings) : null,
        inputLines,
        outputLines,
        variablesRenamed: result.variablesRenamed,
        stringsEncoded: result.stringsEncoded,
        processingTime,
      });

      res.json({
        id: processedScript.id,
        outputCode: result.outputCode,
        inputLines,
        outputLines,
        variablesRenamed: result.variablesRenamed,
        stringsEncoded: result.stringsEncoded,
        processingTime,
      });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Processing failed' 
      });
    }
  });

  // Get processing history
  app.get("/api/history", async (req, res) => {
    try {
      const scripts = await storage.getAllProcessedScripts();
      res.json(scripts);
    } catch (error) {
      console.error('History retrieval error:', error);
      res.status(500).json({ message: 'Failed to retrieve history' });
    }
  });

  // Get specific processed script
  app.get("/api/script/:id", async (req, res) => {
    try {
      const script = await storage.getProcessedScript(req.params.id);
      if (!script) {
        return res.status(404).json({ message: 'Script not found' });
      }
      res.json(script);
    } catch (error) {
      console.error('Script retrieval error:', error);
      res.status(500).json({ message: 'Failed to retrieve script' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
