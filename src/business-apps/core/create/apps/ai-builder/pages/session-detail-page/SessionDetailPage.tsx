import React, { useState, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import screenDiscoveryConfig from '../../../../../../../../scripts/screen-discovery.config.json'
import { SYSTEM_PROMPT } from '../../config/systemPrompt'
import { FileExplorer } from './components/FileExplorer'
import { FilePreview } from './components/FilePreview'
import { ChatDrawer } from './components/ChatDrawer'
import { PublishDialog } from './components/PublishDialog'
import { PreviewSandbox, type PreviewSandboxHandle } from '@/common/components/ai-builder/sandbox'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import { sanitizeFilename } from '../../utils/helpers'
import { SessionMetadata } from '../../types/session'
import { SessionDetailHero } from './components/SessionDetailHero'

type MessageRole = 'user' | 'assistant'

interface Message {
  role: MessageRole
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
  const previewSandboxRef = useRef<PreviewSandboxHandle>(null)
  const previousChangeCountRef = useRef(0)

  const toggleFileExplorer = () => {
    const newValue = !showFileExplorer
    setShowFileExplorer(newValue)
    localStorage.setItem('ai-builder-show-file-explorer', String(newValue))
  }

  const getNormalizedChangeType = (type: string): 'create' | 'modify' | 'delete' => {
    if (type === 'create') return 'create'
    if (type === 'delete') return 'delete'
    return 'modify'
  }

  const checkForChanges = async (): Promise<number> => {
    if (!sessionId) return 0
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    const repoIdToUse = currentSession?.repoId ?? repositoryId
    if (!repoIdToUse) return 0
    try {
      const data: ChangesResponse = await builderClient.getChanges(repoIdToUse, sessionId)
      const fileCount = data.summary?.files?.length ?? 0
      if (data.summary?.files) {
        const fileMap = new Map<string, { path: string; type: 'create' | 'modify' | 'delete' }>()
        data.summary.files.forEach((file: FileChange) => {
          fileMap.set(file.path, { path: file.path, type: getNormalizedChangeType(file.type) })
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
      if (data.summary?.files) {
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
      return fileCount
    } catch (error) {
      console.error('Failed to get changes:', error)
      return 0
    }
  }

  const handleDownloadPatch = async (): Promise<void> => {
    if (!sessionId) return
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
          : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.download_patch_failed', 'Failed to download patch')
      )
    }
  }

  useEffect(() => {
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    if (!currentSession) return
    const updatedSession: SessionMetadata = {
      ...currentSession,
      targetPath: detectedTargetPath ?? targetPath ?? currentSession.targetPath ?? null,
      resourceUrl: resourceUrl || currentSession.resourceUrl,
      lastModified: new Date().toISOString(),
      fileCount: uniqueFileSummary?.totalUniqueFiles ?? currentSession.fileCount
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
        if (history?.length) {
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
      builderClient.saveChatHistory(repositoryId, sessionId, debouncedMessages)
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

  type StreamCtx = {
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    setUsage: React.Dispatch<
      React.SetStateAction<{
        totalInputTokens: number
        totalOutputTokens: number
        totalCost: number
        lastCallCost: number
      }>
    >
    setThinking: (v: boolean) => void
    setThinkingContent: (v: React.SetStateAction<string>) => void
    toolIdCounter: React.MutableRefObject<number>
  }
  type StreamState = { assistantMessage: string; needsNewMessage: boolean; hasCreatedInitialMessage: boolean }

  const applyUsageEvent = (data: Record<string, unknown>, ctx: StreamCtx): void => {
    const usageData = typeof data.content === 'string' ? JSON.parse(data.content as string) : data.content
    const u = usageData as Record<string, number>
    ctx.setUsage(prev => ({
      totalInputTokens: prev.totalInputTokens + (u.totalInputTokens || 0),
      totalOutputTokens: prev.totalOutputTokens + (u.totalOutputTokens || 0),
      totalCost: prev.totalCost + (u.totalCost || 0),
      lastCallCost: u.callCost || 0
    }))
    ctx.setMessages(prev => {
      const newMessages = [...prev]
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant') {
          newMessages[i] = {
            ...newMessages[i],
            cost: {
              inputTokens: u.totalInputTokens || 0,
              outputTokens: u.totalOutputTokens || 0,
              totalCost: u.totalCost || 0
            }
          }
          break
        }
      }
      return newMessages
    })
  }

  const applyThinkingEvent = (data: Record<string, unknown>, ctx: StreamCtx): void => {
    ctx.setThinking(true)
    ctx.setThinkingContent(prev => prev + (data.content as string))
    ctx.setMessages(prev => {
      const next = [...prev]
      if (next.length === 0 || next[next.length - 1].role !== 'assistant') {
        next.push({ role: 'assistant', content: '', thinkingLog: '', thinkingCollapsed: false })
      }
      const last = next[next.length - 1]
      last.thinkingLog = (last.thinkingLog || '') + (data.content as string)
      if (typeof last.thinkingCollapsed !== 'boolean') last.thinkingCollapsed = false
      return next
    })
  }

  const applyTokenOrResponseEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    ctx.setThinking(false)
    ctx.setThinkingContent('')
    ctx.setMessages(prev => {
      const next = [...prev]
      if (next.length > 0 && next[next.length - 1].role === 'assistant' && next[next.length - 1].thinkingLog) {
        next[next.length - 1].thinkingCollapsed = true
      }
      return next
    })
    if (!streamState.hasCreatedInitialMessage || streamState.needsNewMessage) {
      ctx.setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      streamState.hasCreatedInitialMessage = true
      streamState.needsNewMessage = false
      streamState.assistantMessage = ''
    }
    streamState.assistantMessage += data.content as string
    ctx.setMessages(prev => {
      const newMessages = [...prev]
      newMessages[newMessages.length - 1].content = streamState.assistantMessage
      return newMessages
    })
  }

  const applyToolCallEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    if (!streamState.hasCreatedInitialMessage) {
      ctx.setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      streamState.hasCreatedInitialMessage = true
      streamState.assistantMessage = ''
    }
    const contentStr = data.content != null ? String(data.content) : ''
    const parenMatch = /\(([^)]*)\)/.exec(contentStr)
    const toolArgs = parenMatch?.[1]
    ctx.setMessages(prev => {
      const newMessages = [...prev]
      const lastMsg = newMessages[newMessages.length - 1]
      lastMsg.toolCalls ??= []
      const alreadyExists = lastMsg.toolCalls.some(t => t.tool === data.toolName && t.args === toolArgs)
      if (!alreadyExists) {
        ctx.toolIdCounter.current += 1
        lastMsg.toolCalls.push({
          tool: String(data.toolName),
          args: toolArgs,
          status: 'running',
          id: `tool-${ctx.toolIdCounter.current}`
        })
      }
      return newMessages
    })
  }

  const applyToolResultEvent = (data: Record<string, unknown>, ctx: StreamCtx): void => {
    ctx.setMessages(prev => {
      const newMessages = [...prev]
      const lastMsg = newMessages[newMessages.length - 1]
      if (!lastMsg.toolCalls) return newMessages
      const runningTools = lastMsg.toolCalls.filter(t => t.tool === data.toolName && t.status === 'running')
      if (runningTools.length === 0) return newMessages
      const tool = runningTools[runningTools.length - 1]
      tool.status = 'complete'
      tool.result = data.content as string
      return newMessages
    })
  }

  const processStreamEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    if (data.type === 'iteration_complete') {
      streamState.needsNewMessage = true
      return
    }
    if (data.type === 'usage' && data.content) {
      applyUsageEvent(data, ctx)
      return
    }
    if (data.type === 'thinking' && data.content) {
      applyThinkingEvent(data, ctx)
      return
    }
    if ((data.type === 'token' || data.type === 'response') && data.content) {
      applyTokenOrResponseEvent(data, streamState, ctx)
      return
    }
    if (data.type === 'tool_call' && data.toolName) {
      applyToolCallEvent(data, streamState, ctx)
      return
    }
    if (data.type === 'tool_result' && data.toolName) {
      applyToolResultEvent(data, ctx)
    }
  }

  const runStreamToEnd = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    streamState: StreamState,
    ctx: StreamCtx
  ): Promise<void> => {
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue
          const data = JSON.parse(jsonStr) as Record<string, unknown>
          if (data && typeof data === 'object') processStreamEvent(data, streamState, ctx)
        } catch {
          // skip parse error
        }
      }
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
      const currentSession = sessions.find(s => s.sessionId === sessionId)
      const repoIdToUse = currentSession?.repoId ?? repositoryId
      if (repoIdToUse) {
        const data: ChangesResponse = await builderClient.getChanges(repoIdToUse, sessionId)
        previousChangeCountRef.current = data.summary?.files?.length ?? 0
      }
      const history = messages.slice(-20)
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
      const streamState: StreamState = {
        assistantMessage: '',
        needsNewMessage: false,
        hasCreatedInitialMessage: false
      }
      const ctx: StreamCtx = {
        setMessages,
        setUsage,
        setThinking,
        setThinkingContent,
        toolIdCounter
      }
      await runStreamToEnd(reader, streamState, ctx)
    } catch (error) {
      console.error('Query failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.error_message',
            `Sorry, there was an error: ${errorMessage}`,
            { error: errorMessage }
          )
        }
      ])
    } finally {
      setLoading(false)
      setTimeout(async () => {
        const newCount = await checkForChanges()
        if (newCount > previousChangeCountRef.current) {
          previewSandboxRef.current?.reload()
        }
        previousChangeCountRef.current = newCount
      }, 2000)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background">
      <SessionDetailHero sessionId={sessionId} onBackToSessions={backToSessionList} />

      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {fileExplorerEnabled && showFileExplorer && sessionId && (
          <div className="gba:w-[480px] gba:border-r gba:border-border gba:flex-shrink-0 gba:bg-muted/30 gba:overflow-hidden">
            <FileExplorer
              repoId={repositoryId}
              sessionId={sessionId}
              onFileClick={path => setSelectedFile(path)}
              onDownloadPatch={handleDownloadPatch}
              uniqueFileSummary={uniqueFileSummary}
            />
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
                    getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.example_prompt_3', 'Generate a contact form')
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
                  showFileExplorer={showFileExplorer}
                  onToggleFileExplorer={toggleFileExplorer}
                  usage={usage}
                  uniqueFileSummary={uniqueFileSummary}
                  className="gba:flex-1 gba:min-h-0"
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="gba:bg-border" />
              <ResizablePanel
                defaultSize={75}
                minSize={25}
                className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none"
              >
                <PreviewSandbox
                  ref={previewSandboxRef}
                  repoId={repositoryId}
                  sessionId={sessionId}
                  accessToken={context.accessToken}
                  userInfo={context.userInfo}
                  uniqueFileSummary={uniqueFileSummary}
                  onPublish={() => {
                    setPublishError(null)
                    setShowPublishDialog(true)
                  }}
                  onDownloadPatch={handleDownloadPatch}
                  onRefresh={checkForChanges}
                  publishSuccess={publishSuccess}
                  onDismissPublishSuccess={() => setPublishSuccess(null)}
                />
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
                  getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.example_prompt_3', 'Generate a contact form')
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
                showFileExplorer={showFileExplorer}
                onToggleFileExplorer={toggleFileExplorer}
                usage={usage}
                uniqueFileSummary={uniqueFileSummary}
                className="gba:flex-1 gba:min-h-0"
              />
            </main>
          )}
        </div>
      </div>

      {showPublishDialog && (
        <PublishDialog
          uniqueFileSummary={uniqueFileSummary}
          detectedTargetPath={detectedTargetPath}
          targetPath={targetPath}
          resourceUrl={resourceUrl}
          publishError={publishError}
          isPublishing={isPublishing}
          onClose={() => setShowPublishDialog(false)}
          onTargetPathChange={setTargetPath}
          onResourceUrlChange={setResourceUrl}
          onPublish={handlePublish}
        />
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
  )
}
