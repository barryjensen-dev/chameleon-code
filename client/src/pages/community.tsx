import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Heart, Eye, MessageCircle, Share2, Code, User } from 'lucide-react';
import { shareScriptSchema, type SharedScript, type ShareScriptRequest } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Community() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shared scripts
  const { data: scripts, isLoading } = useQuery({
    queryKey: ['/api/community/scripts', searchQuery],
    queryFn: () => apiRequest(`/api/community/scripts${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`),
  });

  // Share script form
  const shareForm = useForm<ShareScriptRequest>({
    resolver: zodResolver(shareScriptSchema),
    defaultValues: {
      title: '',
      description: '',
      inputCode: '',
      outputCode: '',
      mode: 'obfuscate',
      isPublic: true,
      tags: [],
    },
  });

  // Share script mutation
  const shareScriptMutation = useMutation({
    mutationFn: (data: ShareScriptRequest) => apiRequest('/api/community/share', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Script Shared!",
        description: "Your script has been shared with the community.",
      });
      setShareDialogOpen(false);
      shareForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/community/scripts'] });
    },
    onError: (error) => {
      toast({
        title: "Sharing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Like script mutation
  const likeScriptMutation = useMutation({
    mutationFn: ({ scriptId, action }: { scriptId: string; action: 'like' | 'unlike' }) =>
      apiRequest(`/api/community/scripts/${scriptId}/like`, 'POST', { action, userId: 'anonymous' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/scripts'] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically update and refetch due to the queryKey dependency
  };

  const handleLike = (scriptId: string, isLiked: boolean) => {
    likeScriptMutation.mutate({
      scriptId,
      action: isLiked ? 'unlike' : 'like',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onShareSubmit = (data: ShareScriptRequest) => {
    shareScriptMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Community Scripts</h1>
            <p className="text-slate-300">Discover and share Lua obfuscation scripts with the community</p>
          </div>
          
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00A2FF] hover:bg-[#0082CC] text-white" data-testid="button-share-script">
                <Share2 className="w-4 h-4 mr-2" />
                Share Script
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-800 text-white border-slate-700">
              <DialogHeader>
                <DialogTitle>Share Your Script</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Share your obfuscated or deobfuscated script with the community
                </DialogDescription>
              </DialogHeader>
              
              <Form {...shareForm}>
                <form onSubmit={shareForm.handleSubmit(onShareSubmit)} className="space-y-4">
                  <FormField
                    control={shareForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter script title"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-script-title"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={shareForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your script..."
                            className="bg-slate-700 border-slate-600 text-white resize-none"
                            rows={3}
                            data-testid="input-script-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={shareForm.control}
                      name="inputCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Original Code</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Paste your original Lua code..."
                              className="bg-slate-700 border-slate-600 text-white font-mono text-sm resize-none"
                              rows={8}
                              data-testid="input-original-code"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={shareForm.control}
                      name="outputCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Processed Code</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Paste your processed Lua code..."
                              className="bg-slate-700 border-slate-600 text-white font-mono text-sm resize-none"
                              rows={8}
                              data-testid="input-processed-code"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    <FormField
                      control={shareForm.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-public"
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Public Script</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShareDialogOpen(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      data-testid="button-cancel-share"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={shareScriptMutation.isPending}
                      className="bg-[#00A2FF] hover:bg-[#0082CC] text-white"
                      data-testid="button-submit-share"
                    >
                      {shareScriptMutation.isPending ? 'Sharing...' : 'Share Script'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-400"
              data-testid="input-search-scripts"
            />
          </div>
        </form>

        {/* Scripts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-slate-700 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-slate-700 rounded"></div>
                    <div className="h-6 w-16 bg-slate-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : scripts?.length === 0 ? (
          <div className="text-center py-12">
            <Code className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Scripts Found</h3>
            <p className="text-slate-400 mb-4">
              {searchQuery ? 'No scripts match your search query.' : 'Be the first to share a script with the community!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scripts?.map((script: SharedScript) => (
              <Card key={script.id} className="bg-slate-800 border-slate-700 hover:border-[#00A2FF] transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-1 line-clamp-2">
                        {script.title}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        by {script.authorName} • {formatDate(script.createdAt!)}
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
                
                <CardContent className="pt-0">
                  {script.description && (
                    <p className="text-slate-300 text-sm mb-4 line-clamp-3">
                      {script.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {script.likes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {script.views || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/community/${script.id}`}>
                      <Button
                        size="sm"
                        className="bg-[#00A2FF] hover:bg-[#0082CC] text-white flex-1"
                        data-testid={`button-view-script-${script.id}`}
                      >
                        View Script
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLike(script.id, false)} // TODO: Track actual like status
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      data-testid={`button-like-script-${script.id}`}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}