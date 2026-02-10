import React, { useState, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@newwork/nw-design-system'
import {
  Loader2,
  Sparkles,
  Upload,
  Download,
  CheckCircle,
  CheckCircle2,
  X,
  AlertCircle,
  PanelLeft,
  PanelLeftClose,
  ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Label } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import screenDiscoveryConfig from '../../../../../../../scripts/screen-discovery.config.json'
import { SYSTEM_PROMPT } from '../config/systemPrompt'
import { FileExplorer } from '../components/FileExplorer'
import { FilePreview } from '../components/FilePreview'
import { IndexingProgress } from '../components/IndexingProgress'
import { ChatDrawer } from '../components/ChatDrawer'
import { PreviewSandbox } from '@/common/components/ai-builder/sandbox'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import { sanitizeFilename, getSafeHref } from '../utils/helpers'
import { SessionMetadata } from '../types/session'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    tool: string
    args?: string
    result?: string
    status: 'running' | 'complete'
    id: string
  }>
  thinkingLog?: string
  thinkingCollapsed?: boolean
  cost?: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

interface UniqueFileSummary {
  totalUniqueFiles: number
  created: number
  modified: number
  deleted: number
  files: Array<{
    path: string
    type: 'create' | 'modify' | 'delete'
  }>
}

interface FileChange {
  path: string
  type: string
  filePath?: string
  newContent?: string
  changeType?: string
}

interface ChangesSummary {
  total: number
  files: FileChange[]
}

interface ChangesResponse {
  summary?: ChangesSummary
  changes?: FileChange[]
}

export interface SessionDetailPageProps {
  context: BusinessAppContextProps
  sessionId: string
  repositoryId: string
  sessions: SessionMetadata[]
  backToSessionList: () => void
  updateSessionsState: (updatedSessions: SessionMetadata[]) => void
  saveSessionToAPI: (session: SessionMetadata) => Promise<void>
  userPictureThumbnail: string | null
}

export const SessionDetailPage: React.FC<SessionDetailPageProps> = ({
  context,
  sessionId,
  repositoryId,
  sessions,
  backToSessionList,
  updateSessionsState,
  saveSessionToAPI,
  userPictureThumbnail
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const debouncedMessages = useDebounce(messages, 1000)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [, setThinkingContent] = useState('')
  const [usage, setUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    lastCallCost: 0
  })
  const [buildEnabled] = useState(true)
  const [llmProvider] = useState<'claude' | 'openai'>('claude')
  const [uniqueFileSummary, setUniqueFileSummary] = useState<UniqueFileSummary | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [targetPath, setTargetPath] = useState('')
  const [detectedTargetPath, setDetectedTargetPath] = useState<string | null>(null)
  const [resourceUrl, setResourceUrl] = useState('')
  const [publishError, setPublishError] = useState<string | null>(null)
  const [showFileExplorer, setShowFileExplorer] = useState(() => {
    const saved = localStorage.getItem('ai-builder-show-file-explorer')
    return saved !== 'false'
  })
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileExplorerEnabled] = useState(() => {
    const enabledForUser = localStorage.getItem('ai-builder-file-explorer-enabled')
    return enabledForUser !== 'false'
  })
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)

  const builderClient = useBuilderClient(context.accessToken)
  const toolIdCounter = useRef(0)

  const toggleFileExplorer = () => {
    const newValue = !showFileExplorer
    setShowFileExplorer(newValue)
    localStorage.setItem('ai-builder-show-file-explorer', String(newValue))
  }

  const checkForChanges = async () => {
    if (!sessionId) return
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    const repoIdToUse = currentSession?.repoId || repositoryId
    if (!repoIdToUse) return
    try {
      const data: ChangesResponse = await builderClient.getChanges(repoIdToUse, sessionId)
      if (data.summary && data.summary.files) {
        const fileMap = new Map<string, { path: string; type: 'create' | 'modify' | 'delete' }>()
        data.summary.files.forEach((file: FileChange) => {
          const normalizedType = file.type === 'create' ? 'create' : file.type === 'delete' ? 'delete' : 'modify'
          fileMap.set(file.path, { path: file.path, type: normalizedType })
        })
        const uniqueFiles = Array.from(fileMap.values())
        const created = uniqueFiles.filter(f => f.type === 'create').length
        const modified = uniqueFiles.filter(f => f.type === 'modify').length
        const deleted = uniqueFiles.filter(f => f.type === 'delete').length
        const totalForPublish = uniqueFiles.filter(f => f.type !== 'delete').length
        setUniqueFileSummary({
          totalUniqueFiles: totalForPublish,
          created,
          modified,
          deleted,
          files: uniqueFiles
        })
      }
      // Auto-detect screen path from created files.
      // Uses screen types from screen-discovery.config.json (e.g. apps, forms, popups, records, windows).
      // Build regex from config: match screen root index.ts exactly one level after a screen type directory.
      // e.g. src/business-apps/hr/common/apps/employee-list/index.ts
      // NOT: src/business-apps/hr/common/apps/employee-list/_i18n/index.ts
      if (data.summary && data.summary.files) {
        const screenTypes = (screenDiscoveryConfig as { types: string[] }).types.join('|')
        const screenRootPattern = new RegExp(String.raw`^src/business-apps/(.+/(?:${screenTypes})/[^/]+)/index\.ts$`)
        const indexFiles = data.summary.files.filter((f: FileChange) => screenRootPattern.test(f.path))
        if (indexFiles.length > 0) {
          const match = screenRootPattern.exec(indexFiles[0].path)
          if (match) {
            const detectedPath = match[1]
            setDetectedTargetPath(detectedPath)
            setTargetPath(detectedPath)
            const segments = detectedPath.split('/')
            const screenName = segments[segments.length - 1]
            // Auto-generate resource URL from the last segment (target path name), e.g. "/platform/generated/hello-world"
            setResourceUrl('/platform/generated/' + screenName)
          }
        }
      }
    } catch (error) {
      console.error('Failed to get changes:', error)
    }
  }

  useEffect(() => {
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    if (!currentSession) return
    const updatedSession: SessionMetadata = {
      ...currentSession,
      targetPath: detectedTargetPath || targetPath || currentSession.targetPath,
      resourceUrl: resourceUrl || currentSession.resourceUrl,
      lastModified: new Date().toISOString(),
      fileCount: uniqueFileSummary?.totalUniqueFiles || currentSession.fileCount
    }
    const updated = sessions.map(s => (s.sessionId === sessionId ? updatedSession : s))
    updateSessionsState(updated)
    saveSessionToAPI(updatedSession)
    // Intentionally omit sessions from deps to avoid loop; we read latest sessions from closure
  }, [sessionId, detectedTargetPath, targetPath, resourceUrl, uniqueFileSummary])

  useEffect(() => {
    checkForChanges()
    builderClient
      .loadChatHistory(repositoryId, sessionId)
      .then(history => {
        if (history && history.length > 0) {
          setMessages(history as Message[])
        } else {
          setMessages([])
        }
      })
      .catch(error => {
        console.error('Failed to load chat history:', error)
        setMessages([])
      })
  }, [sessionId])

  useEffect(() => {
    if (sessionId && debouncedMessages.length > 0) {
      builderClient.saveChatHistory(repositoryId, sessionId, debouncedMessages as Message[])
    }
  }, [debouncedMessages, sessionId, repositoryId])

  const handlePublish = async () => {
    if (!targetPath || !resourceUrl) {
      setPublishError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.missing_publish_fields',
          'Please enter both target path and resource URL'
        )
      )
      return
    }
    setIsPublishing(true)
    setPublishError(null)
    try {
      const currentSession = sessions.find(s => s.sessionId === sessionId)
      if (currentSession) {
        await saveSessionToAPI({
          ...currentSession,
          targetPath,
          resourceUrl,
          lastModified: new Date().toISOString()
        })
      }
      await builderClient.publishScreen({
        repoId: repositoryId,
        sessionId
      })
      const fullUrl = `/${targetPath}`
      setPublishSuccess(fullUrl)
      setShowPublishDialog(false)
      setPublishError(null)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.publish_success_message',
            `✅ **Screen published successfully!**\n\nYou can now access your screen at:\n${fullUrl}\n\nClick the link in the success banner to open it in a new tab.`,
            { url: fullUrl }
          )
        }
      ])
      setTimeout(() => setPublishSuccess(null), 10000)
    } catch (error) {
      console.error('Publish failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setPublishError(errorMessage)
      const errorPrompt = `The screen publishing failed with the following error:

\`\`\`
${errorMessage}
\`\`\`

Please analyze the error, fix the issues, and let me know when it's ready to republish.`
      setInput(errorPrompt)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMessage: Message = { role: 'user', content: input }
    const userInput = input
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setThinking(false)
    setThinkingContent('')
    try {
      setThinking(true)
      setThinkingContent('')
      const optimizedHistory = messages.slice(-20)
      const history = optimizedHistory
      const stream = await builderClient.queryCode(
        repositoryId,
        userInput,
        history,
        true,
        buildEnabled,
        sessionId,
        llmProvider,
        SYSTEM_PROMPT
      )
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let needsNewMessage = false
      let hasCreatedInitialMessage = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue
              const data = JSON.parse(jsonStr)
              if (data.type === 'iteration_complete') {
                needsNewMessage = true
                continue
              }
              if (data.type === 'usage' && data.content) {
                const usageData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
                setUsage(prev => ({
                  totalInputTokens: prev.totalInputTokens + (usageData.totalInputTokens || 0),
                  totalOutputTokens: prev.totalOutputTokens + (usageData.totalOutputTokens || 0),
                  totalCost: prev.totalCost + (usageData.totalCost || 0),
                  lastCallCost: usageData.callCost || 0
                }))
                setMessages(prev => {
                  const newMessages = [...prev]
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant') {
                      newMessages[i] = {
                        ...newMessages[i],
                        cost: {
                          inputTokens: usageData.totalInputTokens || 0,
                          outputTokens: usageData.totalOutputTokens || 0,
                          totalCost: usageData.totalCost || 0
                        }
                      }
                      break
                    }
                  }
                  return newMessages
                })
                continue
              }
              if (data.type === 'thinking' && data.content) {
                setThinking(true)
                setThinkingContent(prev => prev + data.content)
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length === 0 || next[next.length - 1].role !== 'assistant') {
                    next.push({ role: 'assistant', content: '', thinkingLog: '', thinkingCollapsed: false })
                  }
                  const last = next[next.length - 1]
                  last.thinkingLog = (last.thinkingLog || '') + data.content
                  if (typeof last.thinkingCollapsed !== 'boolean') last.thinkingCollapsed = false
                  return next
                })
                continue
              }
              if ((data.type === 'token' || data.type === 'response') && data.content) {
                setThinking(false)
                setThinkingContent('')
                setMessages(prev => {
                  const next = [...prev]
                  if (
                    next.length > 0 &&
                    next[next.length - 1].role === 'assistant' &&
                    next[next.length - 1].thinkingLog
                  ) {
                    next[next.length - 1].thinkingCollapsed = true
                  }
                  return next
                })
                if (!hasCreatedInitialMessage || needsNewMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }])
                  hasCreatedInitialMessage = true
                  needsNewMessage = false
                  assistantMessage = ''
                }
                assistantMessage += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].content = assistantMessage
                  return newMessages
                })
              } else if (data.type === 'tool_call' && data.toolName) {
                if (!hasCreatedInitialMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }])
                  hasCreatedInitialMessage = true
                  assistantMessage = ''
                }
                const toolArgs = data.content ? data.content.match(/\((.*)\)/)?.[1] : undefined
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (!lastMsg.toolCalls) lastMsg.toolCalls = []
                  const alreadyExists = lastMsg.toolCalls.some(t => t.tool === data.toolName && t.args === toolArgs)
                  if (!alreadyExists) {
                    toolIdCounter.current += 1
                    lastMsg.toolCalls.push({
                      tool: data.toolName,
                      args: toolArgs,
                      status: 'running',
                      id: `tool-${toolIdCounter.current}`
                    })
                  }
                  return newMessages
                })
              } else if (data.type === 'tool_result' && data.toolName) {
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg.toolCalls) {
                    const runningTools = lastMsg.toolCalls.filter(
                      t => t.tool === data.toolName && t.status === 'running'
                    )
                    if (runningTools.length > 0) {
                      const tool = runningTools[runningTools.length - 1]
                      tool.status = 'complete'
                      tool.result = data.content
                    }
                  }
                  return newMessages
                })
              }
            } catch {
              // skip parse error
            }
          }
        }
      }
    } catch (error) {
      console.error('Query failed:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.error_message',
            `Sorry, there was an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          )
        }
      ])
    } finally {
      setLoading(false)
      setTimeout(() => checkForChanges(), 2000)
    }
  }

  return (
    <div className="gba:flex gba:h-full gba:relative gba:overflow-hidden">
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/5 gba:via-background gba:to-accent/5">
        <div
          className="gba:absolute gba:inset-0 gba:opacity-30"
          style={{
            backgroundImage: `
            radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, hsl(var(--accent) / 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, hsl(var(--primary) / 0.1) 0%, transparent 50%)
          `
          }}
        />
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="gba:relative gba:z-10 gba:flex gba:w-full gba:h-full">
        <>
          {fileExplorerEnabled && showFileExplorer && sessionId && (
            <div className="gba:w-[320px] gba:border-r gba:border-border gba:flex-shrink-0 gba:bg-card/80 gba:backdrop-blur-sm">
              <FileExplorer repoId={repositoryId} sessionId={sessionId} onFileClick={path => setSelectedFile(path)} />
            </div>
          )}

          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
            {publishSuccess && (
              <div className="gba:bg-success-secondary gba:border-b gba:border-success">
                <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <CheckCircle className="gba:w-5 gba:h-5 gba:text-success" />
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-success-secondary-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.publish_success',
                            'Screen published successfully!'
                          )}
                        </p>
                        <a
                          href={getSafeHref(publishSuccess)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gba:text-xs gba:text-success hover:gba:underline gba:flex gba:items-center gba:gap-1"
                        >
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.open_screen', 'Open screen')}:{' '}
                          {publishSuccess}
                          <svg className="gba:w-3 gba:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => setPublishSuccess(null)}
                      className="gba:text-success-secondary-foreground hover:gba:opacity-80"
                    >
                      <X className="gba:w-4 gba:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="gba:border-b gba:border-border/50 gba:bg-card/60 gba:backdrop-blur-md gba:shadow-sm">
              <div className="gba:container gba:mx-auto gba:px-6 gba:py-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center gba:shadow-lg">
                      <Sparkles className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
                    </div>
                    <div>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <h1 className="gba:text-xl gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:to-accent gba:bg-clip-text gba:text-transparent">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.title', 'NEWWORK AI Builder')}
                        </h1>
                        <Badge variant="aiGenerated" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.beta_badge', 'BETA')}
                        </Badge>
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.subtitle',
                          'Build screens with natural language • Powered by Claude 4.5 Sonnet'
                        )}
                        {sessionId && (
                          <span className="gba:ml-2 gba:px-2 gba:py-0.5 gba:bg-primary/10 gba:rounded gba:font-mono gba:text-[10px] gba:text-primary">
                            {sessionId.split('-').pop()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={backToSessionList}
                      className="gba:gap-2"
                      title={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.back_to_sessions_title',
                        'Back to session list'
                      )}
                      data-testid="back-to-sessions-button"
                    >
                      <ArrowLeft className="gba:w-4 gba:h-4" />
                      <span className="gba:hidden md:gba:inline">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions_button', 'Sessions')}
                      </span>
                    </Button>

                    {fileExplorerEnabled && sessionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={toggleFileExplorer}
                        className="gba:gap-2"
                        title={
                          showFileExplorer
                            ? getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.hide_file_explorer',
                                'Hide file explorer'
                              )
                            : getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.show_file_explorer',
                                'Show file explorer'
                              )
                        }
                        data-testid="file-explorer-toggle-button"
                      >
                        {showFileExplorer ? (
                          <PanelLeftClose className="gba:w-4 gba:h-4" />
                        ) : (
                          <PanelLeft className="gba:w-4 gba:h-4" />
                        )}
                        <span className="gba:hidden md:gba:inline">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.files_button', 'Files')}
                        </span>
                      </Button>
                    )}

                    {usage.totalCost > 0 && (
                      <div className="gba:text-xs gba:text-muted-foreground">
                        <span>{(usage.totalInputTokens / 1000).toFixed(1)}K in / </span>
                        <span>{(usage.totalOutputTokens / 1000).toFixed(1)}K out • </span>
                        <span className="gba:font-semibold gba:text-success">${usage.totalCost.toFixed(4)}</span>
                      </div>
                    )}

                    <Button size="sm" variant="outline" onClick={checkForChanges} className="gba:gap-2">
                      <Download className="gba:w-4 gba:h-4" />
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.refresh_files', 'Refresh Files')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <IndexingProgress />

            {uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && (
              <div className="gba:bg-gradient-to-r gba:from-primary/10 gba:via-accent/5 gba:to-primary/10 gba:backdrop-blur-md gba:border-b gba:border-primary/20">
                <div className="gba:container gba:mx-auto gba:px-6 gba:py-4">
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                    <div className="gba:flex gba:items-start gba:gap-4 gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div className="gba:relative gba:flex gba:items-center gba:justify-center">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                            <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-primary" />
                          </div>
                          <div className="gba:absolute gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/20 gba:animate-ping" />
                        </div>
                        <div className="gba:space-y-1">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <h3 className="gba:font-semibold gba:text-foreground gba:text-sm">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.ready_to_publish',
                                'Ready to Publish'
                              )}
                            </h3>
                            <span className="gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium">
                              {uniqueFileSummary.totalUniqueFiles}{' '}
                              {uniqueFileSummary.totalUniqueFiles === 1
                                ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.file_singular', 'file')
                                : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.file_plural', 'files')}
                            </span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                            {uniqueFileSummary.created > 0 && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                                {uniqueFileSummary.created}{' '}
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.created', 'created')}
                              </span>
                            )}
                            {uniqueFileSummary.modified > 0 && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                                {uniqueFileSummary.modified}{' '}
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.modified', 'modified')}
                              </span>
                            )}
                            {uniqueFileSummary.deleted > 0 && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                                {uniqueFileSummary.deleted}{' '}
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.deleted', 'deleted')}
                              </span>
                            )}
                          </div>
                          <details className="gba:mt-2 gba:text-xs">
                            <summary className="gba:cursor-pointer gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors">
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.view_files', 'View files')}
                            </summary>
                            <div className="gba:mt-2 gba:space-y-1 gba:pl-4 gba:max-h-40 gba:overflow-y-auto gba:pr-2">
                              {uniqueFileSummary.files.map((file, index) => (
                                <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:py-0.5">
                                  <span
                                    className={`gba:w-1 gba:h-1 gba:rounded-full gba:flex-shrink-0 ${
                                      file.type === 'create'
                                        ? 'gba:bg-success'
                                        : file.type === 'delete'
                                          ? 'gba:bg-destructive'
                                          : 'gba:bg-warning'
                                    }`}
                                  />
                                  <span
                                    className="gba:font-mono gba:text-muted-foreground gba:truncate"
                                    title={file.path}
                                  >
                                    {file.path}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>

                    <div className="gba:flex gba:gap-2 gba:flex-shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setPublishError(null)
                          setShowPublishDialog(true)
                        }}
                        className="gba:gap-2 gba:shadow-sm"
                      >
                        <Upload className="gba:w-4 gba:h-4" />
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_button', 'Publish')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const blob = await builderClient.downloadPatch(repositoryId, sessionId)
                            const safeSessionId = sanitizeFilename(sessionId)
                            const safeFilename = `ai-builder-${safeSessionId}.patch`
                            const blobUrl = URL.createObjectURL(blob)
                            try {
                              const link = Object.assign(document.createElement('a'), {
                                href: blobUrl,
                                download: safeFilename
                              })
                              link.click()
                            } finally {
                              URL.revokeObjectURL(blobUrl)
                            }
                          } catch (error) {
                            alert(
                              error instanceof Error
                                ? error.message
                                : getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:ai_builder.download_patch_failed',
                                    'Failed to download patch'
                                  )
                            )
                          }
                        }}
                        className="gba:gap-2"
                      >
                        <Download className="gba:w-4 gba:h-4" />
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.patch_button', 'Patch')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="gba:flex-1 gba:flex gba:min-h-0 gba:overflow-hidden">
              {sessionId &&
              repositoryId &&
              ((uniqueFileSummary?.totalUniqueFiles ?? 0) > 0 ||
                (sessions.find(s => s.sessionId === sessionId)?.fileCount ?? 0) > 0) ? (
                <ResizablePanelGroup direction="horizontal" className="gba:flex-1 gba:min-h-0 gba:w-full">
                  <ResizablePanel
                    defaultSize={25}
                    minSize={25}
                    className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none"
                  >
                    <ChatDrawer
                      messages={messages}
                      input={input}
                      onInputChange={v => setInput(v)}
                      onSendMessage={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                      isProcessing={loading}
                      thinking={thinking}
                      userName={
                        context.userInfo
                          ? `${context.userInfo.givenName ?? ''} ${context.userInfo.familyName ?? ''}`.trim() ||
                            getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                          : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                      }
                      userAvatar={userPictureThumbnail ? `data:image/jpeg;base64,${userPictureThumbnail}` : undefined}
                      onToggleThinking={idx =>
                        setMessages(prev => {
                          const next = [...prev]
                          next[idx].thinkingCollapsed = !next[idx].thinkingCollapsed
                          return next
                        })
                      }
                      examplePrompts={[
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.example_prompt_1',
                          'Create a lead list screen'
                        ),
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.example_prompt_2',
                          'Build a customer dashboard'
                        ),
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.example_prompt_3',
                          'Generate a contact form'
                        )
                      ]}
                      inputPlaceholder={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.input_placeholder',
                        'Describe the screen you want to build... (Press Enter to send, Shift+Enter for new line)'
                      )}
                      analyzingRequestText={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.analyzing_request',
                        'AI is analyzing your request and exploring the codebase...'
                      )}
                      tipText={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.tip_message',
                        'Tip: Be specific! Example: "Build a lead list screen with search, table, and pagination"'
                      )}
                      emptyTitle={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.welcome_title',
                        'Build Screens with AI'
                      )}
                      emptyDescription={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.welcome_description',
                        "Describe what you want to build and I'll create it following NEWWORK patterns"
                      )}
                      className="gba:flex-1 gba:min-h-0"
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle className="gba:bg-border" />
                  <ResizablePanel
                    defaultSize={75}
                    minSize={25}
                    className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none"
                  >
                    <div className="gba:flex-1 gba:min-h-0 gba:relative gba:bg-card gba:overflow-hidden">
                      <PreviewSandbox
                        repoId={repositoryId}
                        sessionId={sessionId}
                        accessToken={context.accessToken}
                        userInfo={context.userInfo}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <main className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0 gba:rounded-none">
                  <ChatDrawer
                    messages={messages}
                    input={input}
                    onInputChange={v => setInput(v)}
                    onSendMessage={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                    isProcessing={loading}
                    thinking={thinking}
                    userName={
                      context.userInfo
                        ? `${context.userInfo.givenName ?? ''} ${context.userInfo.familyName ?? ''}`.trim() ||
                          getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                        : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                    }
                    userAvatar={userPictureThumbnail ? `data:image/jpeg;base64,${userPictureThumbnail}` : undefined}
                    onToggleThinking={idx =>
                      setMessages(prev => {
                        const next = [...prev]
                        next[idx].thinkingCollapsed = !next[idx].thinkingCollapsed
                        return next
                      })
                    }
                    examplePrompts={[
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.example_prompt_1',
                        'Create a lead list screen'
                      ),
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.example_prompt_2',
                        'Build a customer dashboard'
                      ),
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.example_prompt_3',
                        'Generate a contact form'
                      )
                    ]}
                    inputPlaceholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.input_placeholder',
                      'Describe the screen you want to build... (Press Enter to send, Shift+Enter for new line)'
                    )}
                    analyzingRequestText={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.analyzing_request',
                      'AI is analyzing your request and exploring the codebase...'
                    )}
                    tipText={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.tip_message',
                      'Tip: Be specific! Example: "Build a lead list screen with search, table, and pagination"'
                    )}
                    emptyTitle={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.welcome_title',
                      'Build Screens with AI'
                    )}
                    emptyDescription={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.welcome_description',
                      "Describe what you want to build and I'll create it following NEWWORK patterns"
                    )}
                    className="gba:flex-1 gba:min-h-0"
                  />
                </main>
              )}
            </div>
            {showPublishDialog && (
              <div className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center gba:z-50 gba:p-4">
                <Card className="gba:w-full gba:max-w-2xl">
                  <CardHeader>
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <CardTitle className="gba:flex gba:items-center gba:gap-2">
                        <Upload className="gba:w-5 gba:h-5" />
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.publish_dialog_title',
                          'Publish to NEWWORK Platform'
                        )}
                      </CardTitle>
                      <button
                        onClick={() => setShowPublishDialog(false)}
                        className="gba:text-muted-foreground hover:gba:text-foreground"
                      >
                        <X className="gba:w-5 gba:h-5" />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="gba:space-y-6">
                    <div>
                      <h4 className="gba:text-sm gba:font-medium gba:mb-2">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.files_to_publish', 'Files to Publish')}{' '}
                        ({uniqueFileSummary?.totalUniqueFiles || 0})
                      </h4>
                      <div className="gba:bg-muted gba:rounded-lg gba:p-3 gba:space-y-2">
                        <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                          {uniqueFileSummary && uniqueFileSummary.created > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                              {uniqueFileSummary.created}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.created', 'created')}
                            </span>
                          )}
                          {uniqueFileSummary && uniqueFileSummary.modified > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                              {uniqueFileSummary.modified}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.modified', 'modified')}
                            </span>
                          )}
                          {uniqueFileSummary && uniqueFileSummary.deleted > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                              {uniqueFileSummary.deleted}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.deleted', 'deleted')}
                            </span>
                          )}
                        </div>
                        {uniqueFileSummary && uniqueFileSummary.files.length > 0 && (
                          <div className="gba:mt-2 gba:space-y-1 gba:max-h-32 gba:overflow-y-auto gba:text-xs">
                            {uniqueFileSummary.files.map((file, index) => (
                              <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:py-0.5">
                                <span
                                  className={`gba:w-1 gba:h-1 gba:rounded-full gba:flex-shrink-0 ${
                                    file.type === 'create'
                                      ? 'gba:bg-success'
                                      : file.type === 'delete'
                                        ? 'gba:bg-destructive'
                                        : 'gba:bg-warning'
                                  }`}
                                />
                                <span
                                  className="gba:font-mono gba:text-muted-foreground gba:truncate"
                                  title={file.path}
                                >
                                  {file.path}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {detectedTargetPath ? (
                      <Alert className="gba:bg-success-secondary gba:border-success">
                        <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />
                        <AlertDescription>
                          <div className="gba:text-sm gba:space-y-2">
                            <div>
                              <strong className="gba:text-success">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.ready_to_publish_status',
                                  'Ready to publish!'
                                )}
                              </strong>
                              <p className="gba:text-xs gba:mt-1 gba:text-muted-foreground">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.auto_configured_message',
                                  'Everything is configured automatically. Just click "Publish" below!'
                                )}
                              </p>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                              <span className="gba:text-muted-foreground">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.target_path_label',
                                  'Target path:'
                                )}
                              </span>
                              <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">
                                {detectedTargetPath}
                              </code>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                              <span className="gba:text-muted-foreground">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.resource_url_label',
                                  'Resource URL:'
                                )}
                              </span>
                              <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">{resourceUrl}</code>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <AlertCircle className="gba:w-4 gba:h-4" />
                        <AlertDescription className="gba:text-sm">
                          <strong>
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.waiting_for_files',
                              'Waiting for files...'
                            )}
                          </strong>
                          <p className="gba:text-xs gba:mt-1">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.waiting_for_files_description',
                              'Ask the AI to create a screen and paths will be detected automatically.'
                            )}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {!detectedTargetPath && (
                      <>
                        <div className="gba:space-y-2">
                          <Label htmlFor="target-path">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.target_path_field',
                              'Target Path *'
                            )}
                          </Label>
                          <Input
                            id="target-path"
                            value={targetPath}
                            onChange={e => setTargetPath(e.target.value)}
                            placeholder="platform/examples/apps/my-screen"
                          />
                          <p className="gba:text-xs gba:text-muted-foreground">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.target_path_format',
                              'The path relative to the configured publish base path'
                            )}
                          </p>
                        </div>

                        <div className="gba:space-y-2">
                          <Label htmlFor="resource-url">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.resource_url_field',
                              'Resource URL *'
                            )}
                          </Label>
                          <Input
                            id="resource-url"
                            value={resourceUrl}
                            onChange={e => setResourceUrl(e.target.value)}
                            placeholder="/platform/my-screen"
                          />
                          <p className="gba:text-xs gba:text-muted-foreground">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.resource_url_help',
                              'The URL path where the screen will be accessible (e.g., /lead-list)'
                            )}
                          </p>
                        </div>
                      </>
                    )}

                    <Alert>
                      <AlertCircle className="gba:w-4 gba:h-4" />
                      <AlertDescription className="gba:text-xs">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.publish_info',
                          'This will build the screen, upload to Azure, and automatically register it in the platform with the resource URL.'
                        )}
                      </AlertDescription>
                    </Alert>

                    {publishError && (
                      <Alert variant="destructive">
                        <AlertCircle className="gba:w-4 gba:h-4" />
                        <AlertDescription className="gba:text-xs gba:max-h-40 gba:overflow-y-auto gba:whitespace-pre-wrap">
                          {publishError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
                      <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={isPublishing}>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.cancel', 'Cancel')}
                      </Button>
                      <Button
                        onClick={handlePublish}
                        disabled={isPublishing || !targetPath || !resourceUrl}
                        className="gba:gap-2"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publishing', 'Publishing...')}
                          </>
                        ) : (
                          <>
                            <Upload className="gba:w-4 gba:h-4" />
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_screen', 'Publish Screen')}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedFile && (
              <FilePreview
                filePath={selectedFile}
                repoId={repositoryId}
                sessionId={sessionId}
                onClose={() => setSelectedFile(null)}
              />
            )}
          </div>
        </>
      </div>
    </div>
  )
}
