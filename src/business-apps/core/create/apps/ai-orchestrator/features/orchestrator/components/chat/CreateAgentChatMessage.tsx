/**
 * CreateAgentChatMessage - Individual message bubble for the CREATE agent chat.
 * User messages right-aligned with primary style, assistant messages left-aligned.
 */

import React, { useMemo, useState, useCallback } from 'react'
import { Bot, User, Loader2, Brain, ChevronDown, ChevronRight, UserCircle2, Copy } from 'lucide-react'
import { AvatarImage } from '../ui/AvatarImage'
import type { CreateChatMessage } from '../../types/chat'

/** Block or tool call types used for timeline rendering */
interface ChatMessageBlock {
  type: 'thinking' | 'response'
  content: string
  collapsed?: boolean
  order?: number
}

interface ChatMessageToolCall {
  tool: string
  status: 'running' | 'complete'
  id: string
  order?: number
  displayTitle?: string
  displayDetail?: string
  displayKind?: 'info' | 'success' | 'warning' | 'error'
  progressLines?: string[]
}

/** Message shape with optional timeline fields */
type MessageWithTimeline = CreateChatMessage & {
  blocks?: ChatMessageBlock[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
  toolCalls?: ChatMessageToolCall[]
}

export interface UserAvatar {
  pictureBase64?: string
  pictureMimeType?: string
  initials: string
  showIncognito?: boolean
  /** Show placeholder (gray circle + icon) while picture loads to avoid initials→photo flash */
  showPlaceholder?: boolean
}

export interface AuthorDisplay {
  name: string
  avatar?: string
  initials: string
}

interface CreateAgentChatMessageProps {
  message: CreateChatMessage
  isStreaming?: boolean
  userAvatar?: UserAvatar
  authorDisplay?: AuthorDisplay
  testId?: string
}

function renderUserAvatarContent(userAvatar?: UserAvatar, authorDisplay?: AuthorDisplay): React.ReactNode {
  if (authorDisplay) {
    if (authorDisplay.avatar) {
      return (
        <AvatarImage
          src={authorDisplay.avatar}
          alt={authorDisplay.name}
          className="gba:w-full gba:h-full gba:object-cover"
        />
      )
    }
    return <span className="gba:text-xs gba:font-semibold gba:text-primary-foreground">{authorDisplay.initials}</span>
  }
  if (userAvatar?.showIncognito || userAvatar?.showPlaceholder) {
    return <UserCircle2 className="gba:w-4 gba:h-4 gba:text-foreground" aria-hidden />
  }
  if (userAvatar?.pictureBase64) {
    return (
      <AvatarImage
        src={userAvatar.pictureBase64}
        alt="You"
        mimeType={userAvatar.pictureMimeType}
        className="gba:w-full gba:h-full gba:object-cover"
      />
    )
  }
  if (userAvatar?.initials) {
    return <span className="gba:text-xs gba:font-semibold gba:text-primary-foreground">{userAvatar.initials}</span>
  }
  return <User className="gba:w-3.5 gba:h-3.5 gba:text-primary-foreground" />
}

function getAvatarBackgroundClass(
  effectiveUserAvatar: UserAvatar | undefined,
  isUser: boolean,
  authorDisplay?: AuthorDisplay
): string {
  const base =
    'gba:shrink-0 gba:w-7 gba:h-7 gba:rounded-full gba:overflow-hidden gba:flex gba:items-center gba:justify-center gba:relative'
  if (effectiveUserAvatar?.showIncognito || effectiveUserAvatar?.showPlaceholder) return `${base} gba:bg-muted`
  if (isUser && !(effectiveUserAvatar?.pictureBase64 ?? authorDisplay?.avatar)) return `${base} gba:bg-primary`
  return `${base} gba:bg-muted`
}

function formatMessageTimestamp(createdAt?: string, serverCreatedAt?: string): string {
  const raw = serverCreatedAt ?? createdAt
  if (!raw) return ''
  const d = new Date(raw)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return isToday
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export const CreateAgentChatMessage: React.FC<CreateAgentChatMessageProps> = ({
  message,
  isStreaming = false,
  userAvatar,
  authorDisplay,
  testId = 'create-chat-message'
}) => {
  const [thinkingState, setThinkingState] = useState<Record<string, boolean>>({})
  const [toolProgressState, setToolProgressState] = useState<Record<string, boolean>>({})
  const [copyFeedback, setCopyFeedback] = useState(false)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system' || message.messageType === 'system'
  const timeline = useMemo(() => buildTimelineEntries(message), [message])

  const effectiveUserAvatar = useMemo((): UserAvatar | undefined => {
    if (isUser && authorDisplay) {
      return {
        pictureBase64: authorDisplay.avatar,
        initials: authorDisplay.initials,
        showIncognito: false,
        showPlaceholder: false
      }
    }
    return userAvatar
  }, [isUser, authorDisplay, userAvatar])

  const handleCopy = useCallback(() => {
    if (typeof navigator?.clipboard?.writeText !== 'function') return
    navigator.clipboard.writeText(message.content || '').then(
      () => {
        setCopyFeedback(true)
        globalThis.setTimeout(() => setCopyFeedback(false), 1500)
      },
      () => {}
    )
  }, [message.content])

  if (isSystem) {
    return (
      <div className="gba:flex gba:justify-center gba:py-2" data-testid={`${testId}-system`}>
        <div className="gba:px-3 gba:py-1.5 gba:rounded-lg gba:bg-muted/60 gba:text-xs gba:text-muted-foreground gba:text-center gba:max-w-[85%]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`gba:flex gba:gap-2.5 gba:py-2 ${isUser ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
      data-testid={`${testId}-${message.role}`}
    >
      {/* Avatar */}
      <div className={getAvatarBackgroundClass(effectiveUserAvatar, isUser, authorDisplay)}>
        {isUser ? (
          renderUserAvatarContent(effectiveUserAvatar, authorDisplay)
        ) : (
          <Bot className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        )}
      </div>

      {/* Bubble + meta */}
      <div
        className={`gba:flex-1 gba:min-w-0 gba:max-w-[80%] gba:flex gba:flex-col ${isUser ? 'gba:items-end' : 'gba:items-start'}`}
      >
        <div
          className={`gba:w-full gba:rounded-2xl gba:px-3.5 gba:py-2.5 gba:text-sm gba:leading-relaxed ${
            isUser
              ? 'gba:bg-primary gba:text-primary-foreground gba:rounded-tr-md'
              : 'gba:bg-muted gba:text-foreground gba:rounded-tl-md'
          }`}
        >
          {isUser ? (
            <>
              {message.content || (isStreaming && <StreamingDots />)}
              {isStreaming && message.content && <StreamingCursor />}
            </>
          ) : (
            <div className="gba:space-y-2">
              {timeline.map(entry =>
                renderTimelineEntry(
                  entry,
                  message,
                  toolProgressState,
                  setToolProgressState,
                  thinkingState,
                  setThinkingState
                )
              )}
              {timeline.length === 0 && (message.content || (isStreaming && <StreamingDots />))}
              {isStreaming && message.content && <StreamingCursor />}
            </div>
          )}
        </div>
        {/* Author name (user messages with authorDisplay) + timestamp + copy */}
        <div
          className={`gba:flex gba:items-center gba:gap-2 gba:mt-1 gba:min-h-5 ${
            isUser ? 'gba:flex-row-reverse' : 'gba:flex-row'
          }`}
        >
          {isUser && authorDisplay && (
            <span className="gba:text-xs gba:text-muted-foreground" title={authorDisplay.name}>
              {authorDisplay.name}
            </span>
          )}
          {!isSystem && (message.serverCreatedAt ?? message.createdAt) && (
            <span className="gba:text-[11px] gba:text-muted-foreground">
              {formatMessageTimestamp(message.createdAt, message.serverCreatedAt)}
            </span>
          )}
          {isUser && message.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="gba:p-0.5 gba:rounded gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground gba:transition-colors"
              title="Copy message"
              aria-label="Copy message"
            >
              <Copy className={`gba:w-3.5 gba:h-3.5 ${copyFeedback ? 'gba:text-success' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type TimelineEntry =
  | {
      type: 'block'
      order: number
      position: number
      block: ChatMessageBlock
    }
  | {
      type: 'tool'
      order: number
      position: number
      tool: ChatMessageToolCall
    }

function getToolIndicatorClass(tool: ChatMessageToolCall): string {
  if (tool.status === 'running') return 'gba:bg-warning gba:animate-pulse'
  switch (tool.displayKind) {
    case 'error':
      return 'gba:bg-destructive-secondary'
    case 'warning':
      return 'gba:bg-warning-secondary'
    case 'info':
      return 'gba:bg-muted-foreground/70'
    default:
      return 'gba:bg-success'
  }
}

function renderToolEntry(
  entry: Extract<TimelineEntry, { type: 'tool' }>,
  message: CreateChatMessage,
  toolProgressState: Record<string, boolean>,
  setToolProgressState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
): React.ReactNode {
  const displayTitle = entry.tool.displayTitle || entry.tool.tool
  const detail =
    entry.tool.displayDetail && entry.tool.displayDetail !== displayTitle ? entry.tool.displayDetail : undefined
  const progressKey = `${message.id}-${entry.tool.id || entry.position}`
  const progressExpanded = !!toolProgressState[progressKey]
  const progressLines = Array.isArray(entry.tool.progressLines) ? entry.tool.progressLines : []
  const indicatorClass = getToolIndicatorClass(entry.tool)
  return (
    <div
      key={`${message.id}-tool-${entry.tool.id}-${entry.position}`}
      className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:px-3 gba:py-2"
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
        <span className={`gba:h-2 gba:w-2 gba:rounded-full gba:shrink-0 ${indicatorClass}`} />
        <span className="gba:font-medium gba:text-muted-foreground">{displayTitle}</span>
      </div>
      {detail && <div className="gba:ml-4 gba:mt-1 gba:text-xs gba:text-muted-foreground">{detail}</div>}
      {progressLines.length > 0 && (
        <div className="gba:ml-4 gba:mt-2">
          <button
            type="button"
            className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground hover:gba:text-foreground"
            onClick={() =>
              setToolProgressState(prev => ({
                ...prev,
                [progressKey]: !prev[progressKey]
              }))
            }
          >
            {progressExpanded ? (
              <ChevronDown className="gba:h-3 gba:w-3" />
            ) : (
              <ChevronRight className="gba:h-3 gba:w-3" />
            )}
            <span>Progress ({progressLines.length} steps)</span>
          </button>
          {progressExpanded && (
            <div className="gba:mt-1 gba:space-y-1">
              {progressLines.map((line: string, index: number) => (
                <div
                  key={`${progressKey}-line-${index}`}
                  className="gba:text-[11px] gba:text-muted-foreground gba:whitespace-pre-wrap"
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function renderThinkingEntry(
  entry: Extract<TimelineEntry, { type: 'block' }>,
  message: CreateChatMessage,
  thinkingState: Record<string, boolean>,
  setThinkingState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
): React.ReactNode {
  if (entry.block.type !== 'thinking') return null
  const blockKey = `${message.id}-thinking-${entry.position}`
  const isCollapsed = thinkingState[blockKey] ?? entry.block.collapsed !== false
  return (
    <div key={blockKey} className="gba:overflow-hidden gba:rounded-lg gba:border gba:border-border/60">
      <button
        type="button"
        className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:bg-card gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground hover:gba:bg-muted/70"
        onClick={() =>
          setThinkingState(prev => ({
            ...prev,
            [blockKey]: !isCollapsed
          }))
        }
      >
        {isCollapsed ? <ChevronRight className="gba:h-3 gba:w-3" /> : <ChevronDown className="gba:h-3 gba:w-3" />}
        <Brain className="gba:h-3 gba:w-3" />
        <span className="gba:font-medium">Thinking</span>
      </button>
      {!isCollapsed && (
        <div className="gba:border-t gba:border-border/60 gba:bg-background gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground gba:whitespace-pre-wrap">
          {entry.block.content}
        </div>
      )}
    </div>
  )
}

function renderResponseEntry(
  entry: Extract<TimelineEntry, { type: 'block' }>,
  message: CreateChatMessage
): React.ReactNode {
  return (
    <div
      key={`${message.id}-response-${entry.position}`}
      className="gba:whitespace-pre-wrap gba:text-sm gba:text-foreground"
    >
      {entry.block.content}
    </div>
  )
}

function renderTimelineEntry(
  entry: TimelineEntry,
  message: CreateChatMessage,
  toolProgressState: Record<string, boolean>,
  setToolProgressState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  thinkingState: Record<string, boolean>,
  setThinkingState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
): React.ReactNode {
  if (entry.type === 'tool') {
    return renderToolEntry(entry, message, toolProgressState, setToolProgressState)
  }
  if (entry.block.type === 'thinking') {
    return renderThinkingEntry(entry, message, thinkingState, setThinkingState)
  }
  return renderResponseEntry(entry, message)
}

function sanitizeVisibleResponseText(value: string): string {
  if (!value) return ''
  return value.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/<\/?thinking>/gi, '')
}

function normalizeBlocks(message: MessageWithTimeline): ChatMessageBlock[] {
  if (Array.isArray(message.blocks) && message.blocks.length > 0) {
    const normalized = message.blocks
      .map((block: ChatMessageBlock) => {
        if (block.type !== 'thinking' && block.type !== 'response') return null
        if (!block.content?.trim()) return null
        if (block.type === 'response') {
          return { ...block, content: sanitizeVisibleResponseText(block.content) }
        }
        return block
      })
      .filter((block: ChatMessageBlock | null): block is ChatMessageBlock => block != null)
    if (normalized.length > 0) return normalized
  }

  const fallback: ChatMessageBlock[] = []
  if (message.thinkingLog?.trim()) {
    fallback.push({
      type: 'thinking',
      content: message.thinkingLog,
      collapsed: message.thinkingCollapsed !== false,
      order: 1
    })
  }
  const response = sanitizeVisibleResponseText(message.content || '')
  if (response.trim()) {
    fallback.push({
      type: 'response',
      content: response,
      order: fallback.length + 1
    })
  }
  return fallback
}

function buildTimelineEntries(message: MessageWithTimeline): TimelineEntry[] {
  const blockEntries: TimelineEntry[] = normalizeBlocks(message).map((block, position) => ({
    type: 'block',
    order: typeof block.order === 'number' && Number.isFinite(block.order) ? block.order : position + 1,
    position,
    block
  }))
  const maxBlockOrder = blockEntries.reduce((max, entry) => Math.max(max, entry.order), 0)
  const toolEntries: TimelineEntry[] = (message.toolCalls ?? []).map((tool: ChatMessageToolCall, position: number) => ({
    type: 'tool',
    order: typeof tool.order === 'number' && Number.isFinite(tool.order) ? tool.order : maxBlockOrder + position + 1,
    position,
    tool
  }))

  return [...blockEntries, ...toolEntries].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.position - b.position
  })
}

const StreamingDots: React.FC = () => (
  <div className="gba:flex gba:items-center gba:gap-1 gba:py-1">
    <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin gba:text-muted-foreground" />
    <span className="gba:text-xs gba:text-muted-foreground">Thinking...</span>
  </div>
)

const StreamingCursor: React.FC = () => (
  <span className="gba:inline-block gba:w-1.5 gba:h-4 gba:bg-foreground/60 gba:animate-pulse gba:ml-0.5 gba:align-text-bottom gba:rounded-sm" />
)
