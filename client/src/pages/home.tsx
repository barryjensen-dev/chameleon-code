import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Unlock, Play, Download, Upload, Share, Settings, HelpCircle, Cog, GitCompare, Eye, Users } from 'lucide-react';
import { Link } from 'wouter';
import MonacoEditor from '@/components/MonacoEditor';
import CodeDiffViewer from '@/components/CodeDiffViewer';
import type { ProcessRequest } from '@shared/schema';

interface ProcessingStats {
  inputLines: number;
  outputLines: number;
  variablesRenamed: number;
  stringsEncoded: number;
  processingTime: number;
}

const defaultLuaCode = `-- Paste your Lua code here
-- Example: Roblox script

local player = game.Players.LocalPlayer
local character = player.Character
local humanoid = character:WaitForChild('Humanoid')

function makePlayerJump()
    if humanoid then
        humanoid.Jump = true
        print('Player jumped!')
    end
end

-- Connect to user input
game:GetService('UserInputService').InputBegan:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.Space then
        makePlayerJump()
    end
end)`;

export default function Home() {
  const [currentMode, setCurrentMode] = useState<'obfuscate' | 'deobfuscate'>('obfuscate');
  const [inputCode, setInputCode] = useState(defaultLuaCode);
  const [outputCode, setOutputCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState({
    variableRenaming: true,
    stringEncoding: true,
    controlFlowObfuscation: false,
    obfuscationLevel: 'medium' as 'light' | 'medium' | 'heavy',
  });
  const [stats, setStats] = useState<ProcessingStats>({
    inputLines: 0,
    outputLines: 0,
    variablesRenamed: 0,
    stringsEncoded: 0,
    processingTime: 0,
  });
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [activeTab, setActiveTab] = useState<'editor' | 'diff'>('editor');
  const [diffViewMode, setDiffViewMode] = useState<'side-by-side' | 'inline'>('side-by-side');

  const { toast } = useToast();

  const processMutation = useMutation({
    mutationFn: async (data: ProcessRequest) => {
      try {
        const response = await apiRequest('POST', '/api/process', data);
        return await response.json();
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Processing failed');
      }
    },
    onSuccess: (data) => {
      setOutputCode(data.outputCode);
      setStats({
        inputLines: data.inputLines,
        outputLines: data.outputLines,
        variablesRenamed: data.variablesRenamed,
        stringsEncoded: data.stringsEncoded,
        processingTime: data.processingTime,
      });
      setStatusMessage(currentMode === 'obfuscate' ? 'Code obfuscated successfully' : 'Code deobfuscated successfully');
      toast({
        title: 'Success',
        description: `Code ${currentMode}d successfully in ${data.processingTime}ms`,
      });
      
      // Switch to diff view after successful processing if we have both codes
      setTimeout(() => {
        if (data.outputCode && inputCode) {
          setActiveTab('diff');
        }
      }, 500);
    },
    onError: (error) => {
      setStatusMessage('Processing failed');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
      setProgress(0);
    },
  });

  const handleProcess = () => {
    if (!inputCode.trim()) {
      setStatusMessage('Please enter some Lua code first');
      toast({
        title: 'Error',
        description: 'Please enter some Lua code first',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 30;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    setTimeout(() => {
      processMutation.mutate({
        inputCode,
        mode: currentMode,
        settings: currentMode === 'obfuscate' ? settings : undefined,
      });
      clearInterval(progressInterval);
    }, 1500);
  };

  const handleDownload = () => {
    if (!outputCode) return;

    const blob = new Blob([outputCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentMode === 'obfuscate' ? 'obfuscated_script.lua' : 'deobfuscated_script.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage('File downloaded successfully');
    toast({
      title: 'Success',
      description: 'File downloaded successfully',
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInputCode(content);
      setStatusMessage('File loaded successfully');
      toast({
        title: 'Success',
        description: 'File loaded successfully',
      });
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const lineCount = inputCode.split('\n').length;
    setStats(prev => ({ ...prev, inputLines: lineCount }));
    
    if (inputCode.trim()) {
      setStatusMessage('Ready to process');
    } else {
      setStatusMessage('Enter Lua code to begin');
    }
  }, [inputCode]);

  return (
    <div className="h-screen flex flex-col bg-editor-dark text-editor-text">
      {/* Header */}
      <header className="bg-sidebar-dark border-b border-border-dark px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="text-roblox-blue text-xl" />
              <h1 className="text-xl font-semibold text-white">Chameleon Code</h1>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-400">
              <span className="px-2 py-1 bg-editor-grey rounded">v2.1.0</span>
              <span>•</span>
              <span>Lua Obfuscator</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/community">
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-roblox-blue hover:bg-editor-grey transition-colors">
                <Users className="w-4 h-4 mr-2" />
                Community
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-sidebar-dark border-r border-border-dark flex flex-col">
          {/* Process Controls */}
          <div className="p-4 border-b border-border-dark">
            <h3 className="text-sm font-medium text-white mb-4">Processing Options</h3>
            
            {/* Mode Selection */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Mode</label>
              <div className="flex bg-editor-grey rounded-lg p-1">
                <Button
                  variant={currentMode === 'obfuscate' ? 'default' : 'ghost'}
                  size="sm"
                  className={`flex-1 ${currentMode === 'obfuscate' ? 'bg-roblox-blue text-white' : 'text-gray-300 hover:text-white'}`}
                  onClick={() => setCurrentMode('obfuscate')}
                  data-testid="button-obfuscate"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Obfuscate
                </Button>
                <Button
                  variant={currentMode === 'deobfuscate' ? 'default' : 'ghost'}
                  size="sm"
                  className={`flex-1 ${currentMode === 'deobfuscate' ? 'bg-roblox-blue text-white' : 'text-gray-300 hover:text-white'}`}
                  onClick={() => setCurrentMode('deobfuscate')}
                  data-testid="button-deobfuscate"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Deobfuscate
                </Button>
              </div>
            </div>

            {/* Obfuscation Settings */}
            {currentMode === 'obfuscate' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="variable-renaming"
                    checked={settings.variableRenaming}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, variableRenaming: !!checked }))
                    }
                    data-testid="checkbox-variable-renaming"
                  />
                  <label htmlFor="variable-renaming" className="text-sm">Variable Renaming</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="string-encoding"
                    checked={settings.stringEncoding}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, stringEncoding: !!checked }))
                    }
                    data-testid="checkbox-string-encoding"
                  />
                  <label htmlFor="string-encoding" className="text-sm">String Encoding</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="control-flow"
                    checked={settings.controlFlowObfuscation}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, controlFlowObfuscation: !!checked }))
                    }
                    data-testid="checkbox-control-flow"
                  />
                  <label htmlFor="control-flow" className="text-sm">Control Flow Obfuscation</label>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Obfuscation Level</label>
                  <Select 
                    value={settings.obfuscationLevel} 
                    onValueChange={(value: 'light' | 'medium' | 'heavy') => 
                      setSettings(prev => ({ ...prev, obfuscationLevel: value }))
                    }
                  >
                    <SelectTrigger className="w-full bg-editor-grey border-border-dark" data-testid="select-obfuscation-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Process Button */}
            <Button 
              className="w-full mt-6 bg-roblox-blue hover:bg-blue-600 text-white font-medium py-3 px-4"
              onClick={handleProcess}
              disabled={isProcessing}
              data-testid="button-process"
            >
              <Play className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Process Code'}
            </Button>
          </div>

          {/* File Operations */}
          <div className="p-4 border-b border-border-dark">
            <h3 className="text-sm font-medium text-white mb-4">File Operations</h3>
            
            <div className="space-y-3">
              <div>
                <input
                  type="file"
                  accept=".lua,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file-upload"
                />
                <Button 
                  variant="outline" 
                  className="w-full bg-editor-grey hover:bg-gray-600 text-white border-border-dark"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  data-testid="button-upload"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Load .lua File
                </Button>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-mint-green hover:bg-green-500 text-editor-dark border-mint-green"
                onClick={handleDownload}
                disabled={!outputCode}
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Result
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-editor-grey hover:bg-gray-600 text-white border-border-dark"
                data-testid="button-share"
              >
                <Share className="w-4 h-4 mr-2" />
                Share Script
              </Button>
            </div>
          </div>

          {/* Processing Stats */}
          <div className="p-4 flex-1">
            <h3 className="text-sm font-medium text-white mb-4">Processing Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Input Lines:</span>
                <span data-testid="text-input-lines">{stats.inputLines}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Output Lines:</span>
                <span data-testid="text-output-lines">{stats.outputLines}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Variables Renamed:</span>
                <span data-testid="text-variables-renamed">{stats.variablesRenamed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Strings Encoded:</span>
                <span data-testid="text-strings-encoded">{stats.stringsEncoded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Processing Time:</span>
                <span data-testid="text-processing-time">{stats.processingTime}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Editor Tabs */}
          <div className="bg-sidebar-dark border-b border-border-dark px-4">
            <div className="flex space-x-1">
              <button 
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'editor' 
                    ? 'text-white bg-editor-dark border-b-2 border-roblox-blue' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('editor')}
                data-testid="tab-editor"
              >
                <Eye className="w-4 h-4 mr-2 inline" />
                Code Editor
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'diff' 
                    ? 'text-white bg-editor-dark border-b-2 border-roblox-blue' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('diff')}
                disabled={!outputCode}
                data-testid="tab-diff"
              >
                <GitCompare className="w-4 h-4 mr-2 inline" />
                Code Differences
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'editor' ? (
              <div className="h-full grid grid-cols-2 gap-0">
                {/* Input Editor */}
                <div className="border-r border-border-dark">
                  <MonacoEditor
                    value={inputCode}
                    onChange={setInputCode}
                    language="lua"
                    placeholder="-- Paste your Lua code here..."
                  />
                </div>

                {/* Output Editor */}
                <div>
                  <MonacoEditor
                    value={outputCode}
                    language="lua"
                    readOnly={true}
                    placeholder="Processed code will appear here..."
                  />
                </div>
              </div>
            ) : (
              <div className="h-full p-4">
                {outputCode ? (
                  <div className="h-full">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-white mb-1">Code Comparison</h3>
                        <p className="text-xs text-gray-400">
                          <span className="text-red-400">Red highlights</span> show removed code, 
                          <span className="text-mint-green ml-2">green highlights</span> show added/modified code
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">View:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-3 text-xs ${diffViewMode === 'side-by-side' ? 'bg-roblox-blue text-white' : 'text-gray-400'}`}
                          onClick={() => setDiffViewMode('side-by-side')}
                          data-testid="button-side-by-side"
                        >
                          Side by Side
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-3 text-xs ${diffViewMode === 'inline' ? 'bg-roblox-blue text-white' : 'text-gray-400'}`}
                          onClick={() => setDiffViewMode('inline')}
                          data-testid="button-inline"
                        >
                          Inline
                        </Button>
                      </div>
                    </div>
                    <CodeDiffViewer
                      originalCode={inputCode}
                      modifiedCode={outputCode}
                      language="lua"
                      height="calc(100% - 80px)"
                      viewMode={diffViewMode}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No Code Differences Available</p>
                      <p className="text-sm">Process some code to see the differences between input and output</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="bg-sidebar-dark border-t border-border-dark px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">Lua</span>
              <span className="text-gray-400">UTF-8</span>
              <span className="text-gray-400">LF</span>
              <div className="text-mint-green" data-testid="text-status-message">{statusMessage}</div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">Ln 1, Col 1</span>
              <span className="text-gray-400">Spaces: 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Modal */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="bg-sidebar-dark border-border-dark max-w-md">
          <DialogTitle className="text-lg font-medium text-white text-center">Processing Script</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm text-center">Analyzing and transforming your Lua code...</DialogDescription>
          <div className="text-center">
            <div className="processing-animation text-roblox-blue text-3xl mb-4">
              <Cog className="w-8 h-8 mx-auto animate-spin" />
            </div>
            <div className="w-full bg-editor-grey rounded-full h-2">
              <div 
                className="bg-roblox-blue h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
                data-testid="progress-bar"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
