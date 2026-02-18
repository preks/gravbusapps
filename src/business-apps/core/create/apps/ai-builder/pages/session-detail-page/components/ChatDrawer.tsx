import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import {
  Bot,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Upload,
  Brain,
  MoreVertical
} from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeeAvatarsBatch } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'

interface ToolCall {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
  createdBy?: string
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
  isProcessing: boolean
  thinking?: boolean
  userName?: string
  userAvatar?: string
  onClearChat?: () => void
  onAttachFile?: () => void
  onToggleThinking?: (messageIndex: number) => void
  onRestoreMessage?: (message: Message) => void
  isRestoringMessageId?: string | null
  currentUserId?: string
  accessToken?: string
  examplePrompts?: string[]
  inputPlaceholder?: string
  analyzingRequestText?: string
  tipText?: string
  sendButtonLabel?: string
  buildingLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
  style?: React.CSSProperties
}

const UNKNOWN_AUTHOR_ID = 'unknown-user'

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  input,
  onInputChange,
  onSendMessage,
  isProcessing,
  thinking = false,
  userName = 'You',
  userAvatar,
  onClearChat,
  onAttachFile,
  onToggleThinking,
  onRestoreMessage,
  isRestoringMessageId,
  currentUserId,
  accessToken,
  examplePrompts,
  inputPlaceholder,
  analyzingRequestText,
  tipText,
  sendButtonLabel,
  buildingLabel,
  emptyTitle,
  emptyDescription,
  className,
  style
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isProcessing && input.trim()) {
        onSendMessage()
      }
    }
  }

  const handleCopyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const userIds = useMemo(() => {
    const ids = messages
      .filter(message => message.role === 'user' && message.createdBy)
      .map(message => message.createdBy as string)
      .filter(id => id && id !== UNKNOWN_AUTHOR_ID)
    return Array.from(new Set(ids))
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

  const getAuthorDisplayName = (message: Message): string => {
    const authorId = message.createdBy
    if (authorId && authorId === currentUserId) {
      return userName
    }
    if (authorId) {
      const employee = employeeMap.get(authorId)
      if (employee?.displayName) return employee.displayName
      const fallbackName = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim()
      if (fallbackName) return fallbackName
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.user', 'User')
  }

  const getAuthorAvatarSrc = (message: Message): string | undefined => {
    const authorId = message.createdBy
    if (authorId && authorId === currentUserId) {
      return userAvatar
    }
    if (authorId) {
      const employee = employeeMap.get(authorId)
      return employee?.avatarUrl ?? toDataUrl(employee?.pictureThumbnail)
    }
    return undefined
  }

  const renderToolCalls = (toolCalls: ToolCall[]) => {
    if (!toolCalls || toolCalls.length === 0) return null

    return (
      <div className="gba:bg-muted/50 gba:rounded-lg gba:p-2 gba:space-y-1">
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tools', 'Tools')} ({toolCalls.length})
        </span>
        {toolCalls.map(tool => {
          const { displayText, filePath } = getToolDisplay(tool)
          return (
            <div key={tool.id} className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
              <span
                className={`gba:w-2 gba:h-2 gba:rounded-full gba:flex-shrink-0 ${
                  tool.status === 'complete' ? 'gba:bg-success' : 'gba:bg-warning gba:animate-pulse'
                }`}
              />
              <span className="gba:font-medium gba:text-muted-foreground">{displayText}</span>
              {filePath ? (
                <span className="gba:font-mono gba:text-xs gba:text-primary gba:truncate" title={filePath}>
                  {filePath}
                </span>
              ) : (
                tool.args && <span className="gba:text-muted-foreground gba:truncate gba:text-[10px]">{tool.args}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function getToolDisplay(tool: { tool: string; args?: string }): { displayText: string; filePath: string | null } {
    let displayText = tool.tool
    let filePath: string | null = null
    if (!tool.args) return { displayText, filePath }
    const pathRegex = /(?:filePath|path|target_file):\s*"([^"]+)"/
    const filePathRegex = /file_path:\s*"([^"]+)"/
    if (tool.tool === 'write_file' || tool.tool === 'read_file') {
      const pathMatch = pathRegex.exec(tool.args)
      if (pathMatch) {
        filePath = pathMatch[1]
        displayText =
          tool.tool === 'write_file'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_writing', '✍️ Writing')
            : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_reading', '📖 Reading')
      }
    } else if (tool.tool === 'propose_change') {
      const fileMatch = filePathRegex.exec(tool.args)
      if (fileMatch) {
        filePath = fileMatch[1]
        displayText = getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_editing', '🔧 Editing')
      }
    }
    return { displayText, filePath }
  }

  const renderMarkdown = (content: string) => {
    return <MarkdownRenderer content={content} />
  }

  return (
    <div
      className={`gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:rounded-none gba:bg-background ${className ?? ''}`.trim()}
      style={style}
    >
      {/* Header */}
      <div className="gba:flex-shrink-0 gba:px-6 gba:py-3 gba:border-b gba:border-border gba:flex gba:items-center gba:gap-3">
        <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center">
          <Bot className="gba:w-5 gba:h-5 gba:text-white" />
        </div>
        <div>
          <h3 className="gba:text-sm gba:font-semibold">AI Assistant</h3>
          <p className="gba:text-xs gba:text-muted-foreground">{isProcessing ? 'Thinking...' : 'Ready to help'}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-6 gba:py-4 gba:space-y-4">
        {messages.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:py-12">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center gba:mb-4">
              <Sparkles className="gba:w-8 gba:h-8 gba:text-white" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{emptyTitle ?? 'Start Building with AI'}</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">
              {emptyDescription ?? 'Describe what you want to build, and the AI will help you create it.'}
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
                !!onRestoreMessage && message.role === 'assistant' && !!message.messageId && !message.localOnly
              const authorDisplayName = message.role === 'user' ? getAuthorDisplayName(message) : undefined
              const authorAvatarSrc = message.role === 'user' ? getAuthorAvatarSrc(message) : undefined
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
                          <MoreVertical className="gba:w-3 gba:h-3" />
                          Restore
                        </Button>
                      </div>
                    )}
                    {message.role === 'user' ? (
                      <div className="gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:px-4 gba:py-3 gba:shadow-sm">
                        <p className="gba:text-sm gba:leading-relaxed">{message.content}</p>
                      </div>
                    ) : (
                      <div className="gba:space-y-3 gba:bg-muted/30 gba:rounded-2xl gba:px-4 gba:py-3 gba:border gba:border-border/50">
                        {/* Only show thinking block if there's meaningful content (>50 chars) */}
                        {message.thinkingLog && message.thinkingLog.trim().length > 50 && (
                          <div className="gba:border gba:border-muted-foreground/20 gba:rounded-lg gba:overflow-hidden">
                            <button
                              className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-muted/50 gba:text-xs gba:text-muted-foreground hover:gba:bg-muted gba:transition-colors"
                              onClick={() => onToggleThinking?.(idx)}
                            >
                              {message.thinkingCollapsed ? (
                                <ChevronRight className="gba:w-3 gba:h-3" />
                              ) : (
                                <ChevronDown className="gba:w-3 gba:h-3" />
                              )}
                              <Brain className="gba:w-3 gba:h-3" />
                              <span className="gba:font-medium">
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.thinking_label', 'Thinking')}
                              </span>
                              <span className="gba:text-muted-foreground/60">
                                ({Math.ceil(message.thinkingLog.length / 100)}{' '}
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.steps', 'steps')})
                              </span>
                            </button>
                            {!message.thinkingCollapsed && message.thinkingLog.trim() && (
                              <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:text-muted-foreground gba:whitespace-pre-wrap gba:max-h-64 gba:overflow-y-auto gba:border-t gba:border-muted-foreground/10">
                                {message.thinkingLog}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="gba:bg-card gba:border gba:rounded-lg gba:px-3 gba:py-2">
                          {message.cost && (
                            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2 gba:pb-2 gba:border-b">
                              <span className="gba:text-xs gba:font-medium gba:text-primary">
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.ai_response', 'AI Response')}
                              </span>
                              <span className="gba:text-xs gba:text-muted-foreground">
                                ${message.cost.totalCost.toFixed(4)} ({message.cost.inputTokens.toLocaleString()}in /{' '}
                                {message.cost.outputTokens.toLocaleString()}out)
                              </span>
                            </div>
                          )}
                          {renderMarkdown(message.content)}
                        </div>

                        {message.toolCalls && message.toolCalls.length > 0 && renderToolCalls(message.toolCalls)}

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

                  {message.role === 'user' && (
                    <Avatar className="gba:w-8 gba:h-8 gba:shrink-0">
                      {authorAvatarSrc ? (
                        <AvatarImage src={authorAvatarSrc} alt={authorDisplayName} />
                      ) : (
                        <AvatarFallback>{getInitials(authorDisplayName)}</AvatarFallback>
                      )}
                    </Avatar>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="gba:flex-shrink-0 gba:border-t gba:border-border gba:p-4 gba:bg-background">
        <div className="gba:flex gba:gap-2 gba:items-end">
          {onAttachFile && (
            <Button type="button" variant="ghost" size="icon" onClick={onAttachFile} disabled={isProcessing}>
              <Upload className="gba:w-4 gba:h-4" />
            </Button>
          )}
          <div className="gba:flex-1 gba:relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder ?? 'Describe what you want to build...'}
              disabled={isProcessing}
              className="gba:w-full gba:px-4 gba:py-3 gba:pr-12 gba:border gba:border-border gba:rounded-lg gba:bg-background gba:text-sm gba:resize-none focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary focus:gba:border-transparent disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
              rows={3}
              data-testid="ai-builder-input"
            />
          </div>
          <Button
            onClick={onSendMessage}
            disabled={isProcessing || !input.trim()}
            size="icon"
            className="gba:shrink-0"
            data-testid="ai-builder-send-button"
            title={isProcessing ? (buildingLabel ?? undefined) : (sendButtonLabel ?? undefined)}
          >
            {isProcessing ? (
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
            ) : (
              <Sparkles className="gba:w-4 gba:h-4" />
            )}
          </Button>
        </div>
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
  )
}
