import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  executionTime: number; // milliseconds
  memoryUsage: number; // bytes
  codeComplexity: CodeComplexityMetrics;
  performanceScore: number; // 0-100 scale
  recommendations: string[];
}

export interface CodeComplexityMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  functionCount: number;
  variableCount: number;
  loopCount: number;
  conditionalCount: number;
  stringLiteralCount: number;
  commentLines: number;
  codeSize: number; // bytes
}

export interface BenchmarkComparison {
  original: BenchmarkResult;
  obfuscated: BenchmarkResult;
  performance: {
    executionTimeRatio: number; // obfuscated/original
    memoryUsageRatio: number;
    codeSizeRatio: number;
    complexityIncrease: number;
  };
  summary: {
    performanceImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
    recommendations: string[];
    optimizationScore: number; // 0-100
  };
}

export class BenchmarkService {
  /**
   * Analyze code complexity and structure
   */
  analyzeCodeComplexity(code: string): CodeComplexityMetrics {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => line.trim().startsWith('--')).length;
    
    // Count various code elements using regex patterns
    const functionCount = (code.match(/function\s+\w+\s*\(/g) || []).length + 
                         (code.match(/local\s+function\s+\w+\s*\(/g) || []).length;
    
    const variableCount = (code.match(/local\s+\w+/g) || []).length +
                         (code.match(/\w+\s*=/g) || []).length;
    
    const loopCount = (code.match(/\bfor\b|\bwhile\b|\brepeat\b/g) || []).length;
    
    const conditionalCount = (code.match(/\bif\b|\belseif\b/g) || []).length;
    
    const stringLiteralCount = (code.match(/"[^"]*"|'[^']*'/g) || []).length;
    
    // Calculate cyclomatic complexity (simplified)
    const cyclomaticComplexity = 1 + conditionalCount + loopCount + 
                                (code.match(/\band\b|\bor\b/g) || []).length;
    
    return {
      cyclomaticComplexity,
      linesOfCode: nonEmptyLines.length,
      functionCount,
      variableCount,
      loopCount,
      conditionalCount,
      stringLiteralCount,
      commentLines,
      codeSize: Buffer.byteLength(code, 'utf8')
    };
  }

  /**
   * Simulate execution time based on code complexity
   */
  simulateExecutionTime(complexity: CodeComplexityMetrics): number {
    // Base execution time factors
    const baseTime = 0.1; // 100μs base
    const functionWeight = 0.05;
    const loopWeight = 0.2;
    const conditionalWeight = 0.02;
    const variableWeight = 0.001;
    const complexityWeight = 0.03;
    
    const estimatedTime = baseTime + 
      (complexity.functionCount * functionWeight) +
      (complexity.loopCount * loopWeight) +
      (complexity.conditionalCount * conditionalWeight) +
      (complexity.variableCount * variableWeight) +
      (complexity.cyclomaticComplexity * complexityWeight);
    
    // Add some randomness to simulate real execution variance (±10%)
    const variance = 0.1;
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    
    return Math.max(0.01, estimatedTime * randomFactor);
  }

  /**
   * Estimate memory usage based on code structure
   */
  estimateMemoryUsage(complexity: CodeComplexityMetrics): number {
    // Base memory usage factors (in bytes)
    const baseMemory = 1024; // 1KB base
    const variableMemory = 64; // 64 bytes per variable
    const functionMemory = 256; // 256 bytes per function
    const stringMemory = 32; // 32 bytes per string literal
    const codeMemory = complexity.codeSize * 1.2; // 20% overhead for parsed code
    
    return baseMemory + 
      (complexity.variableCount * variableMemory) +
      (complexity.functionCount * functionMemory) +
      (complexity.stringLiteralCount * stringMemory) +
      codeMemory;
  }

  /**
   * Calculate performance score based on various metrics
   */
  calculatePerformanceScore(complexity: CodeComplexityMetrics, executionTime: number, memoryUsage: number): number {
    // Normalize metrics to 0-1 scale
    const timeScore = Math.max(0, 1 - (executionTime / 10)); // 10ms = 0 score
    const memoryScore = Math.max(0, 1 - (memoryUsage / (1024 * 1024))); // 1MB = 0 score
    const complexityScore = Math.max(0, 1 - (complexity.cyclomaticComplexity / 50)); // 50 complexity = 0 score
    const sizeScore = Math.max(0, 1 - (complexity.codeSize / (50 * 1024))); // 50KB = 0 score
    
    // Weighted average
    const score = (timeScore * 0.3) + (memoryScore * 0.3) + (complexityScore * 0.2) + (sizeScore * 0.2);
    
    return Math.round(score * 100);
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(complexity: CodeComplexityMetrics, executionTime: number, memoryUsage: number): string[] {
    const recommendations: string[] = [];
    
    if (executionTime > 5) {
      recommendations.push("Consider optimizing loops and recursive functions for better execution time");
    }
    
    if (memoryUsage > 512 * 1024) {
      recommendations.push("High memory usage detected - consider reducing variable scope and string operations");
    }
    
    if (complexity.cyclomaticComplexity > 20) {
      recommendations.push("High code complexity - consider breaking down large functions");
    }
    
    if (complexity.functionCount < 3 && complexity.linesOfCode > 50) {
      recommendations.push("Consider modularizing code into smaller functions for better maintainability");
    }
    
    if (complexity.stringLiteralCount > 20) {
      recommendations.push("Many string literals detected - string encoding may significantly impact performance");
    }
    
    if (complexity.loopCount > 10) {
      recommendations.push("Multiple loops detected - control flow obfuscation may add substantial overhead");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Code structure looks optimal for obfuscation");
    }
    
    return recommendations;
  }

  /**
   * Benchmark a single script
   */
  async benchmarkScript(code: string): Promise<BenchmarkResult> {
    const startTime = performance.now();
    
    // Analyze code complexity
    const complexity = this.analyzeCodeComplexity(code);
    
    // Simulate execution metrics
    const executionTime = this.simulateExecutionTime(complexity);
    const memoryUsage = this.estimateMemoryUsage(complexity);
    
    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(complexity, executionTime, memoryUsage);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(complexity, executionTime, memoryUsage);
    
    const endTime = performance.now();
    console.log(`Benchmark analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      executionTime,
      memoryUsage,
      codeComplexity: complexity,
      performanceScore,
      recommendations
    };
  }

  /**
   * Compare original vs obfuscated script performance
   */
  async compareBenchmarks(originalCode: string, obfuscatedCode: string): Promise<BenchmarkComparison> {
    const [original, obfuscated] = await Promise.all([
      this.benchmarkScript(originalCode),
      this.benchmarkScript(obfuscatedCode)
    ]);
    
    // Calculate performance ratios
    const executionTimeRatio = obfuscated.executionTime / original.executionTime;
    const memoryUsageRatio = obfuscated.memoryUsage / original.memoryUsage;
    const codeSizeRatio = obfuscated.codeComplexity.codeSize / original.codeComplexity.codeSize;
    const complexityIncrease = obfuscated.codeComplexity.cyclomaticComplexity - original.codeComplexity.cyclomaticComplexity;
    
    // Determine performance impact level
    let performanceImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
    const avgRatio = (executionTimeRatio + memoryUsageRatio) / 2;
    
    if (avgRatio <= 1.2) {
      performanceImpact = 'minimal';
    } else if (avgRatio <= 1.5) {
      performanceImpact = 'moderate';
    } else if (avgRatio <= 2.0) {
      performanceImpact = 'significant';
    } else {
      performanceImpact = 'severe';
    }
    
    // Generate comparison recommendations
    const recommendations: string[] = [];
    
    if (executionTimeRatio > 1.5) {
      recommendations.push("Obfuscation significantly impacts execution time - consider lighter settings");
    }
    
    if (memoryUsageRatio > 1.3) {
      recommendations.push("Memory usage increased substantially - review string encoding settings");
    }
    
    if (codeSizeRatio > 2.0) {
      recommendations.push("Code size doubled - consider reducing obfuscation intensity");
    }
    
    if (complexityIncrease > 15) {
      recommendations.push("Code complexity increased significantly - may affect readability during debugging");
    }
    
    if (performanceImpact === 'minimal') {
      recommendations.push("Excellent obfuscation efficiency with minimal performance impact");
    }
    
    // Calculate optimization score (inverse of performance impact)
    const optimizationScore = Math.round(Math.max(0, 100 - (avgRatio - 1) * 100));
    
    return {
      original,
      obfuscated,
      performance: {
        executionTimeRatio,
        memoryUsageRatio,
        codeSizeRatio,
        complexityIncrease
      },
      summary: {
        performanceImpact,
        recommendations,
        optimizationScore
      }
    };
  }
}

export const benchmarkService = new BenchmarkService();