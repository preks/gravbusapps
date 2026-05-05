import React, { useState, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@newwork/nw-design-system'
import { X, Download, Upload } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import screenDiscoveryConfig from '../../../../../../../../scripts/screen-discovery.config.json'
import { FileExplorer } from './components/FileExplorer'
import { FilePreview } from './components/FilePreview'
import { ChatDrawer } from './components/ChatDrawer'
import { PublishDialog } from './components/PublishDialog'
import { PreviewSandbox, type PreviewSandboxHandle } from '@/common/components/ai-builder/sandbox'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import { sanitizeFilename } from '../../utils/helpers'
import { SessionMetadata, UniqueFileSummary } from '../../types/session'
import { SessionDetailHero } from './components/SessionDetailHero'

type MessageRole = 'user' | 'assistant'

interface MessageBlock {
  type: 'thinking' | 'response'
  content: string
  collapsed?: boolean
  order?: number
}

type ToolDisplayKind = 'info' | 'success' | 'warning' | 'error'
type ToolDisplayStep = 'call' | 'progress' | 'result'

interface ToolCall {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
  order?: number
  displayTitle?: string
  displayDetail?: string
  displayKind?: ToolDisplayKind
  displayStep?: ToolDisplayStep
  progressLines?: string[]
}

interface Message {
  role: MessageRole
  content: string
  toolCalls?: ToolCall[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
  blocks?: MessageBlock[]
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
  checkpointCreatedAt?: string
  localOnly?: boolean
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
  const [queuedFollowUpPrompt, setQueuedFollowUpPrompt] = useState<string | null>(null)
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
  const [isSavingVersion, setIsSavingVersion] = useState(false)
  const [isFolderImporting, setIsFolderImporting] = useState(false)
  const [fileExplorerRefreshKey, setFileExplorerRefreshKey] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const messagesRef = useRef<Message[]>([])

  const builderClient = useBuilderClient(context.accessToken)
  const toolIdCounter = useRef(0)
  const toolIdPrefix = useRef(`tool-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const previewSandboxRef = useRef<PreviewSandboxHandle>(null)
  const importCurrentFolderInputRef = useRef<HTMLInputElement>(null)
  const previousChangeCountRef = useRef(0)
  const publishProgressRef = useRef<string[]>([])
  const restoreProgressRef = useRef<string[]>([])
  const screenBuildUsedRef = useRef(false)
  const screenBuildSucceededRef = useRef(false)
  const filesChangedInRunRef = useRef(false)
  const activeStreamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const stopRequestedRef = useRef(false)
  const persistedMessageSnapshotsRef = useRef<Map<string, string>>(new Map())
  const chatPersistenceInitializedRef = useRef(false)
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

  const createToolCallId = (ctx: StreamCtx): string => {
    ctx.toolIdCounter.current += 1
    return `${ctx.toolIdPrefix.current}-${ctx.toolIdCounter.current}`
  }

  const normalizeDisplayKind = (value: unknown): ToolDisplayKind | undefined => {
    if (value === 'info' || value === 'success' || value === 'warning' || value === 'error') {
      return value
    }
    return undefined
  }

  const normalizeDisplayStep = (value: unknown): ToolDisplayStep | undefined => {
    if (value === 'call' || value === 'progress' || value === 'result') {
      return value
    }
    return undefined
  }

  const getDisplayMetadataFromEvent = (
    data: Record<string, unknown>
  ): Pick<ToolCall, 'displayTitle' | 'displayDetail' | 'displayKind' | 'displayStep'> => {
    const displayTitle =
      typeof data.displayTitle === 'string' && data.displayTitle.trim() ? data.displayTitle.trim() : undefined
    const displayDetail =
      typeof data.displayDetail === 'string' && data.displayDetail.trim() ? data.displayDetail.trim() : undefined
    return {
      displayTitle,
      displayDetail,
      displayKind: normalizeDisplayKind(data.displayKind),
      displayStep: normalizeDisplayStep(data.displayStep)
    }
  }

  const stringifyToolArgs = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
      return value.trim() ? value : undefined
    }
    if (value && typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return undefined
      }
    }
    return undefined
  }

  const parseLegacyToolArgsFromContent = (value: string): string | undefined => {
    if (!value) return undefined
    const parenMatch = /\(([^)]*)\)/.exec(value)
    return parenMatch?.[1]
  }

  const extractToolPath = (value: string | undefined): string | undefined => {
    if (!value) return undefined
    const pathRegex = /(?:file_path|filePath|path|target_file|targetPath):\s*"([^"]+)"/
    const match = pathRegex.exec(value)
    return match?.[1]
  }

  const fallbackToolCallDisplay = (
    toolName: string,
    toolArgs: string | undefined
  ): Pick<ToolCall, 'displayTitle' | 'displayDetail' | 'displayKind' | 'displayStep'> => {
    const path = extractToolPath(toolArgs)
    if (toolName === 'file_read') {
      return {
        displayTitle: path ? `Reading ${path.split('/').pop()}` : 'Reading file',
        displayDetail: path,
        displayKind: 'info',
        displayStep: 'call'
      }
    }
    if (toolName === 'file_write') {
      return {
        displayTitle: path ? `Updating ${path.split('/').pop()}` : 'Updating file',
        displayDetail: path,
        displayKind: 'info',
        displayStep: 'call'
      }
    }
    if (toolName === 'file_edit') {
      return {
        displayTitle: path ? `Editing ${path.split('/').pop()}` : 'Editing file',
        displayDetail: path,
        displayKind: 'info',
        displayStep: 'call'
      }
    }
    if (toolName === 'delete_file') {
      return {
        displayTitle: path ? `Deleting ${path.split('/').pop()}` : 'Deleting file',
        displayDetail: path,
        displayKind: 'warning',
        displayStep: 'call'
      }
    }
    if (toolName === 'screen_build') {
      return {
        displayTitle: 'Validating preview build',
        displayKind: 'info',
        displayStep: 'call'
      }
    }
    return {
      displayTitle: toolName.replace(/_/g, ' '),
      displayKind: 'info',
      displayStep: 'call'
    }
  }

  const fallbackToolProgressDisplay = (
    toolName: string,
    content: string
  ): Pick<ToolCall, 'displayTitle' | 'displayDetail' | 'displayKind' | 'displayStep'> => {
    const normalizedContent = content.trim()
    if (!normalizedContent) {
      return {
        displayTitle: toolName.replace(/_/g, ' '),
        displayKind: 'info',
        displayStep: 'progress'
      }
    }
    return {
      displayTitle: normalizedContent,
      displayKind: 'info',
      displayStep: 'progress'
    }
  }

  const fallbackToolResultDisplay = (
    toolName: string,
    toolResult: Record<string, unknown> | null,
    resultContent: string
  ): Pick<ToolCall, 'displayTitle' | 'displayDetail' | 'displayKind' | 'displayStep'> => {
    const success =
      toolResult?.success === true ||
      resultContent.includes('"success": true') ||
      resultContent.includes('"success":true')
    if (toolName === 'screen_build') {
      return {
        displayTitle: success ? 'Preview build completed' : 'Preview build failed',
        displayDetail:
          (typeof toolResult?.message === 'string' && toolResult.message) ||
          (typeof toolResult?.error === 'string' ? toolResult.error : undefined),
        displayKind: success ? 'success' : 'error',
        displayStep: 'result'
      }
    }
    return {
      displayTitle: success ? `${toolName.replace(/_/g, ' ')} completed` : `${toolName.replace(/_/g, ' ')} failed`,
      displayDetail: typeof toolResult?.error === 'string' ? toolResult.error : undefined,
      displayKind: success ? 'success' : 'error',
      displayStep: 'result'
    }
  }

  const normalizeToolCalls = (
    toolCalls: Message['toolCalls'],
    messageId: string | undefined
  ): { toolCalls?: Message['toolCalls']; updated: boolean } => {
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return { toolCalls, updated: false }
    }

    const seenIds = new Set<string>()
    let updated = false
    const normalized = toolCalls.map((call, index) => {
      const originalId = typeof call.id === 'string' ? call.id.trim() : ''
      let nextId = originalId

      if (!nextId || seenIds.has(nextId)) {
        updated = true
        const baseId = messageId ? `${messageId}-tool-${index + 1}` : `tool-${index + 1}`
        nextId = baseId
        let suffix = 1
        while (seenIds.has(nextId)) {
          nextId = `${baseId}-${suffix}`
          suffix += 1
        }
      }

      seenIds.add(nextId)
      const normalizedOrder = typeof call.order === 'number' && Number.isFinite(call.order) ? call.order : undefined
      const normalizedDisplayTitle =
        typeof call.displayTitle === 'string' && call.displayTitle.trim() ? call.displayTitle.trim() : undefined
      const normalizedDisplayDetail =
        typeof call.displayDetail === 'string' && call.displayDetail.trim() ? call.displayDetail.trim() : undefined
      const normalizedDisplayKind = normalizeDisplayKind(call.displayKind)
      const normalizedDisplayStep = normalizeDisplayStep(call.displayStep)
      const normalizedProgressLines =
        Array.isArray(call.progressLines) && call.progressLines.length > 0
          ? call.progressLines.filter(line => typeof line === 'string' && line.trim().length > 0)
          : undefined
      if (
        nextId !== call.id ||
        normalizedOrder !== call.order ||
        normalizedDisplayTitle !== call.displayTitle ||
        normalizedDisplayDetail !== call.displayDetail ||
        normalizedDisplayKind !== call.displayKind ||
        normalizedDisplayStep !== call.displayStep ||
        JSON.stringify(normalizedProgressLines ?? []) !== JSON.stringify(call.progressLines ?? [])
      ) {
        updated = true
        return {
          ...call,
          id: nextId,
          order: normalizedOrder,
          displayTitle: normalizedDisplayTitle,
          displayDetail: normalizedDisplayDetail,
          displayKind: normalizedDisplayKind,
          displayStep: normalizedDisplayStep,
          progressLines: normalizedProgressLines
        }
      }
      return call
    })

    return { toolCalls: normalized, updated }
  }

  const buildMessage = (role: MessageRole, content: string, extras?: Partial<Message>): Message => ({
    role,
    content,
    messageId: createMessageId(),
    createdAt: new Date().toISOString(),
    createdBy: extras?.createdBy ?? getDefaultCreatedBy(role),
    ...extras
  })

  const sanitizeVisibleResponseText = (value: string): string => {
    if (!value) return ''
    return value.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/<\/?thinking>/gi, '')
  }

  const normalizeBlocks = (blocks: unknown): MessageBlock[] | undefined => {
    if (!Array.isArray(blocks)) return undefined
    const normalized = blocks.reduce<MessageBlock[]>((acc, block: any) => {
      const type = block?.type === 'thinking' ? 'thinking' : block?.type === 'response' ? 'response' : null
      const content = typeof block?.content === 'string' ? block.content : ''
      const order = typeof block?.order === 'number' && Number.isFinite(block.order) ? block.order : undefined
      if (!type || !content.trim()) return acc

      if (type === 'thinking') {
        acc.push({
          type,
          content,
          collapsed: block?.collapsed !== false,
          order
        })
      } else {
        acc.push({
          type,
          content: sanitizeVisibleResponseText(content),
          order
        })
      }
      return acc
    }, [])
    return normalized.length > 0 ? normalized : undefined
  }

  const normalizeMessageTimelineOrder = (
    blocks: MessageBlock[] | undefined,
    toolCalls: Message['toolCalls']
  ): { blocks: MessageBlock[] | undefined; toolCalls: Message['toolCalls']; updated: boolean } => {
    const hasBlocks = Array.isArray(blocks) && blocks.length > 0
    const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0
    if (!hasBlocks && !hasToolCalls) return { blocks, toolCalls, updated: false }

    const usedOrders = new Set<number>()
    let nextOrder = 1
    let updated = false

    const claimOrder = (candidate: number | undefined): number => {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && !usedOrders.has(candidate)) {
        usedOrders.add(candidate)
        if (candidate >= nextOrder) nextOrder = candidate + 1
        return candidate
      }
      while (usedOrders.has(nextOrder)) {
        nextOrder += 1
      }
      const assigned = nextOrder
      usedOrders.add(assigned)
      nextOrder += 1
      return assigned
    }

    const normalizedBlocks = hasBlocks
      ? blocks!.map(block => {
          const assignedOrder = claimOrder(block.order)
          if (assignedOrder !== block.order) {
            updated = true
            return {
              ...block,
              order: assignedOrder
            }
          }
          return block
        })
      : undefined

    const normalizedToolCalls = hasToolCalls
      ? toolCalls!.map(call => {
          const assignedOrder = claimOrder(call.order)
          if (assignedOrder !== call.order) {
            updated = true
            return {
              ...call,
              order: assignedOrder
            }
          }
          return call
        })
      : toolCalls

    return { blocks: normalizedBlocks, toolCalls: normalizedToolCalls, updated }
  }

  const getNextMessageOrder = (message: Message): number => {
    let maxOrder = 0
    if (Array.isArray(message.blocks)) {
      for (const block of message.blocks) {
        if (typeof block.order === 'number' && Number.isFinite(block.order) && block.order > maxOrder) {
          maxOrder = block.order
        }
      }
    }
    if (Array.isArray(message.toolCalls)) {
      for (const toolCall of message.toolCalls) {
        if (typeof toolCall.order === 'number' && Number.isFinite(toolCall.order) && toolCall.order > maxOrder) {
          maxOrder = toolCall.order
        }
      }
    }
    return maxOrder + 1
  }

  const getLatestToolOrder = (message: Message): number => {
    if (!Array.isArray(message.toolCalls) || message.toolCalls.length === 0) return 0
    let maxOrder = 0
    message.toolCalls.forEach((toolCall, index) => {
      const order = typeof toolCall.order === 'number' && Number.isFinite(toolCall.order) ? toolCall.order : index + 1
      if (order > maxOrder) maxOrder = order
    })
    return maxOrder
  }

  const findLatestRunningToolCall = (message: Message, toolName: string): ToolCall | undefined => {
    if (!Array.isArray(message.toolCalls) || message.toolCalls.length === 0) return undefined
    for (let i = message.toolCalls.length - 1; i >= 0; i -= 1) {
      const candidate = message.toolCalls[i]
      if (candidate.tool === toolName && candidate.status === 'running') {
        return candidate
      }
    }
    return undefined
  }

  const deriveResponseContent = (blocks?: MessageBlock[]): string => {
    if (!Array.isArray(blocks) || blocks.length === 0) return ''
    return blocks
      .filter(block => block.type === 'response')
      .map(block => block.content)
      .join('')
  }

  const deriveThinkingLog = (blocks?: MessageBlock[]): string | undefined => {
    if (!Array.isArray(blocks) || blocks.length === 0) return undefined
    const thinking = blocks
      .filter(block => block.type === 'thinking')
      .map(block => block.content)
      .join('\n\n')
    return thinking.trim() ? thinking : undefined
  }

  const ensureMessageMetadata = (history: Message[]): { messages: Message[]; updated: boolean } => {
    let updated = false
    const messages = history.map(message => {
      const needsId = !message.messageId
      const needsCreatedAt = !message.createdAt
      const needsCreatedBy = message.role === 'user' && !message.createdBy
      const normalizedBlocks = normalizeBlocks(message.blocks)
      const contentFromBlocks = deriveResponseContent(normalizedBlocks)
      const sanitizedContent = sanitizeVisibleResponseText(message.content || '')
      const normalizedContent = contentFromBlocks || sanitizedContent
      const normalizedThinking = deriveThinkingLog(normalizedBlocks) ?? message.thinkingLog
      const normalizedToolCalls = normalizeToolCalls(message.toolCalls, message.messageId)
      const normalizedTimeline = normalizeMessageTimelineOrder(normalizedBlocks, normalizedToolCalls.toolCalls)
      const needsBlocks =
        JSON.stringify(normalizedTimeline.blocks ?? []) !==
        JSON.stringify(Array.isArray(message.blocks) ? message.blocks : [])
      const needsContent = normalizedContent !== (message.content || '')
      const needsThinking = normalizedThinking !== message.thinkingLog
      const needsToolCalls =
        normalizedToolCalls.updated ||
        normalizedTimeline.updated ||
        JSON.stringify(normalizedTimeline.toolCalls ?? []) !==
          JSON.stringify(Array.isArray(message.toolCalls) ? message.toolCalls : [])
      if (
        !needsId &&
        !needsCreatedAt &&
        !needsCreatedBy &&
        !needsBlocks &&
        !needsContent &&
        !needsThinking &&
        !needsToolCalls
      ) {
        return message
      }
      updated = true
      const inferredCreatedBy =
        message.createdBy ??
        message.editHistory?.slice(-1)[0]?.userId ??
        (message.role === 'user' ? (getCurrentUserId() ?? UNKNOWN_AUTHOR_ID) : undefined)
      return {
        ...message,
        content: normalizedContent,
        blocks: normalizedTimeline.blocks,
        thinkingLog: normalizedThinking,
        toolCalls: normalizedTimeline.toolCalls,
        messageId: message.messageId ?? createMessageId(),
        createdAt: message.createdAt ?? new Date().toISOString(),
        createdBy: inferredCreatedBy
      }
    })
    return { messages, updated }
  }

  const isPersistableMessage = (message: Message): boolean => {
    const hasContent = !!message.content?.trim()
    const hasThinking = !!message.thinkingLog?.trim()
    const hasBlocks =
      Array.isArray(message.blocks) &&
      message.blocks.some(block => typeof block.content === 'string' && block.content.trim())
    const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0

    if (message.role === 'user') {
      return hasContent
    }
    return hasContent || hasThinking || hasBlocks || hasToolCalls
  }

  const seedPersistedMessageSnapshots = (nextMessages: Message[]) => {
    const seededSnapshots = new Map<string, string>()
    nextMessages.forEach(message => {
      if (!message.messageId || message.localOnly || !isPersistableMessage(message)) return
      seededSnapshots.set(message.messageId, JSON.stringify(message))
    })
    persistedMessageSnapshotsRef.current = seededSnapshots
  }

  const getMessageRichnessScore = (message: Message): number => {
    const contentChars = message.content?.length ?? 0
    const thinkingChars = message.thinkingLog?.length ?? 0
    const blockChars = message.blocks?.reduce((acc, block) => acc + (block.content?.length ?? 0), 0) ?? 0
    const toolCallsScore = (message.toolCalls?.length ?? 0) * 200
    return contentChars + thinkingChars + blockChars + toolCallsScore
  }

  const mergeMessagesById = (current: Message[], incoming: Message[]): Message[] => {
    const result: Message[] = []
    const indexById = new Map<string, number>()
    const currentById = new Map<string, Message>()

    current.forEach(message => {
      if (message.messageId) {
        currentById.set(message.messageId, message)
      }
    })

    incoming.forEach(message => {
      if (!message.messageId) {
        result.push(message)
        return
      }
      const currentVersion = currentById.get(message.messageId)
      const preferred =
        currentVersion && getMessageRichnessScore(currentVersion) > getMessageRichnessScore(message)
          ? currentVersion
          : message
      indexById.set(message.messageId, result.length)
      result.push(preferred)
    })

    current.forEach(message => {
      if (!message.messageId) {
        if (message.localOnly) {
          result.push(message)
        }
        return
      }
      if (!indexById.has(message.messageId)) {
        result.push(message)
      }
    })

    return result
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

  const resolveCreatedBy = (): SessionMetadata['createdBy'] => {
    const activeSession = sessions.find(s => s.sessionId === sessionId)
    if (activeSession?.createdBy?.id) {
      return activeSession.createdBy
    }

    const userInfo = (context.userInfo ?? {}) as Partial<{
      id: string
      employeeId: string
      firstName: string
      lastName: string
      displayName: string
      name: string
      email: string
      pictureThumbnail: string
      picture: string
      consentToStorePii: boolean
    }>
    return {
      id: String(userInfo.id ?? UNKNOWN_AUTHOR_ID),
      employeeId: String(userInfo.employeeId ?? ''),
      firstName: String(userInfo.firstName ?? ''),
      lastName: String(userInfo.lastName ?? ''),
      displayName: String(userInfo.displayName ?? userInfo.name ?? 'Unknown User'),
      email: typeof userInfo.email === 'string' ? userInfo.email : undefined,
      pictureThumbnail:
        typeof userInfo.pictureThumbnail === 'string'
          ? userInfo.pictureThumbnail
          : typeof userInfo.picture === 'string'
            ? userInfo.picture
            : undefined,
      consentToStorePii: Boolean(userInfo.consentToStorePii)
    }
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
        const createCount = uniqueFiles.filter(f => f.type === 'create').length
        const modifyCount = uniqueFiles.filter(f => f.type === 'modify').length
        const deleteCount = uniqueFiles.filter(f => f.type === 'delete').length
        const totalForPublish = uniqueFiles.filter(f => f.type !== 'delete').length
        setUniqueFileSummary({
          totalUniqueFiles: totalForPublish,
          createCount,
          modifyCount,
          deleteCount,
          files: uniqueFiles
        })
      }
      // Auto-detect screen path from active (non-deleted) changed files.
      // Uses screen types from screen-discovery.config.json (e.g. apps, forms, popups, records, windows).
      // Match any file under a screen root:
      //   src/business-apps/<product>/<area>/<screenType>/<screenName>/...
      // then choose the most affected root, preferring app screens.
      if (data.summary?.files) {
        const screenTypes = (screenDiscoveryConfig as { types: string[] }).types.join('|')
        const screenRootPattern = new RegExp(String.raw`^src/business-apps/(.+/(?:${screenTypes})/[^/]+)/(?:.*)$`)
        const activeFiles = data.summary.files.filter((f: FileChange) => getNormalizedChangeType(f.type) !== 'delete')

        const rootStats = new Map<string, { count: number; hasIndexFile: boolean; isAppScreen: boolean }>()
        for (const file of activeFiles) {
          const match = screenRootPattern.exec(file.path)
          if (!match) continue
          const root = match[1]
          const current = rootStats.get(root) ?? {
            count: 0,
            hasIndexFile: false,
            isAppScreen: root.includes('/apps/')
          }
          current.count += 1
          if (file.path.endsWith('/index.ts')) {
            current.hasIndexFile = true
          }
          rootStats.set(root, current)
        }

        if (rootStats.size > 0) {
          const detectedPath = Array.from(rootStats.entries()).sort((a, b) => {
            const scoreA = a[1].count * 100 + (a[1].isAppScreen ? 10 : 0) + (a[1].hasIndexFile ? 1 : 0)
            const scoreB = b[1].count * 100 + (b[1].isAppScreen ? 10 : 0) + (b[1].hasIndexFile ? 1 : 0)
            if (scoreA !== scoreB) return scoreB - scoreA
            return a[0].localeCompare(b[0])
          })[0][0]
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
      return fileCount
    } catch (error) {
      console.error('Failed to get changes:', error)
      return 0
    }
  }

  const downloadBlobWithFilename = (blob: Blob, filename: string): void => {
    const blobUrl = URL.createObjectURL(blob)
    try {
      const link = Object.assign(document.createElement('a'), {
        href: blobUrl,
        download: filename
      })
      link.click()
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }

  const resolveActiveTargetPath = (): string | null => {
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    return (
      normalizeNonEmpty(detectedTargetPath) ??
      normalizeNonEmpty(targetPath) ??
      normalizeNonEmpty(currentSession?.targetPath)
    )
  }

  const captureCurrentSessionVersion = async (options?: { silent?: boolean; versionNote?: string }) => {
    const activeTargetPath = resolveActiveTargetPath()
    if (!activeTargetPath) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.capture_version_requires_target_path',
          'Target path is required before saving a version.'
        )
      )
    }

    const currentSession = sessions.find(s => s.sessionId === sessionId)
    const normalizedResource =
      normalizeResourceUrl(resourceUrl) ??
      normalizeResourceUrl(currentSession?.resourceUrl) ??
      getAutoResourceUrl(activeTargetPath)

    const version = await builderClient.captureSessionVersion({
      repoId: repositoryId,
      sessionId,
      targetPath: activeTargetPath,
      resourceUrl: normalizedResource,
      versionNote: options?.versionNote ?? 'Manual version save'
    })

    if (!options?.silent) {
      alert(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.version_saved_success',
          `Version saved: v${version.versionMajor}.${version.versionMinor}`
        )
      )
    }

    return version
  }

  const handleSaveVersion = async (): Promise<void> => {
    if (!sessionId) return
    setIsSavingVersion(true)
    try {
      await captureCurrentSessionVersion()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.save_version_failed', 'Failed to save version')
      )
    } finally {
      setIsSavingVersion(false)
    }
  }

  const handleDownloadAppPackage = async (): Promise<void> => {
    if (!sessionId) return

    const activeTargetPath = resolveActiveTargetPath()
    if (!activeTargetPath) {
      alert(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.download_package_requires_target_path',
          'Target path is required before downloading an app package.'
        )
      )
      return
    }

    try {
      const latest = await captureCurrentSessionVersion({
        silent: true,
        versionNote: 'Download package capture'
      })
      const blob = await builderClient.downloadVersionPackage(latest.id)
      const safeTargetPath = sanitizeFilename(activeTargetPath.replace(/[\\/]/g, '-'))
      const safeFilename = `ai-builder-${safeTargetPath}-v${latest.versionMajor}.${latest.versionMinor}.zip`
      downloadBlobWithFilename(blob, safeFilename)
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.download_package_failed',
              'Failed to download app package'
            )
      )
    }
  }

  const handleImportFolder = async (files: File[], mode: 'update' | 'new'): Promise<void> => {
    if (!Array.isArray(files) || files.length === 0) return
    setIsFolderImporting(true)

    try {
      const createdBy = resolveCreatedBy()

      if (mode === 'update') {
        const currentSession = sessions.find(s => s.sessionId === sessionId)
        const activeTargetPath = resolveActiveTargetPath()
        if (!activeTargetPath) {
          throw new Error(
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.upload_folder_requires_target_path',
              'Target path is required to update an existing app.'
            )
          )
        }

        const nextResourceUrl =
          normalizeResourceUrl(resourceUrl) ??
          normalizeResourceUrl(currentSession?.resourceUrl) ??
          getAutoResourceUrl(activeTargetPath)

        await builderClient.importFolderSnapshot({
          files,
          sessionId,
          repoId: repositoryId,
          targetPath: activeTargetPath,
          resourceUrl: nextResourceUrl,
          applyToCache: true,
          versionNote: 'Imported folder snapshot (update existing app)',
          createdBy: createdBy as unknown as Record<string, unknown>,
          importMode: 'update'
        })

        const fileCount = await checkForChanges()
        refreshFileExplorer()
        await refreshPreview({ force: true })

        if (currentSession) {
          const updatedSession: SessionMetadata = {
            ...currentSession,
            targetPath: activeTargetPath,
            resourceUrl: nextResourceUrl,
            fileCount,
            lastModified: new Date().toISOString()
          }
          const updated = sessions.map(s => (s.sessionId === sessionId ? updatedSession : s))
          updateSessionsState(updated)
          saveSessionToAPI(updatedSession)
        }

        alert(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.upload_folder_update_success',
            'Folder uploaded successfully. Existing app session was updated.'
          )
        )
        return
      }

      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.import_new_available_in_overview',
          'Import as New App is available from the sessions overview page.'
        )
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.upload_folder_failed',
              'Failed to upload folder snapshot'
            )
      )
    } finally {
      setIsFolderImporting(false)
    }
  }

  const handleImportCurrentAppFolderClick = (): void => {
    if (isFolderImporting) return
    importCurrentFolderInputRef.current?.click()
  }

  const handleImportCurrentAppFolderSelected = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (selectedFiles.length === 0) return
    await handleImportFolder(selectedFiles, 'update')
  }

  const refreshPreview = async (options?: { force?: boolean }) => {
    if (!sessionId) return
    if (previewBuildStatus.active && !options?.force) return

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
            active: false,
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
    persistedMessageSnapshotsRef.current = new Map()
    chatPersistenceInitializedRef.current = false
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
          seedPersistedMessageSnapshots(normalized.messages as Message[])
          chatPersistenceInitializedRef.current = true
          setMessages(prev =>
            activeStreamReaderRef.current
              ? mergeMessagesById(prev, normalized.messages as Message[])
              : (normalized.messages as Message[])
          )
          return
        }
        chatPersistenceInitializedRef.current = true
        setMessages(prev => (activeStreamReaderRef.current ? prev : []))
      })
      .catch(error => {
        console.error('Failed to load chat history:', error)
        chatPersistenceInitializedRef.current = true
        setMessages(prev => (activeStreamReaderRef.current ? prev : []))
      })
  }, [sessionId])

  useEffect(() => {
    const persistableMessages = debouncedMessages.filter(message => !message.localOnly && isPersistableMessage(message))
    if (!sessionId || persistableMessages.length === 0) return
    if (!chatPersistenceInitializedRef.current) return

    const queue = persistableMessages.filter(message => {
      if (!message.messageId) return false
      const nextSnapshot = JSON.stringify(message)
      const previousSnapshot = persistedMessageSnapshotsRef.current.get(message.messageId)
      return previousSnapshot !== nextSnapshot
    })

    const currentIds = new Set(persistableMessages.map(message => message.messageId).filter(Boolean) as string[])
    for (const persistedId of Array.from(persistedMessageSnapshotsRef.current.keys())) {
      if (!currentIds.has(persistedId)) {
        persistedMessageSnapshotsRef.current.delete(persistedId)
      }
    }

    if (queue.length === 0) return

    void (async () => {
      for (const message of queue) {
        if (!message.messageId) continue
        const ok = await builderClient.appendChatMessage(repositoryId, sessionId, message)
        if (ok) {
          persistedMessageSnapshotsRef.current.set(message.messageId, JSON.stringify(message))
        }
      }
    })()
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
    const restoreActionMessageId = restoreTarget.messageId
    if (!restoreActionMessageId) return
    const historySnapshot = messagesRef.current
    const targetIndex = historySnapshot.findIndex(item => item.messageId === restoreActionMessageId)
    const previousAssistant = targetIndex >= 0 ? findPreviousAssistantMessage(historySnapshot, targetIndex) : null
    setShowRestoreDialog(false)
    setPendingRestoreMessage(null)
    setRestoreError(null)
    setIsRestoringMessageId(restoreActionMessageId)
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
      updateRestoreTempMessage(tempMessageId, 'Checking for changes')
      const newCount = await checkForChanges()
      updateRestoreTempMessage(tempMessageId, 'Reloading chat history')
      const history = await builderClient.loadChatHistory(repositoryId, sessionId)
      if (history?.length) {
        const normalized = ensureMessageMetadata(history as Message[])
        if (normalized.updated) {
          builderClient.saveChatHistory(repositoryId, sessionId, normalized.messages)
        }
        const restoredMessages = normalized.messages as Message[]
        seedPersistedMessageSnapshots(restoredMessages)
        setMessages([
          ...restoredMessages,
          buildMessage('assistant', formatRestoreProgress(restoreProgressRef.current), {
            messageId: tempMessageId,
            localOnly: true
          })
        ])
      } else {
        seedPersistedMessageSnapshots([])
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
      await refreshPreview({ force: true })
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

      const mergedHistory = mergeMessagesById(messagesRef.current, normalized.messages as Message[])
      const nextHistory = [...mergedHistory.filter(item => item.messageId !== editedMessage.messageId), editedMessage]
      setMessages(nextHistory)
      await builderClient.appendChatMessage(repositoryId, sessionId, editedMessage)

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
    toolIdPrefix: React.MutableRefObject<string>
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
  type StreamState = { assistantMessageId: string | null }

  const getActiveAssistantMessageIndex = (messages: Message[], streamState: StreamState): number => {
    if (streamState.assistantMessageId) {
      const byId = messages.findIndex(message => message.messageId === streamState.assistantMessageId)
      if (byId !== -1) {
        return byId
      }
    }

    // Start a new assistant message for each new user prompt:
    // only reuse when the last message is already assistant.
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      return messages.length - 1
    }

    return -1
  }

  const ensureActiveAssistantMessage = (
    messages: Message[],
    streamState: StreamState
  ): { messages: Message[]; index: number } => {
    const next = [...messages]
    let index = getActiveAssistantMessageIndex(next, streamState)
    if (index === -1) {
      const assistant = buildMessage('assistant', '', { blocks: [] })
      next.push(assistant)
      index = next.length - 1
    }
    streamState.assistantMessageId = next[index].messageId ?? streamState.assistantMessageId
    return { messages: next, index }
  }

  const appendAssistantBlock = (message: Message, type: 'thinking' | 'response', content: string): Message => {
    const normalizedContent = type === 'response' ? sanitizeVisibleResponseText(content) : content
    if (!normalizedContent) return message

    const blocks = [...(normalizeBlocks(message.blocks) ?? [])]
    const last = blocks.length > 0 ? blocks[blocks.length - 1] : null
    const latestToolOrder = getLatestToolOrder(message)
    const lastBlockOrder =
      last && typeof last.order === 'number' && Number.isFinite(last.order) ? last.order : blocks.length
    const canAppendToLastBlock = last?.type === type && lastBlockOrder >= latestToolOrder

    if (canAppendToLastBlock && last) {
      last.content += normalizedContent
    } else {
      const nextOrder = getNextMessageOrder(message)
      blocks.push({
        type,
        content: normalizedContent,
        collapsed: type === 'thinking' ? false : undefined,
        order: nextOrder
      })
    }

    if (type === 'response' && blocks.length > 1) {
      const previous = blocks[blocks.length - 2]
      if (previous.type === 'thinking') {
        previous.collapsed = true
      }
    }

    return {
      ...message,
      blocks,
      content: deriveResponseContent(blocks),
      thinkingLog: deriveThinkingLog(blocks),
      thinkingCollapsed: undefined
    }
  }

  const applyUsageEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
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
      let assistantIndex = getActiveAssistantMessageIndex(newMessages, streamState)
      if (assistantIndex === -1) {
        for (let i = newMessages.length - 1; i >= 0; i -= 1) {
          if (newMessages[i].role === 'assistant') {
            assistantIndex = i
            break
          }
        }
      }
      if (assistantIndex !== -1) {
        newMessages[assistantIndex] = {
          ...newMessages[assistantIndex],
          cost: {
            inputTokens: u.totalInputTokens || 0,
            outputTokens: u.totalOutputTokens || 0,
            totalCost: u.totalCost || 0
          }
        }
      }
      return newMessages
    })
  }

  const applyThinkingEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    const chunk = typeof data.content === 'string' ? data.content : ''
    if (!chunk) return
    ctx.setThinking(true)
    ctx.setThinkingContent(prev => prev + chunk)
    ctx.setMessages(prev => {
      const ensured = ensureActiveAssistantMessage(prev, streamState)
      const next = [...ensured.messages]
      next[ensured.index] = appendAssistantBlock(next[ensured.index], 'thinking', chunk)
      return next
    })
  }

  const applyTokenOrResponseEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    const chunk = typeof data.content === 'string' ? data.content : ''
    if (!chunk) return
    ctx.setThinking(false)
    ctx.setThinkingContent('')
    ctx.setMessages(prev => {
      const ensured = ensureActiveAssistantMessage(prev, streamState)
      const next = [...ensured.messages]
      next[ensured.index] = appendAssistantBlock(next[ensured.index], 'response', chunk)
      return next
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
    const toolName = String(data.toolName)
    const contentStr = data.content != null ? String(data.content) : ''
    const toolArgs = stringifyToolArgs(data.toolArgs) ?? parseLegacyToolArgsFromContent(contentStr)
    const fallbackDisplay = fallbackToolCallDisplay(toolName, toolArgs)
    const eventDisplay = getDisplayMetadataFromEvent(data)
    ctx.setMessages(prev => {
      const ensured = ensureActiveAssistantMessage(prev, streamState)
      const newMessages = [...ensured.messages]
      const lastMsg = newMessages[ensured.index]
      lastMsg.toolCalls ??= []
      lastMsg.toolCalls.push({
        tool: toolName,
        args: toolArgs,
        status: 'running',
        id: createToolCallId(ctx),
        order: getNextMessageOrder(lastMsg),
        displayTitle: eventDisplay.displayTitle ?? fallbackDisplay.displayTitle,
        displayDetail: eventDisplay.displayDetail ?? fallbackDisplay.displayDetail,
        displayKind: eventDisplay.displayKind ?? fallbackDisplay.displayKind,
        displayStep: eventDisplay.displayStep ?? fallbackDisplay.displayStep,
        progressLines: []
      })
      return newMessages
    })
  }

  const applyToolProgressEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    const toolName = typeof data.toolName === 'string' ? data.toolName : ''
    const content = typeof data.content === 'string' ? data.content.trim() : ''
    if (!toolName || !content) return

    if (toolName === 'screen_build') {
      ctx.setPreviewBuildStatus(prev => ({
        ...prev,
        active: true,
        lines: [...prev.lines, content].slice(-6),
        error: null
      }))
    }

    const fallbackDisplay = fallbackToolProgressDisplay(toolName, content)
    const eventDisplay = getDisplayMetadataFromEvent(data)

    ctx.setMessages(prev => {
      const ensured = ensureActiveAssistantMessage(prev, streamState)
      const newMessages = [...ensured.messages]
      const lastMsg = newMessages[ensured.index]
      lastMsg.toolCalls ??= []
      const title = eventDisplay.displayTitle ?? fallbackDisplay.displayTitle
      const detail = eventDisplay.displayDetail ?? fallbackDisplay.displayDetail
      const targetTool = findLatestRunningToolCall(lastMsg, toolName)
      if (!targetTool) return newMessages
      const nextProgressLines = [...(targetTool.progressLines ?? [])]
      const progressLabel = detail ? `${title} — ${detail}` : title
      if (progressLabel && !nextProgressLines.includes(progressLabel)) {
        nextProgressLines.push(progressLabel)
      }
      targetTool.progressLines = nextProgressLines
      return newMessages
    })
  }

  const applyToolResultEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    const toolName = String(data.toolName)
    const resultContent =
      typeof data.content === 'string'
        ? data.content
        : data.toolResult && typeof data.toolResult === 'object'
          ? JSON.stringify(data.toolResult)
          : ''
    const toolResult =
      data.toolResult && typeof data.toolResult === 'object' ? (data.toolResult as Record<string, unknown>) : null
    const fallbackDisplay = fallbackToolResultDisplay(toolName, toolResult, resultContent)
    const eventDisplay = getDisplayMetadataFromEvent(data)

    if (toolName === 'screen_build') {
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
    if (toolName === 'file_write' || toolName === 'file_edit' || toolName === 'delete_file') {
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
      const assistantIndex = getActiveAssistantMessageIndex(newMessages, streamState)
      if (assistantIndex === -1) {
        return newMessages
      }
      const lastMsg = newMessages[assistantIndex]
      if (!lastMsg.toolCalls) return newMessages
      const latestRunningTool = findLatestRunningToolCall(lastMsg, toolName)
      const title = eventDisplay.displayTitle ?? fallbackDisplay.displayTitle
      const detail = eventDisplay.displayDetail ?? fallbackDisplay.displayDetail
      const normalizedDetail = detail === title ? undefined : detail
      if (latestRunningTool) {
        if (Array.isArray(latestRunningTool.progressLines) && title) {
          latestRunningTool.progressLines = latestRunningTool.progressLines.filter(line => line !== title)
        }
        latestRunningTool.status = 'complete'
        latestRunningTool.result = resultContent
        latestRunningTool.displayTitle = title
        latestRunningTool.displayDetail = normalizedDetail
        latestRunningTool.displayKind = eventDisplay.displayKind ?? fallbackDisplay.displayKind
        latestRunningTool.displayStep = eventDisplay.displayStep ?? fallbackDisplay.displayStep
      } else {
        lastMsg.toolCalls.push({
          tool: toolName,
          status: 'complete',
          id: createToolCallId(ctx),
          order: getNextMessageOrder(lastMsg),
          result: resultContent,
          displayTitle: title,
          displayDetail: normalizedDetail,
          displayKind: eventDisplay.displayKind ?? fallbackDisplay.displayKind,
          displayStep: eventDisplay.displayStep ?? fallbackDisplay.displayStep,
          progressLines: []
        })
      }
      return newMessages
    })
  }

  const processStreamEvent = (data: Record<string, unknown>, streamState: StreamState, ctx: StreamCtx): void => {
    if (data.type === 'iteration_complete') return
    if (data.type === 'usage' && data.content) {
      applyUsageEvent(data, streamState, ctx)
      return
    }
    if (data.type === 'thinking' && data.content) {
      applyThinkingEvent(data, streamState, ctx)
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
      applyToolResultEvent(data, streamState, ctx)
      return
    }
    if (data.type === 'tool_progress' && data.toolName && data.content) {
      applyToolProgressEvent(data, streamState, ctx)
    }
  }

  const runStreamToEnd = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    streamState: StreamState,
    ctx: StreamCtx
  ): Promise<void> => {
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
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

    const remaining = buffer.trim()
    if (remaining.startsWith('data: ')) {
      try {
        const jsonStr = remaining.slice(6).trim()
        if (jsonStr) {
          const data = JSON.parse(jsonStr) as Record<string, unknown>
          if (data && typeof data === 'object') processStreamEvent(data, streamState, ctx)
        }
      } catch {
        // ignore trailing partial payload
      }
    }
  }

  const runPrompt = async (userInput: string, history: Message[]) => {
    stopRequestedRef.current = false
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
        llmProvider
      )
      const reader = stream.getReader()
      activeStreamReaderRef.current = reader
      const streamState: StreamState = {
        assistantMessageId: null
      }
      const ctx: StreamCtx = {
        setMessages,
        setUsage,
        setThinking,
        setThinkingContent,
        toolIdCounter,
        toolIdPrefix,
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

      const wasStopped = stopRequestedRef.current
      if (!wasStopped && streamState.assistantMessageId) {
        const checkpointCreatedAt = new Date().toISOString()
        const checkpointMessage = messagesRef.current.find(
          message => message.messageId === streamState.assistantMessageId
        )
        const nextCheckpointMessage = checkpointMessage ? { ...checkpointMessage, checkpointCreatedAt } : null
        setMessages(prev =>
          prev.map(message =>
            message.messageId === streamState.assistantMessageId ? { ...message, checkpointCreatedAt } : message
          )
        )
        if (nextCheckpointMessage?.messageId) {
          await builderClient.appendChatMessage(repositoryId, sessionId, nextCheckpointMessage)
          persistedMessageSnapshotsRef.current.set(
            nextCheckpointMessage.messageId,
            JSON.stringify(nextCheckpointMessage)
          )
        }
      }
      if (wasStopped) {
        screenBuildUsedRef.current = false
        screenBuildSucceededRef.current = false
        filesChangedInRunRef.current = false
      }
    } catch (error) {
      if (stopRequestedRef.current) {
        return
      }
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

      const wasStopped = stopRequestedRef.current
      if (wasStopped) {
        screenBuildUsedRef.current = false
        screenBuildSucceededRef.current = false
        filesChangedInRunRef.current = false
      }
    } finally {
      activeStreamReaderRef.current = null
      setLoading(false)

      void (async () => {
        const newCount = await checkForChanges()
        if (filesChangedInRunRef.current || newCount > previousChangeCountRef.current) {
          refreshFileExplorer()
        }
        const hasNewChanges = newCount > previousChangeCountRef.current
        if (hasNewChanges) {
          const screenBuildUsedInRun = screenBuildUsedRef.current
          const succeededFromMessages = hasSuccessfulScreenBuildInMessages(messagesRef.current)
          if ((screenBuildUsedInRun && screenBuildSucceededRef.current) || succeededFromMessages) {
            setPreviewBuildStatus(prev => ({
              ...prev,
              active: true,
              lines: [...prev.lines, 'Reloading preview...'].slice(-6),
              error: null
            }))
            setPreviewReady(true)
            // Use cacheOnly=true so the iframe requests bundle=false — the backend serves
            // the already-cached bundle from screen_build instead of triggering a new build.
            previewSandboxRef.current?.reload({ cacheOnly: true })
          } else if (screenBuildUsedInRun) {
            // screen_build already attempted this run; avoid triggering a second build.
            setPreviewBuildStatus(prev => ({
              ...prev,
              active: false,
              lines: [...prev.lines, 'screen_build finished without a successful result'].slice(-6)
            }))
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
      })()
    }
  }

  const handleQueueFollowUp = () => {
    const followUp = input.trim()
    if (!followUp) return
    setQueuedFollowUpPrompt(followUp)
    setInput('')
  }

  const handleDeleteQueuedFollowUp = () => {
    setQueuedFollowUpPrompt(null)
  }

  const handleSendQueuedFollowUpNow = () => {
    const followUp = queuedFollowUpPrompt?.trim()
    if (!followUp) return
    if (loading) {
      handleStopGeneration()
      return
    }
    const userMessage = buildMessage('user', followUp)
    setMessages(prev => [...prev, userMessage])
    setQueuedFollowUpPrompt(null)
    void runPrompt(followUp, messages)
  }

  useEffect(() => {
    if (loading) return
    const followUp = queuedFollowUpPrompt?.trim()
    if (!followUp) return
    const userMessage = buildMessage('user', followUp)
    setMessages(prev => [...prev, userMessage])
    setQueuedFollowUpPrompt(null)
    void runPrompt(followUp, messages)
  }, [loading, queuedFollowUpPrompt])

  const handleStopGeneration = () => {
    stopRequestedRef.current = true
    setThinking(false)
    setThinkingContent('')
    activeStreamReaderRef.current?.cancel().catch(() => undefined)
    activeStreamReaderRef.current = null
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

  const toggleThinkingBlockCollapse = (messageIndex: number, blockIndex?: number) => {
    setMessages(prev => {
      const next = [...prev]
      const target = next[messageIndex]
      if (!target || target.role !== 'assistant') return prev

      if (
        typeof blockIndex === 'number' &&
        Array.isArray(target.blocks) &&
        target.blocks[blockIndex]?.type === 'thinking'
      ) {
        const blocks = [...target.blocks]
        const current = blocks[blockIndex]
        blocks[blockIndex] = {
          ...current,
          collapsed: !(current.collapsed !== false)
        }
        next[messageIndex] = {
          ...target,
          blocks,
          content: deriveResponseContent(blocks),
          thinkingLog: deriveThinkingLog(blocks)
        }
        return next
      }

      next[messageIndex] = {
        ...target,
        thinkingCollapsed: !target.thinkingCollapsed
      }
      return next
    })
  }

  const restoreMessagePreview = pendingRestoreMessage?.content ? pendingRestoreMessage.content.slice(0, 160) : ''
  const restoreMessageTimeValue = pendingRestoreMessage?.createdAt || pendingRestoreMessage?.serverCreatedAt || ''
  const restoreMessageTimestamp = restoreMessageTimeValue ? new Date(restoreMessageTimeValue).toLocaleString() : ''

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background">
      <SessionDetailHero onBackToSessions={backToSessionList} />

      <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-6 gba:py-3 gba:border-b gba:border-border gba:bg-card">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadAppPackage}
          disabled={isFolderImporting || isSavingVersion}
          className="gba:gap-1.5"
        >
          <Download className="gba:w-3.5 gba:h-3.5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.download_project_zip', 'Download Project ZIP')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveVersion}
          disabled={isSavingVersion || isFolderImporting}
          className="gba:gap-1.5"
        >
          <Upload className="gba:w-3.5 gba:h-3.5" />
          {isSavingVersion
            ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.saving_version', 'Saving Version...')
            : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.save_version', 'Save Version')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportCurrentAppFolderClick}
          disabled={isFolderImporting}
          className="gba:gap-1.5"
        >
          <Upload className="gba:w-3.5 gba:h-3.5" />
          {isFolderImporting
            ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.importing_folder', 'Importing Folder...')
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.import_folder_current_app',
                'Import Folder to Current App'
              )}
        </Button>
        <input
          ref={importCurrentFolderInputRef}
          type="file"
          multiple
          onChange={handleImportCurrentAppFolderSelected}
          className="gba:hidden"
          {...({ webkitdirectory: 'true', directory: 'true' } as Record<string, string>)}
        />
      </div>

      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {fileExplorerEnabled && showFileExplorer && sessionId && (
          <div className="gba:w-[480px] gba:border-r gba:border-border gba:flex-shrink-0 gba:bg-muted/30 gba:overflow-hidden">
            <FileExplorer
              key={`${sessionId}-${fileExplorerRefreshKey}`}
              repoId={repositoryId}
              sessionId={sessionId}
              onFileClick={path => setSelectedFile(path)}
            />
          </div>
        )}

        <div className="gba:flex-1 gba:flex gba:min-h-0 gba:overflow-hidden">
          {sessionId &&
          repositoryId &&
          ((uniqueFileSummary?.totalUniqueFiles ?? 0) > 0 ||
            (sessions.find(s => s.sessionId === sessionId)?.fileCount ?? 0) > 0) ? (
            <ResizablePanelGroup orientation="horizontal" className="gba:flex-1 gba:min-h-0 gba:w-full">
              <ResizablePanel
                defaultSize="25%"
                minSize="25%"
                className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none"
              >
                <ChatDrawer
                  messages={messages}
                  input={input}
                  onInputChange={v => setInput(v)}
                  onSendMessage={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                  onStopMessage={handleStopGeneration}
                  onQueueFollowUp={handleQueueFollowUp}
                  onSendQueuedFollowUpNow={handleSendQueuedFollowUpNow}
                  onDeleteQueuedFollowUp={handleDeleteQueuedFollowUp}
                  isProcessing={loading}
                  queuedFollowUpPrompt={queuedFollowUpPrompt}
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
                  onToggleThinking={toggleThinkingBlockCollapse}
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
                    'Screen Builder is analyzing your request and exploring the codebase...'
                  )}
                  tipText={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.tip_message',
                    'Tip: Be specific! Example: "Build a lead list screen with search, table, and pagination"'
                  )}
                  emptyTitle={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.welcome_title', 'Screen Builder')}
                  emptyDescription={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.welcome_description',
                    'Describe what you want to build and Screen Builder will create it following NEWWORK patterns'
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
                defaultSize="75%"
                minSize="25%"
                className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none"
              >
                <PreviewSandbox
                  ref={previewSandboxRef}
                  repoId={repositoryId}
                  sessionId={sessionId}
                  previewAppName={previewAppName}
                  accessToken={context.accessToken}
                  userInfo={context.userInfo}
                  uniqueFileSummary={uniqueFileSummary}
                  onPublish={() => {
                    setPublishError(null)
                    setShowPublishDialog(true)
                  }}
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
                onRestoreMessage={openRestoreDialog}
                isRestoringMessageId={isRestoringMessageId}
                userName={
                  context.userInfo
                    ? `${context.userInfo.givenName ?? ''} ${context.userInfo.familyName ?? ''}`.trim() ||
                      getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                    : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                }
                userAvatar={userPictureThumbnail ? `data:image/jpeg;base64,${userPictureThumbnail}` : undefined}
                onToggleThinking={toggleThinkingBlockCollapse}
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
                  'Screen Builder is analyzing your request and exploring the codebase...'
                )}
                tipText={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:ai_builder.tip_message',
                  'Tip: Be specific! Example: "Build a lead list screen with search, table, and pagination"'
                )}
                emptyTitle={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.welcome_title', 'Screen Builder')}
                emptyDescription={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:ai_builder.welcome_description',
                  'Describe what you want to build and Screen Builder will create it following NEWWORK patterns'
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

      {restoreError && (
        <div className="gba:fixed gba:bottom-4 gba:right-4 gba:z-50 gba:bg-destructive gba:text-destructive-foreground gba:rounded-lg gba:px-4 gba:py-3 gba:max-w-sm gba:text-sm gba:flex gba:items-center gba:gap-2">
          <span className="gba:flex-1">{restoreError}</span>
          <button onClick={() => setRestoreError(null)} className="gba:flex-shrink-0">
            <X className="gba:w-4 gba:h-4" />
          </button>
        </div>
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
                  You are about to restore to the state before this prompt. Any publish you did after the restore point
                  is still deployed.
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
