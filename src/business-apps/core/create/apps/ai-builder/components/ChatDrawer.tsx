import React, { useState, useRef, useEffect } from 'react'
import { Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Bot, Sparkles, Loader2, Copy, Check, ChevronDown, ChevronRight, Upload, Brain } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import * as Vaul from 'vaul'

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
}

const snapPoints = [80, 120, 160, 200, 250, 300, 350, 400, 500, 600, 700, 800, 900]

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
  onToggleThinking
}) => {
  const [activeSnapPoint, setActiveSnapPoint] = useState<number>(80)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleCycleSize = () => {
    const presets = [80, 250, 500, 700]
    const currentPresetIndex = presets.indexOf(activeSnapPoint)
    const nextPresetIndex = currentPresetIndex === -1 ? 0 : (currentPresetIndex + 1) % presets.length
    setActiveSnapPoint(presets[nextPresetIndex])
  }

  const handleExpandToMax = () => {
    setActiveSnapPoint(700)
  }

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

  const renderToolCalls = (toolCalls: ToolCall[]) => {
    if (!toolCalls || toolCalls.length === 0) return null

    return (
      <div className="gba:bg-muted/50 gba:rounded-lg gba:p-2 gba:space-y-1">
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tools', 'Tools')} ({toolCalls.length})
        </span>
        {toolCalls.map(tool => {
          // Extract file path from tool args
          let displayText = tool.tool
          let filePath: string | null = null

          if (tool.args) {
            // Try to extract file path from different tool types
            if (tool.tool === 'write_file' || tool.tool === 'read_file') {
              // Match patterns like: filePath: "src/..." or path: "src/..."
              const pathMatch = tool.args.match(/(?:filePath|path|target_file):\s*"([^"]+)"/)
              if (pathMatch) {
                filePath = pathMatch[1]
                displayText =
                  tool.tool === 'write_file'
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_writing', '✍️ Writing')
                    : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_reading', '📖 Reading')
              }
            } else if (tool.tool === 'propose_change') {
              const fileMatch = tool.args.match(/file_path:\s*"([^"]+)"/)
              if (fileMatch) {
                filePath = fileMatch[1]
                displayText = getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tool_editing', '🔧 Editing')
              }
            }
          }

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

  const renderMarkdown = (content: string) => {
    return <MarkdownRenderer content={content} />
  }

  return (
    <Vaul.Root
      open={true}
      dismissible={false}
      modal={false}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPoint}
    >
      <Vaul.Overlay className="gba:fixed gba:inset-0 gba:z-[100]" />
      <Vaul.Content
        className="gba:fixed gba:bottom-0 gba:left-0 gba:right-0 gba:z-[101] gba:flex gba:flex-col gba:bg-background gba:border-t gba:border-border gba:rounded-t-xl gba:shadow-2xl"
        style={{
          maxHeight: `${activeSnapPoint}px`
        }}
      >
        {/* Drag Handle */}
        <div className="gba:flex gba:justify-center gba:pt-3 gba:pb-2">
          <div className="gba:w-12 gba:h-1.5 gba:bg-muted gba:rounded-full" />
        </div>

        {/* Header */}
        <div
          onClick={handleExpandToMax}
          className="gba:px-6 gba:py-3 gba:border-b gba:border-border gba:flex gba:items-center gba:justify-between gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors"
        >
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center">
              <Bot className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <div>
              <h3 className="gba:text-sm gba:font-semibold">AI Assistant</h3>
              <p className="gba:text-xs gba:text-muted-foreground">{isProcessing ? 'Thinking...' : 'Ready to help'}</p>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleCycleSize()
              }}
            >
              <ChevronDown className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-6 gba:py-4 gba:space-y-4">
          {messages.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:py-12">
              <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center gba:mb-4">
                <Sparkles className="gba:w-8 gba:h-8 gba:text-white" />
              </div>
              <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Start Building with AI</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">
                Describe what you want to build, and the AI will help you create it.
              </p>
            </div>
          ) : (
            <>
              {thinking && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:text-sm gba:py-2">
                  <Brain className="gba:w-4 gba:h-4 gba:animate-pulse gba:text-primary" />
                  <span>{getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.thinking', 'Thinking...')}</span>
                </div>
              )}

              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`gba:flex gba:gap-3 ${message.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <Bot className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
                    </div>
                  )}

                  <div className="gba:max-w-[85%]">
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
                      {userAvatar ? (
                        <AvatarImage src={userAvatar} alt={userName} />
                      ) : (
                        <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="gba:border-t gba:border-border gba:p-4 gba:bg-background">
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
                placeholder="Describe what you want to build..."
                disabled={isProcessing}
                className="gba:w-full gba:px-4 gba:py-3 gba:pr-12 gba:border gba:border-border gba:rounded-lg gba:bg-background gba:text-sm gba:resize-none focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary focus:gba:border-transparent disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
                rows={3}
              />
            </div>
            <Button
              onClick={onSendMessage}
              disabled={isProcessing || !input.trim()}
              size="icon"
              className="gba:shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              ) : (
                <Sparkles className="gba:w-4 gba:h-4" />
              )}
            </Button>
          </div>
          {onClearChat && messages.length > 0 && (
            <div className="gba:mt-2 gba:flex gba:justify-end">
              <Button variant="ghost" size="sm" onClick={onClearChat} className="gba:text-xs gba:text-muted-foreground">
                Clear chat
              </Button>
            </div>
          )}
        </div>
      </Vaul.Content>
    </Vaul.Root>
  )
}
