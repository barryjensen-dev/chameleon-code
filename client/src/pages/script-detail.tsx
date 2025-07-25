import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Heart, Eye, MessageCircle, ArrowLeft, Download, Copy, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { type SharedScript, type ScriptComment } from '@shared/schema';
import MonacoEditor from '@/components/MonacoEditor';
import CodeDiffViewer from '@/components/CodeDiffViewer';

export default function ScriptDetail() {
  const [, params] = useRoute('/community/:id');
  const scriptId = params?.id;
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'diff'>('input');
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch script details
  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ['/api/community/scripts', scriptId],
    queryFn: () => apiRequest(`/api/community/scripts/${scriptId}`),
    enabled: !!scriptId,
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/community/scripts', scriptId, 'comments'],
    queryFn: () => apiRequest(`/api/community/scripts/${scriptId}/comments`),
    enabled: !!scriptId,
  });

  // Like script mutation
  const likeScriptMutation = useMutation({
    mutationFn: ({ action }: { action: 'like' | 'unlike' }) =>
      apiRequest(`/api/community/scripts/${scriptId}/like`, 'POST', { action, userId: 'anonymous' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/scripts', scriptId] });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest(`/api/community/scripts/${scriptId}/comments`, 'POST', {
        content,
        userId: 'anonymous',
        userName: 'Anonymous User',
      }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['/api/community/scripts', scriptId, 'comments'] });
      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    // TODO: Track actual like status
    likeScriptMutation.mutate({ action: 'like' });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied",
      description: "Code has been copied to clipboard.",
    });
  };

  const handleDownload = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File Downloaded",
      description: `${filename} has been downloaded.`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  if (scriptLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-64 mb-4"></div>
            <div className="h-32 bg-slate-700 rounded mb-6"></div>
            <div className="h-96 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Script Not Found</h2>
            <p className="text-slate-400 mb-6">The script you're looking for doesn't exist or has been removed.</p>
            <Link href="/community">
              <Button className="bg-[#00A2FF] hover:bg-[#0082CC] text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/community">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white mb-4"
              data-testid="button-back-community"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
          </Link>
        </div>

        {/* Script Info */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-white text-2xl mb-2">{script.title}</CardTitle>
                <CardDescription className="text-slate-400 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {script.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(script.createdAt!)}
                  </span>
                </CardDescription>
              </div>
              <Badge
                variant={script.mode === 'obfuscate' ? 'default' : 'secondary'}
                className={script.mode === 'obfuscate' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {script.mode === 'obfuscate' ? 'Obfuscated' : 'Deobfuscated'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            {script.description && (
              <p className="text-slate-300 mb-4">{script.description}</p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {script.likes || 0} likes
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {script.views || 0} views
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {comments?.length || 0} comments
                </span>
              </div>
              
              <Button
                onClick={handleLike}
                disabled={likeScriptMutation.isPending}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                data-testid="button-like-script"
              >
                <Heart className="w-4 h-4 mr-2" />
                Like
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Code Tabs */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('input')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'input'
                    ? 'bg-[#00A2FF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="tab-input-code"
              >
                Original Code
              </button>
              <button
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'output'
                    ? 'bg-[#00A2FF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="tab-output-code"
              >
                Processed Code
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'diff'
                    ? 'bg-[#00A2FF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="tab-diff-view"
              >
                Code Differences
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="border-t border-slate-700">
              {activeTab === 'input' && (
                <div>
                  <div className="flex items-center justify-between p-4 bg-slate-750 border-b border-slate-700">
                    <h3 className="text-white font-medium">Original Code</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyCode(script.inputCode)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        data-testid="button-copy-input"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(script.inputCode, `${script.title}_original.lua`)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        data-testid="button-download-input"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <MonacoEditor
                    value={script.inputCode}
                    language="lua"
                    height="400px"
                    readOnly={true}
                  />
                </div>
              )}
              
              {activeTab === 'output' && (
                <div>
                  <div className="flex items-center justify-between p-4 bg-slate-750 border-b border-slate-700">
                    <h3 className="text-white font-medium">Processed Code</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyCode(script.outputCode)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        data-testid="button-copy-output"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(script.outputCode, `${script.title}_processed.lua`)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        data-testid="button-download-output"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <MonacoEditor
                    value={script.outputCode}
                    language="lua"
                    height="400px"
                    readOnly={true}
                  />
                </div>
              )}
              
              {activeTab === 'diff' && (
                <div>
                  <div className="flex items-center justify-between p-4 bg-slate-750 border-b border-slate-700">
                    <h3 className="text-white font-medium">Code Differences</h3>
                  </div>
                  <CodeDiffViewer
                    originalCode={script.inputCode}
                    modifiedCode={script.outputCode}
                    height="400px"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({comments?.length || 0})
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Add Comment */}
            <div className="mb-6">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mb-3 resize-none"
                rows={3}
                data-testid="input-new-comment"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="bg-[#00A2FF] hover:bg-[#0082CC] text-white"
                data-testid="button-add-comment"
              >
                {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>

            <Separator className="bg-slate-700 mb-6" />

            {/* Comments List */}
            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-24 bg-slate-700 rounded"></div>
                      <div className="h-4 w-32 bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-16 bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : comments?.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments?.map((comment: ScriptComment) => (
                  <div key={comment.id} className="border-l-2 border-slate-600 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium text-sm">{comment.userName}</span>
                      <span className="text-slate-500 text-xs">
                        {formatDate(comment.createdAt!)}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}