import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processRequestSchema, shareScriptSchema, insertScriptCommentSchema } from "@shared/schema";
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

  // Community sharing routes
  
  // Get shared scripts with pagination
  app.get("/api/community/scripts", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      
      let scripts;
      if (search) {
        scripts = await storage.searchSharedScripts(search);
      } else {
        scripts = await storage.getSharedScripts(page, limit);
      }
      
      res.json(scripts);
    } catch (error) {
      console.error('Shared scripts retrieval error:', error);
      res.status(500).json({ message: 'Failed to retrieve shared scripts' });
    }
  });

  // Get specific shared script by ID
  app.get("/api/community/scripts/:id", async (req, res) => {
    try {
      const script = await storage.getSharedScriptById(req.params.id);
      if (!script) {
        return res.status(404).json({ message: 'Shared script not found' });
      }
      
      // Increment views
      await storage.incrementScriptViews(req.params.id);
      
      res.json(script);
    } catch (error) {
      console.error('Shared script retrieval error:', error);
      res.status(500).json({ message: 'Failed to retrieve shared script' });
    }
  });

  // Share a script to the community
  app.post("/api/community/share", async (req, res) => {
    try {
      const validatedData = shareScriptSchema.parse(req.body);
      
      // For now, use a default author name (in real app, this would come from auth)
      const sharedScript = await storage.createSharedScript({
        ...validatedData,
        authorId: 'anonymous',
        authorName: 'Anonymous User',
        settings: validatedData.settings || null,
      });

      res.json(sharedScript);
    } catch (error) {
      console.error('Script sharing error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to share script' 
      });
    }
  });

  // Like/unlike a shared script
  app.post("/api/community/scripts/:id/like", async (req, res) => {
    try {
      const scriptId = req.params.id;
      const userId = req.body.userId || 'anonymous'; // In real app, from auth
      const action = req.body.action; // 'like' or 'unlike'
      
      let success;
      if (action === 'like') {
        success = await storage.likeScript(scriptId, userId);
      } else if (action === 'unlike') {
        success = await storage.unlikeScript(scriptId, userId);
      } else {
        return res.status(400).json({ message: 'Invalid action. Use "like" or "unlike"' });
      }
      
      res.json({ success });
    } catch (error) {
      console.error('Like/unlike error:', error);
      res.status(500).json({ message: 'Failed to process like/unlike' });
    }
  });

  // Get comments for a shared script
  app.get("/api/community/scripts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getScriptComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error('Comments retrieval error:', error);
      res.status(500).json({ message: 'Failed to retrieve comments' });
    }
  });

  // Add a comment to a shared script
  app.post("/api/community/scripts/:id/comments", async (req, res) => {
    try {
      const scriptId = req.params.id;
      const commentData = insertScriptCommentSchema.parse({
        ...req.body,
        scriptId,
        userId: req.body.userId || 'anonymous', // In real app, from auth
        userName: req.body.userName || 'Anonymous User'
      });
      
      const comment = await storage.createScriptComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error('Comment creation error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to create comment' 
      });
    }
  });

  // Get scripts by author
  app.get("/api/community/authors/:authorId/scripts", async (req, res) => {
    try {
      const scripts = await storage.getSharedScriptsByAuthor(req.params.authorId);
      res.json(scripts);
    } catch (error) {
      console.error('Author scripts retrieval error:', error);
      res.status(500).json({ message: 'Failed to retrieve author scripts' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
