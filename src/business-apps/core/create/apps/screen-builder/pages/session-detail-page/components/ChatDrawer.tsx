import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea
} from '@newwork/nw-design-system'
import {
  Bot,
  Sparkles,
  Loader2,
  Square,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Upload,
  Brain,
  PanelLeft,
  PanelLeftClose,
  FileCode,
  Plus,
  FileEdit,
  Trash2,
  RotateCcw,
  Pencil
} from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UniqueFileSummary } from '../../../types/session'
import { useEmployeeAvatarsBatch } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'

interface ToolCall {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
  order?: number
  displayTitle?: string
  displayDetail?: string
  displayKind?: 'info' | 'success' | 'warning' | 'error'
  displayStep?: 'call' | 'progress' | 'result'
  progressLines?: string[]
}

interface MessageBlock {
  type: 'thinking' | 'response'
  content: string
  collapsed?: boolean
  order?: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
  blocks?: MessageBlock[]
  createdBy?: string
  editHistory?: Array<{
    userId: string
    editedAt: string
  }>
  messageId?: string
  createdAt?: string
  serverCreatedAt?: string
  localOnly?: boolean
  cost?: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

interface ChatDrawerProps {
  messages: Message[]
  input: string
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onStopMessage?: () => void
  onQueueFollowUp?: () => void
  onSendQueuedFollowUpNow?: () => void
  onDeleteQueuedFollowUp?: () => void
  isProcessing: boolean
  queuedFollowUpPrompt?: string | null
  thinking?: boolean
  userName?: string
  userAvatar?: string
  onClearChat?: () => void
  onAttachFile?: () => void
  onToggleThinking?: (messageIndex: number, blockIndex?: number) => void
  onRestoreMessage?: (message: Message) => void
  onEditMessage?: (message: Message, nextContent: string) => void
  isRestoringMessageId?: string | null
  currentUserId?: string
  accessToken?: string
  examplePrompts?: string[]
  inputPlaceholder?: string
  analyzingRequestText?: string
  tipText?: string
  sendButtonLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
  style?: React.CSSProperties
  showFileExplorer?: boolean
  onToggleFileExplorer?: () => void
  usage?: {
    totalInputTokens: number
    totalOutputTokens: number
    totalCost: number
  }
  uniqueFileSummary?: UniqueFileSummary | null
}

const UNKNOWN_AUTHOR_ID = 'unknown-user'

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  input,
  onInputChange,
  onSendMessage,
  onStopMessage,
  onQueueFollowUp,
  onSendQueuedFollowUpNow,
  onDeleteQueuedFollowUp,
  isProcessing,
  queuedFollowUpPrompt,
  thinking = false,
  userName = 'You',
  userAvatar,
  onClearChat,
  onAttachFile,
  onToggleThinking,
  onRestoreMessage,
  onEditMessage,
  isRestoringMessageId,
  currentUserId,
  accessToken,
  examplePrompts,
  inputPlaceholder,
  analyzingRequestText,
  tipText,
  sendButtonLabel,
  emptyTitle,
  emptyDescription,
  className,
  style,
  showFileExplorer,
  onToggleFileExplorer,
  usage,
  uniqueFileSummary
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [filesExpanded, setFilesExpanded] = useState(false)
  const [expandedToolProgress, setExpandedToolProgress] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim()) return
      if (isProcessing && onQueueFollowUp) {
        onQueueFollowUp()
      } else if (!isProcessing) {
        onSendMessage()
      }
    }
  }

  const handleCopyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const openEditDialog = (message: Message) => {
    setEditingMessage(message)
    setEditingContent(message.content)
  }

  const closeEditDialog = () => {
    setEditingMessage(null)
    setEditingContent('')
  }

  const confirmEditDialog = () => {
    if (!editingMessage) return
    const nextContent = editingContent.trim()
    if (!nextContent) return
    onEditMessage?.(editingMessage, nextContent)
    closeEditDialog()
  }

  const userIds = useMemo(() => {
    const ids = messages.flatMap(message => {
      if (message.role !== 'user') return []
      const historyIds = message.editHistory?.map(entry => entry.userId) ?? []
      return [message.createdBy, ...historyIds].filter(Boolean)
    })
    const filtered = ids.filter((id): id is string => !!id && id !== UNKNOWN_AUTHOR_ID)
    return Array.from(new Set(filtered))
  }, [messages])

  const { employeeMap } = useEmployeeAvatarsBatch(accessToken ?? '', userIds)

  const toDataUrl = (base64Data?: string): string | undefined => {
    if (!base64Data) return undefined
    if (base64Data.startsWith('data:')) return base64Data
    return `data:image/jpeg;base64,${base64Data}`
  }

  const getInitials = (name?: string): string => {
    const trimmed = name?.trim()
    if (!trimmed) return '??'
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  const getDisplayNameForUserId = (userId?: string): string => {
    if (userId && userId === currentUserId) {
      return userName
    }
    if (userId && userId === UNKNOWN_AUTHOR_ID && currentUserId) {
      return userName
    }
    if (userId) {
      const employee = employeeMap.get(userId)
      if (employee?.displayName) return employee.displayName
      const fallbackName = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim()
      if (fallbackName) return fallbackName
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.user', 'User')
  }

  const getAvatarForUserId = (userId?: string): string | undefined => {
    if (userId && userId === currentUserId) {
      return userAvatar
    }
    if (userId && userId === UNKNOWN_AUTHOR_ID && currentUserId) {
      return userAvatar
    }
    if (userId) {
      const employee = employeeMap.get(userId)
      return employee?.avatarUrl ?? toDataUrl(employee?.pictureThumbnail)
    }
    return undefined
  }

  const getOrderedEditorIds = (message: Message): string[] => {
    const ids: string[] = []
    if (message.createdBy) ids.push(message.createdBy)
    if (message.editHistory) {
      message.editHistory.forEach(entry => {
        if (entry.userId) ids.push(entry.userId)
      })
    }
    const unique: string[] = []
    const seen = new Set<string>()
    ids.forEach(id => {
      if (!id || seen.has(id)) return
      seen.add(id)
      unique.push(id)
    })
    return unique
  }

  const renderEditorAvatars = (message: Message) => {
    const ids = getOrderedEditorIds(message)
    if (ids.length === 0) return null
    return (
      <div className="gba:flex gba:items-center gba:-space-x-2">
        {ids.map(userId => {
          const displayName = getDisplayNameForUserId(userId)
          const avatarSrc = getAvatarForUserId(userId)
          return (
            <Avatar key={userId} className="gba:w-6 gba:h-6 gba:border gba:border-background gba:shadow-sm">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={displayName} />
              ) : (
                <AvatarFallback className="gba:text-[10px]">{getInitials(displayName)}</AvatarFallback>
              )}
            </Avatar>
          )
        })}
      </div>
    )
  }

  const renderToolCall = (tool: ToolCall, key: string) => {
    const { displayText, detailText } = getToolDisplay(tool)
    const progressLines = Array.isArray(tool.progressLines) ? tool.progressLines : []
    const progressToggleKey = tool.id || key
    const progressExpanded = !!expandedToolProgress[progressToggleKey]
    const indicatorClass =
      tool.status === 'running'
        ? 'gba:bg-warning gba:animate-pulse'
        : tool.displayKind === 'error'
          ? 'gba:bg-red-500'
          : tool.displayKind === 'warning'
            ? 'gba:bg-amber-500'
            : tool.displayKind === 'info'
              ? 'gba:bg-muted-foreground/70'
              : 'gba:bg-success'

    return (
      <div key={key} className="gba:bg-muted/50 gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-border/50">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
          <span className={`gba:w-2 gba:h-2 gba:rounded-full gba:flex-shrink-0 ${indicatorClass}`} />
          <span className="gba:font-medium gba:text-muted-foreground">{displayText}</span>
        </div>
        {detailText && (
          <div className="gba:mt-1 gba:ml-4 gba:text-[11px] gba:text-muted-foreground gba:break-all">{detailText}</div>
        )}
        {progressLines.length > 0 && (
          <div className="gba:mt-2 gba:ml-4">
            <button
              type="button"
              className="gba:flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground hover:gba:text-foreground"
              onClick={() =>
                setExpandedToolProgress(prev => ({
                  ...prev,
                  [progressToggleKey]: !prev[progressToggleKey]
                }))
              }
            >
              {progressExpanded ? (
                <ChevronDown className="gba:w-3 gba:h-3" />
              ) : (
                <ChevronRight className="gba:w-3 gba:h-3" />
              )}
              <span>Progress ({progressLines.length} steps)</span>
            </button>
            {progressExpanded && (
              <div className="gba:mt-1 gba:space-y-1">
                {progressLines.map((line, index) => (
                  <div
                    key={`${progressToggleKey}-progress-${index}`}
                    className="gba:text-[11px] gba:text-muted-foreground"
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

  function getToolDisplay(tool: ToolCall): { displayText: string; detailText?: string } {
    if (tool.displayTitle) {
      const normalizedDetail =
        tool.displayDetail && tool.displayDetail.trim() && tool.displayDetail.trim() !== tool.displayTitle.trim()
          ? tool.displayDetail
          : undefined
      return {
        displayText: tool.displayTitle,
        detailText: normalizedDetail
      }
    }

    let displayText = tool.tool
    let detailText: string | undefined
    const pathRegex = /["']?(?:filePath|file_path|path|target_file|targetPath)["']?\s*:\s*"([^"]+)"/
    if (!tool.args) return { displayText, detailText }

    if (tool.tool === 'file_write' || tool.tool === 'file_read') {
      const pathMatch = pathRegex.exec(tool.args)
      if (pathMatch) {
        detailText = pathMatch[1]
        displayText =
          tool.tool === 'file_write'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_writing', '✍️ Writing')
            : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_reading', '📖 Reading')
      }
    } else if (tool.tool === 'file_edit') {
      const fileMatch = pathRegex.exec(tool.args)
      if (fileMatch) {
        detailText = fileMatch[1]
        displayText = getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_editing', '🔧 Editing')
      }
    }
    if (!detailText && tool.args) {
      detailText = tool.args
    }
    return { displayText, detailText }
  }

  const renderMarkdown = (content: string) => {
    return <MarkdownRenderer content={content} />
  }

  const sanitizeVisibleResponseText = (value: string): string => {
    if (!value) return ''
    return value.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/<\/?thinking>/gi, '')
  }

  type BlockTimelineEntry = {
    type: 'block'
    order: number
    position: number
    block: MessageBlock
    blockIndex?: number
    key: string
  }

  type ToolTimelineEntry = {
    type: 'tool'
    order: number
    position: number
    tool: ToolCall
    key: string
  }

  type TimelineEntry = BlockTimelineEntry | ToolTimelineEntry

  const getRenderableBlockEntries = (message: Message): BlockTimelineEntry[] => {
    if (Array.isArray(message.blocks) && message.blocks.length > 0) {
      const entries: BlockTimelineEntry[] = []
      message.blocks.forEach((block, blockIndex) => {
        const type = block?.type === 'thinking' ? 'thinking' : block?.type === 'response' ? 'response' : null
        const content = typeof block?.content === 'string' ? block.content : ''
        if (!type || !content.trim()) return
        entries.push({
          type: 'block',
          order: typeof block.order === 'number' && Number.isFinite(block.order) ? block.order : blockIndex + 1,
          position: entries.length,
          block: {
            type,
            content: type === 'response' ? sanitizeVisibleResponseText(content) : content,
            collapsed: type === 'thinking' ? block.collapsed !== false : undefined
          },
          blockIndex,
          key: `block-${message.messageId ?? 'msg'}-${blockIndex}`
        })
      })
      if (entries.length > 0) return entries
    }

    const fallback: BlockTimelineEntry[] = []
    if (message.thinkingLog?.trim()) {
      fallback.push({
        type: 'block',
        order: 1,
        position: 0,
        block: {
          type: 'thinking',
          content: message.thinkingLog,
          collapsed: message.thinkingCollapsed !== false
        },
        key: `fallback-thinking-${message.messageId ?? 'msg'}`
      })
    }
    const responseContent = sanitizeVisibleResponseText(message.content)
    if (responseContent.trim()) {
      fallback.push({
        type: 'block',
        order: fallback.length + 1,
        position: fallback.length,
        block: {
          type: 'response',
          content: responseContent
        },
        key: `fallback-response-${message.messageId ?? 'msg'}`
      })
    }
    return fallback
  }

  const getTimelineEntries = (message: Message): TimelineEntry[] => {
    const blockEntries = getRenderableBlockEntries(message)
    const maxBlockOrder = blockEntries.reduce((max, entry) => Math.max(max, entry.order), 0)
    const toolEntries: ToolTimelineEntry[] = []
    if (Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
      message.toolCalls.forEach((tool, toolIndex) => {
        toolEntries.push({
          type: 'tool',
          order:
            typeof tool.order === 'number' && Number.isFinite(tool.order) ? tool.order : maxBlockOrder + toolIndex + 1,
          position: toolIndex,
          tool,
          key: `${tool.id || 'tool'}-${toolIndex}`
        })
      })
    }

    return [...blockEntries, ...toolEntries].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      return a.position - b.position
    })
  }

  return (
    <div
      className={`gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:rounded-none gba:bg-background ${className ?? ''}`.trim()}
      style={style}
    >
      {/* Header */}
      <div className="gba:flex-shrink-0 gba:px-6 gba:py-3 gba:border-b gba:border-border gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          {onToggleFileExplorer && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="gba:w-8 gba:h-8 gba:cursor-pointer gba:group"
                    onClick={onToggleFileExplorer}
                  >
                    {/* Show avatar by default */}
                    <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center gba:group-hover:hidden">
                      <Bot className="gba:w-5 gba:h-5 gba:text-white" />
                    </div>
                    {/* Show button on hover */}
                    <div className="gba:hidden gba:group-hover:flex gba:w-8 gba:h-8 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted hover:gba:bg-muted/80 gba:transition-colors">
                      {showFileExplorer ? (
                        <PanelLeftClose className="gba:w-4 gba:h-4 gba:text-foreground" />
                      ) : (
                        <PanelLeft className="gba:w-4 gba:h-4 gba:text-foreground" />
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {showFileExplorer
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.hide_file_explorer', 'Hide file explorer')
                    : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.show_file_explorer', 'Show file explorer')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <div>
            <h3 className="gba:text-sm gba:font-semibold">Screen Builder</h3>
            <p className="gba:text-xs gba:text-muted-foreground">{isProcessing ? 'Thinking...' : 'Ready to help'}</p>
          </div>
        </div>

        {usage && usage.totalCost > 0 && (
          <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
            <span>{(usage.totalInputTokens / 1000).toFixed(1)}K</span>
            <span className="gba:text-muted-foreground/50">/</span>
            <span className="gba:font-medium gba:text-success">${usage.totalCost.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-6 gba:py-4 gba:space-y-4">
        {messages.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:py-12">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center gba:mb-4">
              <Sparkles className="gba:w-8 gba:h-8 gba:text-white" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{emptyTitle ?? 'Screen Builder'}</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">
              {emptyDescription ?? 'Describe what you want to build, and Screen Builder will help you create it.'}
            </p>
            {examplePrompts && examplePrompts.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center gba:mt-4">
                {examplePrompts.map(s => (
                  <button
                    key={s}
                    onClick={() => onInputChange(s)}
                    className="gba:px-4 gba:py-2 gba:text-sm gba:rounded-lg gba:bg-muted hover:gba:bg-muted/80 gba:border"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {thinking && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:text-sm gba:py-2">
                <Brain className="gba:w-4 gba:h-4 gba:animate-pulse gba:text-primary" />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.thinking', 'Thinking...')}</span>
              </div>
            )}

            {messages.map((message, idx) => {
              const canRestore =
                !!onRestoreMessage && message.role === 'user' && !!message.messageId && !message.localOnly
              const canEdit = !!onEditMessage && message.role === 'user' && !!message.messageId && !message.localOnly
              return (
                <div
                  key={message.messageId ?? `${message.role}-${idx}-${message.content.length}`}
                  className={`gba:flex gba:gap-3 ${message.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <Bot className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
                    </div>
                  )}

                  <div className="gba:max-w-[85%]">
                    {canRestore && (
                      <div className="gba:flex gba:justify-end gba:mb-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRestoreMessage?.(message)}
                          disabled={isRestoringMessageId === message.messageId}
                          className="gba:h-7 gba:px-2 gba:text-xs gba:gap-1"
                        >
                          <RotateCcw className="gba:w-3 gba:h-3" />
                          Restore
                        </Button>
                      </div>
                    )}
                    {(canEdit || message.editHistory?.length || message.createdBy) && (
                      <div className="gba:flex gba:justify-end gba:items-center gba:gap-2 gba:mb-1">
                        {renderEditorAvatars(message)}
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(message)}
                            disabled={isRestoringMessageId === message.messageId}
                            className="gba:h-7 gba:px-2 gba:text-xs gba:gap-1"
                          >
                            <Pencil className="gba:w-3 gba:h-3" />
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                    {message.role === 'user' ? (
                      <div className="gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:px-4 gba:py-3 gba:shadow-sm">
                        <p className="gba:text-sm gba:leading-relaxed">{message.content}</p>
                      </div>
                    ) : (
                      <div className="gba:space-y-3 gba:bg-muted/30 gba:rounded-2xl gba:px-4 gba:py-3 gba:border gba:border-border/50">
                        {(() => {
                          const timelineEntries = getTimelineEntries(message)
                          const firstResponseTimelineIndex = timelineEntries.findIndex(
                            entry => entry.type === 'block' && entry.block.type === 'response'
                          )
                          return timelineEntries.map((entry, timelineIndex) => {
                            if (entry.type === 'tool') {
                              return renderToolCall(entry.tool, `${entry.key}-${timelineIndex}`)
                            }

                            const { block, blockIndex } = entry
                            if (block.type === 'thinking') {
                              const isCollapsed = block.collapsed !== false
                              return (
                                <div
                                  key={`${entry.key}-${timelineIndex}`}
                                  className="gba:border gba:border-muted-foreground/20 gba:rounded-lg gba:overflow-hidden"
                                >
                                  <button
                                    className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-muted/50 gba:text-xs gba:text-muted-foreground hover:gba:bg-muted gba:transition-colors"
                                    onClick={() => onToggleThinking?.(idx, blockIndex)}
                                  >
                                    {isCollapsed ? (
                                      <ChevronRight className="gba:w-3 gba:h-3" />
                                    ) : (
                                      <ChevronDown className="gba:w-3 gba:h-3" />
                                    )}
                                    <Brain className="gba:w-3 gba:h-3" />
                                    <span className="gba:font-medium">
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:ai_builder.thinking_label',
                                        'Thinking'
                                      )}
                                    </span>
                                    <span className="gba:text-muted-foreground/60">
                                      ({Math.ceil(block.content.length / 100)}{' '}
                                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.steps', 'steps')})
                                    </span>
                                  </button>
                                  {!isCollapsed && block.content.trim() && (
                                    <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:text-muted-foreground gba:whitespace-pre-wrap gba:max-h-64 gba:overflow-y-auto gba:border-t gba:border-muted-foreground/10">
                                      {block.content}
                                    </div>
                                  )}
                                </div>
                              )
                            }

                            return (
                              <div
                                key={`${entry.key}-${timelineIndex}`}
                                className="gba:bg-card gba:border gba:rounded-lg gba:px-3 gba:py-2"
                              >
                                {timelineIndex === firstResponseTimelineIndex && message.cost && (
                                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-2 gba:pb-2 gba:border-b">
                                    <span className="gba:text-xs gba:font-medium gba:text-primary">
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:ai_builder.ai_response',
                                        'Screen Builder'
                                      )}
                                    </span>
                                    <span className="gba:text-xs gba:text-muted-foreground">
                                      ${message.cost.totalCost.toFixed(4)} ({message.cost.inputTokens.toLocaleString()}{' '}
                                      in / {message.cost.outputTokens.toLocaleString()} out)
                                    </span>
                                  </div>
                                )}
                                {renderMarkdown(block.content)}
                              </div>
                            )
                          })
                        })()}

                        <button
                          onClick={() => handleCopyMessage(message.content, `${idx}`)}
                          className="gba:mt-2 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors"
                        >
                          {copiedMessageId === `${idx}` ? (
                            <>
                              <Check className="gba:w-3 gba:h-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="gba:w-3 gba:h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      {/* Input Area */}
      <div className="gba:flex-shrink-0 gba:border-t gba:border-border gba:bg-background">
        {/* File Changes Banner */}
        {uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && (
          <div className="gba:border-b gba:border-border gba:bg-muted/30">
            {/* Summary Header - Clickable */}
            <button
              onClick={() => setFilesExpanded(!filesExpanded)}
              className="gba:w-full gba:px-4 gba:py-2 gba:flex gba:items-center gba:gap-2 gba:text-xs hover:gba:bg-muted/50 gba:transition-colors"
            >
              {filesExpanded ? (
                <ChevronDown className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
              ) : (
                <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
              )}
              <FileCode className="gba:w-3.5 gba:h-3.5 gba:text-primary gba:flex-shrink-0" />
              <span className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.files_changed', 'Files changed')}{' '}
                {uniqueFileSummary.totalUniqueFiles}
              </span>
              <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                {uniqueFileSummary.createCount > 0 && (
                  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-green-500/10 gba:text-green-600 dark:gba:text-green-400">
                    <Plus className="gba:w-3 gba:h-3" />
                    {uniqueFileSummary.createCount}
                  </span>
                )}
                {uniqueFileSummary.modifyCount > 0 && (
                  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-blue-500/10 gba:text-blue-600 dark:gba:text-blue-400">
                    <FileEdit className="gba:w-3 gba:h-3" />
                    {uniqueFileSummary.modifyCount}
                  </span>
                )}
                {uniqueFileSummary.deleteCount > 0 && (
                  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-red-500/10 gba:text-red-600 dark:gba:text-red-400">
                    <Trash2 className="gba:w-3 gba:h-3" />
                    {uniqueFileSummary.deleteCount}
                  </span>
                )}
              </div>
            </button>

            {/* Expanded File List */}
            {filesExpanded && (
              <div className="gba:px-4 gba:pb-2 gba:max-h-48 gba:overflow-y-auto">
                <div className="gba:space-y-1">
                  {uniqueFileSummary.files.map(file => (
                    <div
                      key={file.path}
                      className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:py-1 gba:px-2 gba:rounded gba:bg-muted/50"
                    >
                      {file.type === 'create' && (
                        <Plus className="gba:w-3 gba:h-3 gba:text-green-600 dark:gba:text-green-400 gba:flex-shrink-0" />
                      )}
                      {file.type === 'modify' && (
                        <FileEdit className="gba:w-3 gba:h-3 gba:text-blue-600 dark:gba:text-blue-400 gba:flex-shrink-0" />
                      )}
                      {file.type === 'delete' && (
                        <Trash2 className="gba:w-3 gba:h-3 gba:text-red-600 dark:gba:text-red-400 gba:flex-shrink-0" />
                      )}
                      <span className="gba:text-muted-foreground gba:truncate" title={file.path}>
                        {file.path}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="gba:p-4">
          <div className="gba:flex gba:gap-2 gba:items-end">
            {onAttachFile && (
              <Button type="button" variant="ghost" size="icon" onClick={onAttachFile} disabled={isProcessing}>
                <Upload className="gba:w-4 gba:h-4" />
              </Button>
            )}
            <div className="gba:flex-1">
              <InputGroup className="gba:min-h-[84px]">
                <InputGroupTextarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder ?? 'Describe what you want to build...'}
                  className="gba:min-h-[84px]"
                  rows={3}
                  data-testid="ai-builder-input"
                />
                <InputGroupAddon align="block-end" className="gba:justify-end">
                  <InputGroupButton
                    onClick={isProcessing ? onStopMessage : onSendMessage}
                    disabled={isProcessing ? !onStopMessage : !input.trim()}
                    variant="default"
                    size="iconSm"
                    className="gba:rounded-full"
                    data-testid="ai-builder-send-button"
                    title={
                      isProcessing
                        ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.stop_generation', 'Stop generation')
                        : (sendButtonLabel ?? undefined)
                    }
                  >
                    {isProcessing ? <Square className="gba:w-4 gba:h-4" /> : <Sparkles className="gba:w-4 gba:h-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            {isProcessing && input.trim() && (
              <Button
                type="button"
                variant="outline"
                onClick={onQueueFollowUp}
                disabled={!onQueueFollowUp}
                className="gba:shrink-0"
                data-testid="ai-builder-queue-followup-button"
                title="Queue follow-up prompt"
              >
                Queue
              </Button>
            )}
          </div>
          {queuedFollowUpPrompt && (
            <div className="gba:mt-2 gba:rounded-md gba:border gba:bg-muted/40 gba:p-2">
              <p className="gba:text-xs gba:text-muted-foreground">
                Queued follow-up (will send automatically after current response):
              </p>
              <p className="gba:text-sm gba:mt-1 gba:line-clamp-2">{queuedFollowUpPrompt}</p>
              <div className="gba:mt-2 gba:flex gba:gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={onSendQueuedFollowUpNow}
                  disabled={!onSendQueuedFollowUpNow}
                  data-testid="ai-builder-send-followup-now-button"
                >
                  Send now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onDeleteQueuedFollowUp}
                  disabled={!onDeleteQueuedFollowUp}
                  data-testid="ai-builder-delete-followup-button"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
          {analyzingRequestText && isProcessing && (
            <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:justify-center gba:gap-2 gba:mt-2">
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              <span>{analyzingRequestText}</span>
            </div>
          )}
          {tipText && !isProcessing && input.trim() && (
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-2">{tipText}</p>
          )}
          {onClearChat && messages.length > 0 && (
            <div className="gba:mt-2 gba:flex gba:justify-end">
              <Button variant="ghost" size="sm" onClick={onClearChat} className="gba:text-xs gba:text-muted-foreground">
                Clear chat
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingMessage} onOpenChange={open => (!open ? closeEditDialog() : null)}>
        <DialogContent className="gba:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit prompt</DialogTitle>
            <DialogDescription>
              This will restore the state before the prompt and re-run Screen Builder with your changes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editingContent}
            onChange={e => setEditingContent(e.target.value)}
            rows={6}
            className="gba:mt-2"
          />
          <DialogFooter className="gba:gap-2">
            <Button variant="ghost" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={confirmEditDialog} disabled={!editingContent.trim()}>
              Save & Re-run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
