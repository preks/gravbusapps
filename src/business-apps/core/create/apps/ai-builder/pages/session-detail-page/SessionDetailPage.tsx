import React, { useState, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@newwork/nw-design-system'
import {
  Sparkles,
  Upload,
  Download,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  X,
  PanelLeft,
  PanelLeftClose,
  ArrowLeft
} from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import screenDiscoveryConfig from '../../../../../../../../scripts/screen-discovery.config.json'
import { SYSTEM_PROMPT } from '../../config/systemPrompt'
import { FileExplorer } from './components/FileExplorer'
import { FilePreview } from './components/FilePreview'
import { IndexingProgress } from '../../components/IndexingProgress'
import { ChatDrawer } from './components/ChatDrawer'
import { PublishDialog } from './components/PublishDialog'
import { PreviewSandbox, type PreviewSandboxHandle } from '@/common/components/ai-builder/sandbox'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import { sanitizeFilename, getSafeHref } from '../../utils/helpers'
import { SessionMetadata } from '../../types/session'

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
  createdBy?: string
  editHistory?: Array<{
    userId: string
    editedAt: string
  }>
  messageId?: string
  createdAt?: string
  serverCreatedAt?: string
  localOnly?: boolean
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
  const [publishVersionType, setPublishVersionType] = useState<'major' | 'minor'>('minor')
  const [publishVersionNote, setPublishVersionNote] = useState('')
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [pendingRestoreMessage, setPendingRestoreMessage] = useState<Message | null>(null)
  const [isRestoringMessageId, setIsRestoringMessageId] = useState<string | null>(null)
  const [publishAfterRestore, setPublishAfterRestore] = useState(true)
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
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [previewBuildStatus, setPreviewBuildStatus] = useState<{
    active: boolean
    lines: string[]
    error: string | null
  }>({ active: false, lines: [], error: null })
  const [fileExplorerRefreshKey, setFileExplorerRefreshKey] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const messagesRef = useRef<Message[]>([])

  const builderClient = useBuilderClient(context.accessToken)
  const toolIdCounter = useRef(0)
  const previewSandboxRef = useRef<PreviewSandboxHandle>(null)
  const previousChangeCountRef = useRef(0)
  const publishProgressRef = useRef<string[]>([])
  const restoreProgressRef = useRef<string[]>([])
  const screenBuildUsedRef = useRef(false)
  const screenBuildSucceededRef = useRef(false)
  const filesChangedInRunRef = useRef(false)
  const resolvedTargetPath = detectedTargetPath || targetPath
  const UNKNOWN_AUTHOR_ID = 'unknown-user'

  const getCurrentUserId = (): string | undefined => {
    return context.userInfo?.id ?? undefined
  }

  const getDefaultCreatedBy = (role: MessageRole): string | undefined => {
    if (role !== 'user') return undefined
    return getCurrentUserId() ?? UNKNOWN_AUTHOR_ID
  }

  const createMessageId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  const buildMessage = (role: MessageRole, content: string, extras?: Partial<Message>): Message => ({
    role,
    content,
    messageId: createMessageId(),
    createdAt: new Date().toISOString(),
    createdBy: extras?.createdBy ?? getDefaultCreatedBy(role),
    ...extras
  })

  const ensureMessageMetadata = (history: Message[]): { messages: Message[]; updated: boolean } => {
    let updated = false
    const messages = history.map(message => {
      const needsId = !message.messageId
      const needsCreatedAt = !message.createdAt
      const needsCreatedBy = message.role === 'user' && !message.createdBy
      if (!needsId && !needsCreatedAt && !needsCreatedBy) return message
      updated = true
      return {
        ...message,
        messageId: message.messageId ?? createMessageId(),
        createdAt: message.createdAt ?? new Date().toISOString(),
        createdBy: message.createdBy ?? (message.role === 'user' ? UNKNOWN_AUTHOR_ID : undefined)
      }
    })
    return { messages, updated }
  }

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const hasSuccessfulScreenBuildInMessages = (items: Message[]): boolean => {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const message = items[i]
      if (!message.toolCalls || message.toolCalls.length === 0) continue
      for (let j = message.toolCalls.length - 1; j >= 0; j -= 1) {
        const call = message.toolCalls[j]
        if (call.tool !== 'screen_build') continue
        const resultText = call.result ?? ''
        if (resultText.includes('"success": true') || resultText.includes('"success":true')) {
          return true
        }
      }
    }
    return false
  }

  const readSseStream = async <T,>(stream: ReadableStream, onEvent: (event: T) => void): Promise<void> => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          onEvent(JSON.parse(payload))
        } catch {
          console.warn('Failed to parse SSE payload', payload)
        }
      }
    }
  }

  const formatPublishProgress = (lines: string[]): string => {
    if (lines.length === 0) {
      return 'Publish in progress...'
    }
    return `Publish in progress...\n${lines.map(line => `- ${line}`).join('\n')}`
  }

  const updatePublishTempMessage = (messageId: string, line: string) => {
    publishProgressRef.current = [...publishProgressRef.current, line].slice(-6)
    const nextContent = formatPublishProgress(publishProgressRef.current)
    setMessages(prev =>
      prev.map(message => (message.messageId === messageId ? { ...message, content: nextContent } : message))
    )
  }

  const formatRestoreProgress = (lines: string[]): string => {
    if (lines.length === 0) {
      return 'Restore in progress...'
    }
    return `Restore in progress...\n${lines.map(line => `- ${line}`).join('\n')}`
  }

  const updateRestoreTempMessage = (messageId: string, line: string) => {
    restoreProgressRef.current = [...restoreProgressRef.current, line].slice(-6)
    const nextContent = formatRestoreProgress(restoreProgressRef.current)
    setMessages(prev =>
      prev.map(message => (message.messageId === messageId ? { ...message, content: nextContent } : message))
    )
  }

  const replaceTempMessage = (messageId: string, nextMessage: Message) => {
    setMessages(prev => {
      const remaining = prev.filter(message => message.messageId !== messageId)
      return [...remaining, nextMessage]
    })
  }

  const removeTempMessage = (messageId: string) => {
    setMessages(prev => prev.filter(message => message.messageId !== messageId))
  }

  const toggleFileExplorer = () => {
    const newValue = !showFileExplorer
    setShowFileExplorer(newValue)
    localStorage.setItem('ai-builder-show-file-explorer', String(newValue))
  }

  const refreshFileExplorer = () => {
    setFileExplorerRefreshKey(prev => prev + 1)
  }

  const getNormalizedChangeType = (type: string): 'create' | 'modify' | 'delete' => {
    if (type === 'create') return 'create'
    if (type === 'delete') return 'delete'
    return 'modify'
  }

  const getFileTypeDotClass = (type: 'create' | 'modify' | 'delete'): string => {
    if (type === 'create') return 'gba:bg-success'
    if (type === 'delete') return 'gba:bg-destructive'
    return 'gba:bg-warning'
  }

  const normalizeNonEmpty = (value?: string | null): string | null => {
    return value?.trim() ?? null
  }

  const normalizeResourceUrl = (value?: string | null): string | null => {
    const normalized = normalizeNonEmpty(value)
    if (!normalized) return null
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  }

  const getAutoResourceUrl = (pathValue: string): string => {
    const segments = pathValue.split('/').filter(Boolean)
    const screenName = segments[segments.length - 1] ?? pathValue
    return `/platform/generated/${screenName}`
  }

  const toPreviewAppName = (pathValue?: string | null): string | null => {
    const normalizedPath = normalizeNonEmpty(pathValue)
    if (!normalizedPath) return null
    const lastSegment = normalizedPath.split('/').filter(Boolean).pop()
    if (!lastSegment) return null
    return lastSegment
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
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
          const latestIndexFile = indexFiles[indexFiles.length - 1]
          const match = screenRootPattern.exec(latestIndexFile.path)
          if (match) {
            const detectedPath = match[1]
            setDetectedTargetPath(detectedPath)
            setTargetPath(detectedPath)
            const autoResourceUrl = getAutoResourceUrl(detectedPath)
            const normalizedResourceUrl = normalizeResourceUrl(resourceUrl)
            const previousAutoResourceUrl = detectedTargetPath ? getAutoResourceUrl(detectedTargetPath) : null
            // Auto-generate resource URL from the last segment when not set or previously auto-generated
            if (
              !normalizedResourceUrl ||
              (previousAutoResourceUrl && normalizedResourceUrl === previousAutoResourceUrl)
            ) {
              setResourceUrl(autoResourceUrl)
            }
          }
        }
      }
      return fileCount
    } catch (error) {
      console.error('Failed to get changes:', error)
      return 0
    }
  }

  const refreshPreview = async (options?: { force?: boolean }) => {
    if (!sessionId) return
    if (previewBuildStatus.active) return

    setPreviewBuildStatus({
      active: true,
      lines: ['Starting preview build...'],
      error: null
    })

    try {
      const stream = await builderClient.buildPreviewStream({
        sessionId,
        bundle: options?.force
      })
      await readSseStream<{ type?: string; message?: string; result?: { cacheHit?: boolean } }>(stream, event => {
        if (event?.type === 'done') {
          setPreviewBuildStatus(prev => ({
            ...prev,
            active: true,
            lines: [...prev.lines, 'Reloading preview...'].slice(-6),
            error: null
          }))
          if (!previewReady) {
            setPreviewReady(true)
          }
          previewSandboxRef.current?.reload()
          return
        }
        if (event?.type === 'error') {
          setPreviewBuildStatus(prev => ({
            ...prev,
            active: false,
            error: event.message || 'Preview build failed'
          }))
          return
        }
        const line = event?.message || event?.type || 'Working...'
        setPreviewBuildStatus(prev => ({
          ...prev,
          active: true,
          lines: [...prev.lines, line].slice(-6),
          error: null
        }))
      })
    } catch (error) {
      setPreviewBuildStatus({
        active: false,
        lines: [],
        error: error instanceof Error ? error.message : 'Preview build failed'
      })
    }
  }

  useEffect(() => {
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    if (!currentSession) return
    setTargetPath(prev => normalizeNonEmpty(prev) ?? normalizeNonEmpty(currentSession.targetPath) ?? '')
    setResourceUrl(prev => normalizeNonEmpty(prev) ?? normalizeNonEmpty(currentSession.resourceUrl) ?? '')
  }, [sessionId, sessions])

  useEffect(() => {
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    if (!currentSession) return
    const nextTargetPath =
      normalizeNonEmpty(detectedTargetPath) ??
      normalizeNonEmpty(targetPath) ??
      normalizeNonEmpty(currentSession.targetPath)
    const nextResourceUrl = normalizeNonEmpty(resourceUrl) ?? normalizeNonEmpty(currentSession.resourceUrl)
    const updatedSession: SessionMetadata = {
      ...currentSession,
      targetPath: nextTargetPath,
      resourceUrl: nextResourceUrl,
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
    refreshPreview()
    builderClient
      .loadChatHistory(repositoryId, sessionId)
      .then(history => {
        if (history?.length) {
          const normalized = ensureMessageMetadata(history as Message[])
          if (normalized.updated) {
            builderClient.saveChatHistory(repositoryId, sessionId, normalized.messages)
          }
          setMessages(normalized.messages as Message[])
          return
        }
        setMessages([])
      })
      .catch(error => {
        console.error('Failed to load chat history:', error)
        setMessages([])
      })
  }, [sessionId])

  useEffect(() => {
    const persistableMessages = debouncedMessages.filter(message => !message.localOnly)
    if (sessionId && persistableMessages.length > 0) {
      builderClient.saveChatHistory(repositoryId, sessionId, persistableMessages)
    }
  }, [debouncedMessages, sessionId, repositoryId])

  const currentSession = sessions.find(s => s.sessionId === sessionId)
  const previewAppName = toPreviewAppName(detectedTargetPath || targetPath || currentSession?.targetPath || null)

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
    setPublishSuccess(null)
    setShowPublishDialog(false)
    publishProgressRef.current = []

    const tempMessageId = createMessageId()
    setMessages(prev => [
      ...prev,
      buildMessage('assistant', formatPublishProgress([]), {
        messageId: tempMessageId,
        localOnly: true
      })
    ])

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

      const stream = await builderClient.publishScreenStream({
        repoId: repositoryId,
        sessionId,
        versionType: publishVersionType,
        versionNote: publishVersionNote
      })

      let completed = false
      await readSseStream<{
        type?: string
        message?: string
        result?: { targetPath?: string; resourceUrl?: string; azureUrl?: string; message?: string }
      }>(stream, event => {
        if (!event) return
        if (event.type === 'done') {
          completed = true
          const result = event.result
          const publishedPath = result?.targetPath || targetPath
          const normalizedResourceUrl = normalizeResourceUrl(result?.resourceUrl) ?? normalizeResourceUrl(resourceUrl)
          const fallbackUrl = normalizeResourceUrl(publishedPath)
          const fullUrl = normalizedResourceUrl || fallbackUrl || `/${publishedPath}`
          setPublishSuccess(fullUrl)
          setPublishError(null)
          setPublishVersionNote('')
          const linkText = fullUrl
          replaceTempMessage(
            tempMessageId,
            buildMessage(
              'assistant',
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_success_message',
                `✅ **Screen published successfully!**\n\nOpen screen: [${linkText}](${linkText})`,
                { url: linkText }
              )
            )
          )
          setTimeout(() => setPublishSuccess(null), 10000)
          return
        }
        if (event.type === 'error') {
          const errorMessage = event.message || 'Publish failed'
          setPublishError(errorMessage)
          setMessages(prev =>
            prev.map(message =>
              message.messageId === tempMessageId
                ? { ...message, content: `Publish failed:\n${errorMessage}` }
                : message
            )
          )
          return
        }
        const line = event.message || event.type || 'Working...'
        updatePublishTempMessage(tempMessageId, line)
      })

      if (!completed) {
        const errorMessage = 'Publish completed without a final status.'
        setPublishError(errorMessage)
      }
    } catch (error) {
      console.error('Publish failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setPublishError(errorMessage)
      setMessages(prev =>
        prev.map(message =>
          message.messageId === tempMessageId ? { ...message, content: `Publish failed:\n${errorMessage}` } : message
        )
      )
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

  const openRestoreDialog = (message: Message) => {
    if (!sessionId || !message.messageId || !resolvedTargetPath) return
    setPendingRestoreMessage(message)
    setPublishAfterRestore(true)
    setShowRestoreDialog(true)
  }

  const confirmRestoreMessage = async () => {
    if (!sessionId || !pendingRestoreMessage?.messageId || !resolvedTargetPath) return
    const restoreTarget = pendingRestoreMessage
    const restoreMessageId = restoreTarget.messageId
    if (!restoreMessageId) return
    setShowRestoreDialog(false)
    setPendingRestoreMessage(null)
    setRestoreError(null)
    setIsRestoringMessageId(restoreMessageId)
    restoreProgressRef.current = []
    const tempMessageId = createMessageId()
    setMessages(prev => [
      ...prev,
      buildMessage('assistant', formatRestoreProgress([]), {
        messageId: tempMessageId,
        localOnly: true
      })
    ])
    try {
      updateRestoreTempMessage(tempMessageId, 'Restoring files and chat')
      await builderClient.restoreToMessage({
        repoId: repositoryId,
        sessionId,
        targetPath: resolvedTargetPath,
        messageId: restoreMessageId,
        restoreChat: true
      })
      updateRestoreTempMessage(tempMessageId, 'Checking for changes')
      const newCount = await checkForChanges()
      updateRestoreTempMessage(tempMessageId, 'Reloading chat history')
      const history = await builderClient.loadChatHistory(repositoryId, sessionId)
      if (history?.length) {
        const normalized = ensureMessageMetadata(history as Message[])
        if (normalized.updated) {
          builderClient.saveChatHistory(repositoryId, sessionId, normalized.messages)
        }
        setMessages([
          ...(normalized.messages as Message[]),
          buildMessage('assistant', formatRestoreProgress(restoreProgressRef.current), {
            messageId: tempMessageId,
            localOnly: true
          })
        ])
      } else {
        setMessages([
          buildMessage('assistant', formatRestoreProgress(restoreProgressRef.current), {
            messageId: tempMessageId,
            localOnly: true
          })
        ])
      }
      previousChangeCountRef.current = newCount
      removeTempMessage(tempMessageId)
      if (publishAfterRestore) {
        await handlePublish()
      }
      await refreshPreview()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore message'
      removeTempMessage(tempMessageId)
      setRestoreError(message)
    } finally {
      setIsRestoringMessageId(null)
    }
  }

  const findPreviousAssistantMessage = (history: Message[], targetIndex: number): Message | null => {
    for (let i = targetIndex - 1; i >= 0; i -= 1) {
      const candidate = history[i]
      if (candidate.role === 'assistant' && candidate.messageId) {
        return candidate
      }
    }
    return null
  }

  const handleEditMessage = async (message: Message, nextContent: string) => {
    if (!sessionId || !resolvedTargetPath) return
    const trimmedContent = nextContent.trim()
    if (!trimmedContent || loading) return
    const historySnapshot = messagesRef.current
    const targetIndex = historySnapshot.findIndex(item => item.messageId === message.messageId)
    if (targetIndex === -1) return
    const previousAssistant = findPreviousAssistantMessage(historySnapshot, targetIndex)

    setIsRestoringMessageId(message.messageId ?? null)
    restoreProgressRef.current = []
    const tempMessageId = createMessageId()
    setMessages(prev => [
      ...prev,
      buildMessage('assistant', formatRestoreProgress([]), {
        messageId: tempMessageId,
        localOnly: true
      })
    ])

    try {
      updateRestoreTempMessage(tempMessageId, 'Restoring files and chat')
      if (previousAssistant?.messageId) {
        await builderClient.restoreToMessage({
          repoId: repositoryId,
          sessionId,
          targetPath: resolvedTargetPath,
          messageId: previousAssistant.messageId,
          restoreChat: true
        })
      } else {
        await builderClient.restoreToInitial({
          repoId: repositoryId,
          sessionId,
          targetPath: resolvedTargetPath,
          restoreChat: true
        })
      }

      updateRestoreTempMessage(tempMessageId, 'Reloading chat history')
      const history = await builderClient.loadChatHistory(repositoryId, sessionId)
      const normalized = ensureMessageMetadata(history as Message[])
      if (normalized.updated) {
        builderClient.saveChatHistory(repositoryId, sessionId, normalized.messages)
      }

      const editorId = getCurrentUserId() ?? UNKNOWN_AUTHOR_ID
      const editedMessage: Message = {
        ...message,
        content: trimmedContent,
        createdBy: message.createdBy ?? editorId,
        editHistory: [...(message.editHistory ?? []), { userId: editorId, editedAt: new Date().toISOString() }]
      }

      const nextHistory = [...(normalized.messages as Message[]), editedMessage]
      setMessages(nextHistory)
      await builderClient.saveChatHistory(repositoryId, sessionId, nextHistory)

      updateRestoreTempMessage(tempMessageId, 'Sending updated prompt')
      await runPrompt(trimmedContent, normalized.messages as Message[])
      removeTempMessage(tempMessageId)
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to edit message'
      removeTempMessage(tempMessageId)
      setRestoreError(messageText)
    } finally {
      setIsRestoringMessageId(null)
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
    markScreenBuildUsed: () => void
    markScreenBuildSucceeded: () => void
    setPreviewBuildStatus: React.Dispatch<
      React.SetStateAction<{
        active: boolean
        lines: string[]
        error: string | null
      }>
    >
    markFilesChanged: () => void
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
        next.push(buildMessage('assistant', '', { thinkingLog: '', thinkingCollapsed: false }))
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
      ctx.setMessages(prev => [...prev, buildMessage('assistant', '')])
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
    if (data.toolName === 'screen_build') {
      ctx.markScreenBuildUsed()
      ctx.setPreviewBuildStatus({
        active: true,
        lines: ['Waiting for build to start...'],
        error: null
      })
    }
    if (!streamState.hasCreatedInitialMessage) {
      ctx.setMessages(prev => [...prev, buildMessage('assistant', '')])
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
    const resultContent =
      typeof data.content === 'string'
        ? data.content
        : data.toolResult && typeof data.toolResult === 'object'
          ? JSON.stringify(data.toolResult)
          : ''

    if (data.toolName === 'screen_build') {
      const toolResult =
        data.toolResult && typeof data.toolResult === 'object' ? (data.toolResult as Record<string, unknown>) : null
      const statusLines =
        Array.isArray(toolResult?.lines) && toolResult?.lines.length > 0
          ? (toolResult.lines.filter(line => typeof line === 'string') as string[])
          : []
      const resultMessage = typeof toolResult?.message === 'string' ? toolResult.message : null
      const successFromResult = toolResult?.success === true
      const successFromContent = resultContent.includes('"success": true') || resultContent.includes('"success":true')
      if (successFromResult || successFromContent) {
        ctx.markScreenBuildSucceeded()
        ctx.setPreviewBuildStatus(prev => ({
          ...prev,
          active: true,
          lines: [
            ...(statusLines.length > 0 ? statusLines : prev.lines),
            ...(resultMessage ? [resultMessage] : []),
            'Waiting to reload preview...'
          ].slice(-6),
          error: null
        }))
      } else {
        const failedMessage =
          (data.toolResult &&
            typeof data.toolResult === 'object' &&
            'error' in (data.toolResult as Record<string, unknown>) &&
            typeof (data.toolResult as Record<string, unknown>).error === 'string' &&
            ((data.toolResult as Record<string, unknown>).error as string)) ||
          'Preview build failed'
        ctx.setPreviewBuildStatus(prev => ({
          ...prev,
          active: false,
          lines: [
            ...(statusLines.length > 0 ? statusLines : prev.lines),
            ...(resultMessage ? [resultMessage] : ['Preview build failed'])
          ].slice(-6),
          error: failedMessage as string
        }))
      }
    }
    if (data.toolName === 'write_file' || data.toolName === 'delete_file') {
      const toolResult =
        data.toolResult && typeof data.toolResult === 'object' ? (data.toolResult as Record<string, unknown>) : null
      if (
        toolResult?.success === true ||
        resultContent.includes('"success": true') ||
        resultContent.includes('"success":true')
      ) {
        ctx.markFilesChanged()
      }
    }
    ctx.setMessages(prev => {
      const newMessages = [...prev]
      const lastMsg = newMessages[newMessages.length - 1]
      if (!lastMsg.toolCalls) return newMessages
      const runningTools = lastMsg.toolCalls.filter(t => t.tool === data.toolName && t.status === 'running')
      if (runningTools.length === 0) return newMessages
      const tool = runningTools[runningTools.length - 1]
      tool.status = 'complete'
      tool.result = resultContent
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

  const runPrompt = async (userInput: string, history: Message[]) => {
    screenBuildUsedRef.current = false
    screenBuildSucceededRef.current = false
    filesChangedInRunRef.current = false
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
      const stream = await builderClient.queryCode(
        repositoryId,
        userInput,
        history.slice(-20),
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
        toolIdCounter,
        markScreenBuildUsed: () => {
          screenBuildUsedRef.current = true
        },
        markScreenBuildSucceeded: () => {
          screenBuildSucceededRef.current = true
        },
        setPreviewBuildStatus,
        markFilesChanged: () => {
          filesChangedInRunRef.current = true
        }
      }
      await runStreamToEnd(reader, streamState, ctx)
    } catch (error) {
      console.error('Query failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessages(prev => [
        ...prev,
        buildMessage(
          'assistant',
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.error_message',
            `Sorry, there was an error: ${errorMessage}`,
            { error: errorMessage }
          )
        )
      ])
    } finally {
      setLoading(false)
      setTimeout(async () => {
        const newCount = await checkForChanges()
        if (filesChangedInRunRef.current || newCount > previousChangeCountRef.current) {
          refreshFileExplorer()
        }
        const hasNewChanges = newCount > previousChangeCountRef.current
        if (hasNewChanges) {
          const succeededFromMessages = hasSuccessfulScreenBuildInMessages(messagesRef.current)
          if ((screenBuildUsedRef.current && screenBuildSucceededRef.current) || succeededFromMessages) {
            setPreviewBuildStatus(prev => ({
              ...prev,
              active: true,
              lines: [...prev.lines, 'Reloading preview...'].slice(-6),
              error: null
            }))
            setPreviewReady(true)
            previewSandboxRef.current?.reload()
          } else {
            await refreshPreview()
          }
        } else if (screenBuildUsedRef.current && screenBuildSucceededRef.current) {
          // screen_build succeeded but no new diff count; close overlay cleanly
          setPreviewBuildStatus(prev => ({
            ...prev,
            active: false,
            lines: [...prev.lines, 'Preview already up to date'].slice(-6),
            error: null
          }))
        }
        previousChangeCountRef.current = newCount
        screenBuildUsedRef.current = false
        screenBuildSucceededRef.current = false
        filesChangedInRunRef.current = false
      }, 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMessage = buildMessage('user', input)
    const userInput = input
    setMessages(prev => [...prev, userMessage])
    setInput('')
    await runPrompt(userInput, messages)
  }

  const restoreMessagePreview = pendingRestoreMessage?.content ? pendingRestoreMessage.content.slice(0, 160) : ''
  const restoreMessageTimeValue = pendingRestoreMessage?.createdAt || pendingRestoreMessage?.serverCreatedAt || ''
  const restoreMessageTimestamp = restoreMessageTimeValue ? new Date(restoreMessageTimeValue).toLocaleString() : ''

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
        {fileExplorerEnabled && showFileExplorer && sessionId && (
          <div className="gba:w-[320px] gba:border-r gba:border-border gba:flex-shrink-0 gba:bg-card/80 gba:backdrop-blur-sm">
            <FileExplorer
              key={`${sessionId}-${fileExplorerRefreshKey}`}
              repoId={repositoryId}
              sessionId={sessionId}
              onFileClick={path => setSelectedFile(path)}
            />
          </div>
        )}

        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
          {restoreError && (
            <div className="gba:bg-destructive/10 gba:border-b gba:border-destructive/30">
              <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <AlertCircle className="gba:w-5 gba:h-5 gba:text-destructive" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-destructive">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.restore_failed', 'Restore failed')}
                      </p>
                      <p className="gba:text-xs gba:text-destructive/90">{restoreError}</p>
                    </div>
                  </div>
                  <button onClick={() => setRestoreError(null)} className="gba:text-destructive hover:gba:opacity-80">
                    <X className="gba:w-4 gba:h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
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
                            {uniqueFileSummary?.totalUniqueFiles}{' '}
                            {(uniqueFileSummary?.totalUniqueFiles ?? 0) === 1
                              ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.file_singular', 'file')
                              : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.file_plural', 'files')}
                          </span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                          {(uniqueFileSummary?.created ?? 0) > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                              {uniqueFileSummary?.created}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.created', 'created')}
                            </span>
                          )}
                          {(uniqueFileSummary?.modified ?? 0) > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                              {uniqueFileSummary?.modified}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.modified', 'modified')}
                            </span>
                          )}
                          {(uniqueFileSummary?.deleted ?? 0) > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                              {uniqueFileSummary?.deleted}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.deleted', 'deleted')}
                            </span>
                          )}
                        </div>
                        <details className="gba:mt-2 gba:text-xs">
                          <summary className="gba:cursor-pointer gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors">
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.view_files', 'View files')}
                          </summary>
                          <div className="gba:mt-2 gba:space-y-1 gba:pl-4 gba:max-h-40 gba:overflow-y-auto gba:pr-2">
                            {uniqueFileSummary?.files.map(file => (
                              <div
                                key={file.path}
                                className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:py-0.5"
                              >
                                <span
                                  className={`gba:w-1 gba:h-1 gba:rounded-full gba:flex-shrink-0 ${getFileTypeDotClass(file.type)}`}
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
                    onRestoreMessage={openRestoreDialog}
                    onEditMessage={handleEditMessage}
                    isRestoringMessageId={isRestoringMessageId}
                    currentUserId={context.userInfo?.id}
                    accessToken={context.accessToken}
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
                      ref={previewSandboxRef}
                      repoId={repositoryId}
                      sessionId={sessionId}
                      previewAppName={previewAppName}
                      accessToken={context.accessToken}
                      userInfo={context.userInfo}
                      buildStatus={previewBuildStatus}
                      allowLoad={previewReady}
                      onReady={() => {
                        setPreviewBuildStatus(prev => ({ ...prev, active: false }))
                      }}
                      onError={error => {
                        setPreviewBuildStatus(prev => ({
                          ...prev,
                          active: false,
                          error: error.message || 'Preview failed to load'
                        }))
                      }}
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
                  onRestoreMessage={openRestoreDialog}
                  onEditMessage={handleEditMessage}
                  isRestoringMessageId={isRestoringMessageId}
                  currentUserId={context.userInfo?.id}
                  accessToken={context.accessToken}
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
                  className="gba:flex-1 gba:min-h-0"
                />
              </main>
            )}
          </div>
          {showPublishDialog && (
            <PublishDialog
              uniqueFileSummary={uniqueFileSummary}
              detectedTargetPath={detectedTargetPath}
              targetPath={targetPath}
              resourceUrl={resourceUrl}
              publishError={publishError}
              isPublishing={isPublishing}
              publishVersionType={publishVersionType}
              publishVersionNote={publishVersionNote}
              onClose={() => setShowPublishDialog(false)}
              onTargetPathChange={setTargetPath}
              onResourceUrlChange={setResourceUrl}
              onVersionTypeChange={setPublishVersionType}
              onVersionNoteChange={setPublishVersionNote}
              onPublish={handlePublish}
            />
          )}

          {showRestoreDialog && pendingRestoreMessage && (
            <div className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center gba:z-50 gba:p-4">
              <Card className="gba:w-full gba:max-w-xl">
                <CardHeader className="gba:border-b">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle className="gba:text-lg">Restore Message</CardTitle>
                    <button
                      onClick={() => {
                        setShowRestoreDialog(false)
                        setPendingRestoreMessage(null)
                      }}
                      className="gba:text-muted-foreground hover:gba:text-foreground"
                    >
                      <X className="gba:w-4 gba:h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="gba:space-y-4">
                  <div className="gba:text-sm gba:text-foreground gba:space-y-2">
                    <p>
                      You are about to restore to this chat message. Any publish you did after the restore point is
                      still deployed.
                    </p>
                    {restoreMessageTimestamp && (
                      <p className="gba:text-xs gba:text-muted-foreground">{restoreMessageTimestamp}</p>
                    )}
                    {restoreMessagePreview && (
                      <div className="gba:text-xs gba:text-muted-foreground gba:bg-muted/40 gba:border gba:rounded-md gba:p-2 gba:line-clamp-3">
                        {restoreMessagePreview}
                      </div>
                    )}
                  </div>
                  <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                    <input
                      type="checkbox"
                      checked={publishAfterRestore}
                      onChange={e => setPublishAfterRestore(e.target.checked)}
                    />
                    Publish after restore (recommended)
                  </label>
                  <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2 gba:border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRestoreDialog(false)
                        setPendingRestoreMessage(null)
                      }}
                      disabled={isRestoringMessageId === pendingRestoreMessage.messageId}
                    >
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onClick={confirmRestoreMessage}
                      disabled={isRestoringMessageId === pendingRestoreMessage.messageId}
                    >
                      {isRestoringMessageId === pendingRestoreMessage.messageId ? 'Restoring...' : 'Restore'}
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
      </div>
    </div>
  )
}
