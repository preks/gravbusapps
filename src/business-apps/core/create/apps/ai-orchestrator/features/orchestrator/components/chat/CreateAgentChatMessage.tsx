/**
 * CreateAgentChatMessage - Individual message bubble for the CREATE agent chat.
 * User messages right-aligned with primary style, assistant messages left-aligned.
 */

import React, { useMemo, useState } from 'react'
import { Bot, User, Loader2, Brain, ChevronDown, ChevronRight } from 'lucide-react'
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
}

interface CreateAgentChatMessageProps {
  message: CreateChatMessage
  isStreaming?: boolean
  userAvatar?: UserAvatar
  testId?: string
}

function renderUserAvatarContent(userAvatar?: UserAvatar): React.ReactNode {
  if (userAvatar?.pictureBase64) {
    return (
      <img
        src={`data:${userAvatar.pictureMimeType ?? 'image/jpeg'};base64,${userAvatar.pictureBase64}`}
        alt="You"
        className="gba:w-full gba:h-full gba:object-cover"
      />
    )
  }
  if (userAvatar?.initials) {
    return <span className="gba:text-xs gba:font-semibold gba:text-primary-foreground">{userAvatar.initials}</span>
  }
  return <User className="gba:w-3.5 gba:h-3.5 gba:text-primary-foreground" />
}

export const CreateAgentChatMessage: React.FC<CreateAgentChatMessageProps> = ({
  message,
  isStreaming = false,
  userAvatar,
  testId = 'create-chat-message'
}) => {
  const [thinkingState, setThinkingState] = useState<Record<string, boolean>>({})
  const [toolProgressState, setToolProgressState] = useState<Record<string, boolean>>({})
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system' || message.messageType === 'system'
  const timeline = useMemo(() => buildTimelineEntries(message), [message])

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
      <div
        className={`gba:shrink-0 gba:w-7 gba:h-7 gba:rounded-full gba:overflow-hidden gba:flex gba:items-center gba:justify-center ${
          isUser && !userAvatar?.pictureBase64 ? 'gba:bg-primary' : 'gba:bg-muted'
        }`}
      >
        {isUser ? (
          renderUserAvatarContent(userAvatar)
        ) : (
          <Bot className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`gba:max-w-[80%] gba:rounded-2xl gba:px-3.5 gba:py-2.5 gba:text-sm gba:leading-relaxed ${
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
