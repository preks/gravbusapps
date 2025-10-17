import React, { useState, useRef, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Button } from '@newwork/nw-design-system';
import { Input } from '@newwork/nw-design-system';
import { Send, Loader2, Bot, User, Sparkles, Upload, Download, CheckCircle, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Label } from '@newwork/nw-design-system';
import { Alert, AlertDescription } from '@newwork/nw-design-system';

// API Configuration - EXACT same as FORGE demo
const API_URL = 'https://forge-api-production-db58.up.railway.app';
const REPO_ID = '168cd931-0e04-4f64-a496-fcb4af916612';

// EXACT interfaces from FORGE
interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    tool: string;
    args?: string;
    result?: string;
    status: 'running' | 'complete';
    id: string;
  }>;
  thinkingLog?: string;
  thinkingCollapsed?: boolean;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

interface ChangesSummary {
  total: number;
  created: number;
  modified: number;
  deleted: number;
}

// EXACT API function from FORGE
async function queryCode(
  repoId: string,
  query: string,
  conversationHistory: Message[] = [],
  useAgenticMode: boolean = true,
  buildEnabled: boolean = true,
  sessionId?: string,
  llmProvider: 'claude' | 'openai' = 'claude'
): Promise<ReadableStream> {
  const endpoint = useAgenticMode ? '/api/analyze/query-agentic' : '/api/analyze/query';

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoId,
      query,
      stream: true,
      conversationHistory,
      buildEnabled,
      sessionId,
      llmProvider,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error('Failed to query code');
  }

  return response.body;
}

async function downloadPatch(repoId: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/git/patch?repoId=${repoId}&sessionId=${sessionId}`);

  if (!response.ok) {
    throw new Error('Failed to download patch');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-builder-${sessionId}.patch`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function getChanges(repoId: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/git/changes?repoId=${repoId}&sessionId=${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to get changes');
  }
  return response.json();
}

// Use FORGE API (on Railway) for publishing - accessible from anywhere!
const PUBLISH_API_URL = API_URL; // Same as FORGE API - publishes via /api/newwork/publish

interface PublishRequest {
  files: Array<{ path: string; content: string; changeType: string }>;
  screenPath: string;
  resourceUrl: string;
  sessionId: string;
}

async function publishScreen(request: PublishRequest) {
  // Call NEWWORK-specific publish endpoint on FORGE (Railway)
  const response = await fetch(`${PUBLISH_API_URL}/api/newwork/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoId: REPO_ID,
      sessionId: request.sessionId,
      screenPath: request.screenPath,
      resourceUrl: request.resourceUrl,
      // Azure credentials - these will be configured in FORGE env vars
      azureStorageAccount: process.env.AZURE_STORAGE_ACCOUNT || '',
      azureSasToken: process.env.AZURE_STORAGE_SAS_TOKEN || '',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to publish' }));
    throw new Error(error.message || 'Failed to publish');
  }

  return response.json();
}

export const AIBuilder: React.FC<BusinessAppContextProps> = () => {
  // EXACT state from FORGE demo
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [usage, setUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    lastCallCost: 0,
  });
  const [buildEnabled] = useState(true);
  const [llmProvider] = useState<'claude' | 'openai'>('claude');
  const [sessionId, setSessionId] = useState<string>('');
  const [changesSummary, setChangesSummary] = useState<ChangesSummary | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [screenPath, setScreenPath] = useState('');
  const [detectedScreenPath, setDetectedScreenPath] = useState<string | null>(null);
  const [resourceUrl, setResourceUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toolIdCounter = useRef(0);

  // Generate or restore session ID from localStorage (persistent across refreshes)
  useEffect(() => {
    const stored = localStorage.getItem('ai-builder-session-id');
    if (stored) {
      console.log('Restored session ID:', stored);
      setSessionId(stored);
    } else {
      const sid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      console.log('Created new session ID:', sid);
      localStorage.setItem('ai-builder-session-id', sid);
      setSessionId(sid);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start a new session
  const startNewSession = () => {
    const sid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('ai-builder-session-id', sid);
    setSessionId(sid);
    setMessages([]);
    setChangesSummary(null);
    setUsage({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      lastCallCost: 0,
    });
    console.log('Started new session:', sid);
  };

  // Check for changes
  const checkForChanges = async () => {
    if (!sessionId) {
      console.log('No sessionId yet, skipping change check');
      return;
    }
    
    console.log('Fetching changes from FORGE...', { sessionId, repoId: REPO_ID });
    
    try {
      const data = await getChanges(REPO_ID, sessionId);
      console.log('Changes received:', data);
      setChangesSummary(data.summary || null);
      
      // Auto-detect screen path from created files
      // Support both /apps/ and /screens/ structures
      if (data.summary && data.summary.files) {
        const indexFiles = data.summary.files.filter((f: any) => 
          (f.path.includes('/apps/') || f.path.includes('/screens/') || f.path.includes('/forms/')) 
          && f.path.endsWith('/index.ts')
          && f.path.startsWith('src/business-apps/')
        );
        
        if (indexFiles.length > 0) {
          // Extract path like "platform/examples/apps/hello-world" from 
          // "src/business-apps/platform/examples/apps/hello-world/index.ts"
          const match = indexFiles[0].path.match(/src\/business-apps\/(.+)\/index\.ts$/);
          if (match) {
            const detectedPath = match[1];
            setDetectedScreenPath(detectedPath);
            setScreenPath(detectedPath); // Auto-populate
            
            // Auto-generate resource URL from the last segment (screen name)
            const segments = detectedPath.split('/');
            const screenName = segments[segments.length - 1];
            const urlPath = '/' + screenName; // e.g., "/hello-world"
            setResourceUrl(urlPath);
            
            console.log(`🎯 Auto-detected screen path: ${detectedPath}`);
            console.log(`🔗 Auto-generated resource URL: ${urlPath}`);
          }
        }
      }
      
      if (data.summary && data.summary.total > 0) {
        console.log(`✅ ${data.summary.total} files changed - Publish button should appear!`);
      }
    } catch (error) {
      console.error('Failed to get changes:', error);
    }
  };

  // Fix build issues by tracking corrected index.html
  const fixBuildIssues = async () => {
    try {
      // Corrected index.html content
      const correctedIndexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gravity Business App IDE</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
`;

      // Track the fix in database
      const response = await fetch(`${API_URL}/api/newwork/track-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: REPO_ID,
          sessionId: sessionId,
          filePath: 'index.html',
          newContent: correctedIndexHtml,
          changeType: 'modify',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track fix');
      }

      // Refresh changes
      await checkForChanges();
      alert('✅ Build issues fixed! The corrected index.html will be used when publishing.');
    } catch (error) {
      alert(`Failed to fix build issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!screenPath || !resourceUrl) {
      alert('Please enter both screen path and resource URL');
      return;
    }

    setIsPublishing(true);
    try {
      // Get all changes from FORGE
      const data = await getChanges(REPO_ID, sessionId);
      const files = (data.changes || []).map((change: any) => ({
        path: change.filePath,
        content: change.newContent || '',
        changeType: change.changeType,
      }));

      // Publish to platform
      await publishScreen({
        files,
        screenPath,
        resourceUrl,
        sessionId,
      });

      // Success!
      setPublishSuccess(resourceUrl);
      setShowPublishDialog(false);
      setTimeout(() => setPublishSuccess(null), 10000);
    } catch (error) {
      alert(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // EXACT handleSubmit from FORGE demo (line 333-778)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const userInput = input;
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setThinking(false);
    setThinkingContent('');

    try {
      setThinking(true);
      setThinkingContent('');
      
      // DEBUG: Log what we're sending
      console.log('=== AI BUILDER REQUEST ===');
      console.log('Query:', userInput);
      console.log('Messages (before setState):', messages.length);
      console.log('Session ID:', sessionId);
      console.log('========================');
      
      // Compatibility shim: if no history yet, add a dummy assistant thinking header
      // This mirrors the state after FORGE streams the first thinking chunk,
      // ensuring Claude disables strict thinking validation for the first turn
      const history = messages.length === 0
        ? [{ role: 'assistant' as const, content: 'Preparing...' }]
        : messages;

      // EXACT same as FORGE line 348 - pass messages state (before setState completes)
      const stream = await queryCode(REPO_ID, userInput, history, true, buildEnabled, sessionId, llmProvider);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let assistantMessage = '';
      let needsNewMessage = false;
      let hasCreatedInitialMessage = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              // iteration_complete
              if (data.type === 'iteration_complete') {
                needsNewMessage = true;
                continue;
              }

              // usage
              if (data.type === 'usage' && data.content) {
                const usageData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                setUsage({
                  totalInputTokens: usageData.totalInputTokens || 0,
                  totalOutputTokens: usageData.totalOutputTokens || 0,
                  totalCost: usageData.totalCost || 0,
                  lastCallCost: usageData.callCost || 0,
                });
                setMessages(prev => {
                  const newMessages = [...prev];
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant') {
                      newMessages[i] = {
                        ...newMessages[i],
                        cost: {
                          inputTokens: usageData.totalInputTokens || 0,
                          outputTokens: usageData.totalOutputTokens || 0,
                          totalCost: usageData.totalCost || 0,
                        },
                      };
                      break;
                    }
                  }
                  return newMessages;
                });
                continue;
              }

              // thinking
              if (data.type === 'thinking' && data.content) {
                setThinking(true);
                setThinkingContent(prev => prev + data.content);
                setMessages(prev => {
                  const next = [...prev];
                  if (next.length === 0 || next[next.length - 1].role !== 'assistant') {
                    next.push({ role: 'assistant', content: '', thinkingLog: '', thinkingCollapsed: false });
                  }
                  const last = next[next.length - 1];
                  last.thinkingLog = (last.thinkingLog || '') + data.content;
                  if (typeof last.thinkingCollapsed !== 'boolean') last.thinkingCollapsed = false;
                  return next;
                });
                continue;
              }

              // token/response
              if ((data.type === 'token' || data.type === 'response') && data.content) {
                setThinking(false);
                setThinkingContent('');

                setMessages(prev => {
                  const next = [...prev];
                  if (next.length > 0 && next[next.length - 1].role === 'assistant' && next[next.length - 1].thinkingLog) {
                    next[next.length - 1].thinkingCollapsed = true;
                  }
                  return next;
                });

                if (!hasCreatedInitialMessage || needsNewMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                  hasCreatedInitialMessage = true;
                  needsNewMessage = false;
                  assistantMessage = '';
                }

                assistantMessage += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantMessage;
                  return newMessages;
                });
              } else if (data.type === 'tool_call' && data.toolName) {
                if (!hasCreatedInitialMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                  hasCreatedInitialMessage = true;
                  assistantMessage = '';
                }

                const toolArgs = data.content ? data.content.match(/\((.*)\)/)?.[1] : undefined;

                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (!lastMsg.toolCalls) {
                    lastMsg.toolCalls = [];
                  }

                  const alreadyExists = lastMsg.toolCalls.some(
                    t => t.tool === data.toolName && t.args === toolArgs
                  );

                  if (!alreadyExists) {
                    toolIdCounter.current += 1;
                    lastMsg.toolCalls.push({
                      tool: data.toolName,
                      args: toolArgs,
                      status: 'running',
                      id: `tool-${toolIdCounter.current}`,
                    });
                  }

                  return newMessages;
                });
              } else if (data.type === 'tool_result' && data.toolName) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg.toolCalls) {
                    const runningTools = lastMsg.toolCalls.filter(
                      t => t.tool === data.toolName && t.status === 'running'
                    );
                    if (runningTools.length > 0) {
                      const tool = runningTools[runningTools.length - 1];
                      tool.status = 'complete';
                      tool.result = data.content;
                    }
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.warn('Failed to parse chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Query failed:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, there was an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setLoading(false);
      // Check for changes immediately to show Publish button
      setTimeout(() => {
        console.log('Checking for changes after AI response...');
        checkForChanges();
      }, 500);
    }
  };

  return (
    <div className="gba:flex gba:flex-col gba:h-screen gba:bg-background">
      {/* Success Banner */}
      {publishSuccess && (
        <div className="gba:bg-success-secondary gba:border-b gba:border-success">
          <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <CheckCircle className="gba:w-5 gba:h-5 gba:text-success" />
                <div>
                  <p className="gba:text-sm gba:font-medium gba:text-success-secondary-foreground">
                    Screen published successfully!
                  </p>
                  <p className="gba:text-xs gba:text-success-secondary-foreground/80">
                    Available at: {publishSuccess}
                  </p>
                </div>
              </div>
              <button onClick={() => setPublishSuccess(null)} className="gba:text-success-secondary-foreground hover:gba:opacity-80">
                <X className="gba:w-4 gba:h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:container gba:mx-auto gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
              </div>
              <div>
                <h1 className="gba:text-xl gba:font-bold">NEWWORK AI Builder</h1>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Build screens with natural language • Powered by Claude 4 Sonnet
                  {sessionId && <span className="gba:ml-2 gba:px-2 gba:py-0.5 gba:bg-muted gba:rounded gba:font-mono gba:text-[10px]">{sessionId.split('-').pop()}</span>}
                </p>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-3">
              {usage.totalCost > 0 && (
                <div className="gba:text-xs gba:text-muted-foreground">
                  <span>{(usage.totalInputTokens / 1000).toFixed(1)}K in / </span>
                  <span>{(usage.totalOutputTokens / 1000).toFixed(1)}K out • </span>
                  <span className="gba:font-semibold gba:text-success">${usage.totalCost.toFixed(4)}</span>
                </div>
              )}
              
              {/* Manual refresh button for debugging */}
              <Button
                variant="outline"
                size="sm"
                onClick={checkForChanges}
                className="gba:text-xs"
              >
                Check Files
              </Button>
              
              {/* New Session button */}
              <Button
                variant="outline"
                size="sm"
                onClick={startNewSession}
                className="gba:text-xs"
                title="Start a fresh session with new ID"
              >
                New Session
              </Button>

              {/* Refresh changes button */}
              <Button
                size="sm"
                variant="outline"
                onClick={checkForChanges}
                className="gba:gap-2"
              >
                <Download className="gba:w-4 gba:h-4" />
                Refresh Files
              </Button>

              {/* Show publish button if we have changes */}
              {changesSummary && changesSummary.total > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowPublishDialog(true)}
                  className="gba:gap-2"
                >
                  <Upload className="gba:w-4 gba:h-4" />
                  Publish ({changesSummary.total} files)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Changes Banner */}
      {changesSummary && changesSummary.total > 0 && (
        <div className="gba:bg-warning-secondary gba:border-b">
          <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-warning gba:animate-pulse" />
                <div>
                  <h3 className="gba:font-semibold gba:text-warning-secondary-foreground gba:text-sm">
                    📝 {changesSummary.total} File{changesSummary.total === 1 ? '' : 's'} Changed
                  </h3>
                  <p className="gba:text-xs gba:text-warning-secondary-foreground/80">
                    {changesSummary.created || 0} created · {changesSummary.modified || 0} modified · {changesSummary.deleted || 0} deleted
                  </p>
                </div>
              </div>
              <div className="gba:flex gba:gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadPatch(REPO_ID, sessionId)} className="gba:gap-2">
                  <Download className="gba:w-4 gba:h-4" />
                  Download Patch
                </Button>
                <Button variant="outline" size="sm" onClick={fixBuildIssues} className="gba:gap-2">
                  <CheckCircle className="gba:w-4 gba:h-4" />
                  Fix Build Issues
                </Button>
                <Button size="sm" onClick={() => setShowPublishDialog(true)} className="gba:gap-2">
                  <Upload className="gba:w-4 gba:h-4" />
                  Publish to Platform
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:space-y-4">
        {messages.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <div className="gba:text-center gba:space-y-6 gba:max-w-2xl">
              <div className="gba:w-20 gba:h-20 gba:mx-auto gba:rounded-2xl gba:bg-primary gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:w-10 gba:h-10 gba:text-primary-foreground" />
              </div>
              <div>
                <h2 className="gba:text-2xl gba:font-bold">Build Screens with AI</h2>
                <p className="gba:text-muted-foreground gba:mt-2">Describe what you want to build and I'll create it following NEWWORK patterns</p>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center">
                {['Create a lead list screen', 'Build a customer dashboard', 'Generate a contact form'].map((s, i) => (
                  <button key={i} onClick={() => setInput(s)} className="gba:px-4 gba:py-2 gba:text-sm gba:rounded-lg gba:bg-muted hover:gba:bg-muted/80 gba:border">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {thinking && thinkingContent && (
              <div className="gba:flex gba:gap-3">
                <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center">
                  <Loader2 className="gba:w-4 gba:h-4 gba:text-primary-foreground gba:animate-spin" />
                </div>
                <div className="gba:flex-1 gba:bg-primary/10 gba:border gba:rounded-lg gba:px-3 gba:py-2">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                    <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-pulse" />
                    <span className="gba:text-xs gba:font-medium gba:text-primary">Claude is thinking...</span>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground">{thinkingContent.slice(-150)}...</p>
                </div>
              </div>
            )}

            {messages.map((message, i) => (
              <div key={i} className={`gba:flex gba:gap-3 ${message.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    <Bot className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
                  </div>
                )}
                <div className="gba:max-w-[85%]">
                  {message.role === 'user' ? (
                    <div className="gba:bg-primary gba:text-primary-foreground gba:rounded-lg gba:px-4 gba:py-2">
                      <p className="gba:text-sm">{message.content}</p>
                    </div>
                  ) : (
                    <div className="gba:space-y-2">
                      {message.thinkingLog && (
                        <div>
                          <button
                            className="gba:text-xs gba:text-primary hover:gba:underline"
                            onClick={() => {
                              setMessages(prev => {
                                const next = [...prev];
                                next[i].thinkingCollapsed = !next[i].thinkingCollapsed;
                                return next;
                              });
                            }}
                          >
                            {message.thinkingCollapsed ? 'Show thinking' : 'Hide thinking'}
                          </button>
                          {!message.thinkingCollapsed && (
                            <div className="gba:mt-1 gba:px-3 gba:py-2 gba:bg-muted gba:rounded gba:text-xs gba:text-muted-foreground gba:whitespace-pre-wrap">
                              {message.thinkingLog}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="gba:bg-card gba:border gba:rounded-lg gba:px-3 gba:py-2">
                        {message.cost && (
                          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2 gba:pb-2 gba:border-b">
                            <span className="gba:text-xs gba:font-medium gba:text-primary">AI Response</span>
                            <span className="gba:text-xs gba:text-muted-foreground">
                              ${message.cost.totalCost.toFixed(4)} ({message.cost.inputTokens.toLocaleString()}in / {message.cost.outputTokens.toLocaleString()}out)
                            </span>
                          </div>
                        )}
                        <div className="gba:text-sm gba:whitespace-pre-wrap gba:leading-relaxed">{message.content}</div>
                      </div>

                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="gba:bg-muted/50 gba:rounded-lg gba:p-2 gba:space-y-1">
                          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Tools ({message.toolCalls.length})</span>
                          {message.toolCalls.map(tool => (
                            <div key={tool.id} className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                              <span className={`gba:w-2 gba:h-2 gba:rounded-full ${tool.status === 'complete' ? 'gba:bg-success' : 'gba:bg-warning'}`} />
                              <span className="gba:font-mono">{tool.tool}()</span>
                              {tool.args && <span className="gba:text-muted-foreground gba:truncate">{tool.args}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    <User className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="gba:border-t gba:bg-card gba:p-4">
        <form onSubmit={handleSubmit} className="gba:flex gba:gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe the screen you want to build..."
            disabled={loading}
            className="gba:flex-1"
          />
          <Button type="submit" disabled={loading} className="gba:gap-2">
            {loading ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : <Send className="gba:w-4 gba:h-4" />}
            {loading ? 'Building...' : 'Send'}
          </Button>
        </form>
        {loading && (
          <div className="gba:mt-2 gba:text-center gba:text-xs gba:text-muted-foreground">
            AI is exploring your codebase...
          </div>
        )}
      </div>

      {/* Publish Dialog */}
      {showPublishDialog && (
        <div className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center gba:z-50 gba:p-4">
          <Card className="gba:w-full gba:max-w-2xl">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:justify-between">
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <Upload className="gba:w-5 gba:h-5" />
                  Publish to NEWWORK Platform
                </CardTitle>
                <button onClick={() => setShowPublishDialog(false)} className="gba:text-muted-foreground hover:gba:text-foreground">
                  <X className="gba:w-5 gba:h-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="gba:space-y-6">
              {/* Files Summary */}
              <div>
                <h4 className="gba:text-sm gba:font-medium gba:mb-2">
                  Files to Publish ({changesSummary?.total || 0})
                </h4>
                <div className="gba:bg-muted gba:rounded-lg gba:p-3 gba:text-xs gba:text-muted-foreground">
                  {changesSummary?.created || 0} created · {changesSummary?.modified || 0} modified · {changesSummary?.deleted || 0} deleted
                </div>
              </div>

              {/* Auto-Detected Screen Path */}
              {detectedScreenPath ? (
                <Alert className="gba:bg-success-secondary gba:border-success">
                  <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />
                  <AlertDescription>
                    <div className="gba:text-sm gba:space-y-2">
                      <div>
                        <strong className="gba:text-success">✅ Ready to publish!</strong>
                        <p className="gba:text-xs gba:mt-1 gba:text-muted-foreground">
                          Everything is configured automatically. Just click "Publish Screen" below!
                        </p>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                        <span className="gba:text-muted-foreground">Screen path:</span>
                        <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">
                          {detectedScreenPath}
                        </code>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                        <span className="gba:text-muted-foreground">Resource URL:</span>
                        <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">
                          {resourceUrl}
                        </code>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="gba:w-4 gba:h-4" />
                  <AlertDescription className="gba:text-sm">
                    <strong>Waiting for files...</strong>
                    <p className="gba:text-xs gba:mt-1">
                      Ask the AI to create a screen and paths will be detected automatically.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual inputs - only show if auto-detection failed */}
              {!detectedScreenPath && (
                <>
                  {/* Screen Path */}
                  <div className="gba:space-y-2">
                    <Label htmlFor="screen-path">Screen Path *</Label>
                    <Input
                      id="screen-path"
                      value={screenPath}
                      onChange={e => setScreenPath(e.target.value)}
                      placeholder="platform/examples/apps/my-screen"
                    />
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Format: module/sub-module/apps/screen-name (e.g., crm/customers/apps/lead-list)
                    </p>
                  </div>

                  {/* Resource URL */}
                  <div className="gba:space-y-2">
                    <Label htmlFor="resource-url">Resource URL *</Label>
                    <Input
                      id="resource-url"
                      value={resourceUrl}
                      onChange={e => setResourceUrl(e.target.value)}
                      placeholder="/my-screen"
                    />
                    <p className="gba:text-xs gba:text-muted-foreground">
                      The URL path where the screen will be accessible (e.g., /lead-list)
                    </p>
                  </div>
                </>
              )}

              {/* Info */}
              <Alert>
                <AlertCircle className="gba:w-4 gba:h-4" />
                <AlertDescription className="gba:text-xs">
                  This will build the screen, upload to Azure, and automatically register it in the platform with the resource URL.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
                <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={isPublishing}>
                  Cancel
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing || !screenPath || !resourceUrl} className="gba:gap-2">
                  {isPublishing ? (
                    <>
                      <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="gba:w-4 gba:h-4" />
                      Publish Screen
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
