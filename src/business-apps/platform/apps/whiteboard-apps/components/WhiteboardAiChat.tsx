import { useState, useCallback, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, Button, Textarea, useTranslation } from '@newwork/nw-design-system'
import { SendHorizontal, Bot, Trash2, Loader2, Sparkles, X, ImagePlus } from 'lucide-react'
import { WhiteboardAiMessage } from './WhiteboardAiMessage'
import type { WhiteboardAiMessage as AiMessage } from '../hooks/useWhiteboardAiSocket'
import { resizeImageDataUrl } from '../utils/resizeImageDataUrl'
import translations from '../_i18n'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

interface WhiteboardAiChatProps {
  messages: AiMessage[]
  isStreaming: boolean
  streamingContent: string
  status: string | null
  isConnected: boolean
  sessionTitle?: string | null
  onSend: (message: string, imageDataUrl?: string) => void
  onClearHistory: () => void
  onClose: () => void
  userAvatarUrl?: string
  userName?: string
  testId?: string
}

const SUGGESTIONS = [
  'Draw a flowchart for user authentication',
  'Create an architecture diagram',
  'Add a mind map about project planning',
  'Draw a simple wireframe layout'
]

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const WhiteboardAiChat = ({
  messages,
  isStreaming,
  streamingContent,
  status,
  isConnected,
  sessionTitle,
  onSend,
  onClearHistory,
  onClose,
  userAvatarUrl,
  userName,
  testId = 'wb-ai-chat'
}: WhiteboardAiChatProps) => {
  const { t } = useTranslation(translations)
  const [value, setValue] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  const processImageFile = useCallback(
    async (file: File) => {
      setImageError(null)
      if (!file.type.startsWith('image/')) return
      try {
        const raw = await readFileAsDataUrl(file)
        const resized = await resizeImageDataUrl(raw)
        if (resized.length > MAX_IMAGE_BYTES) {
          setImageError(t('whiteboard-ai-image-too-large'))
          return
        }
        setPendingImage(resized)
      } catch {
        setImageError('Failed to process image')
      }
    },
    [t]
  )

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && !pendingImage) || isStreaming) return
    onSend(trimmed || 'Recreate this diagram on the canvas', pendingImage ?? undefined)
    setValue('')
    setPendingImage(null)
    setImageError(null)
  }, [value, pendingImage, isStreaming, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) processImageFile(file)
          return
        }
      }
    },
    [processImageFile]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processImageFile(file)
      if (e.target) e.target.value = ''
    },
    [processImageFile]
  )

  const isEmpty = messages.length === 0

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Sparkles className="gba:h-4 gba:w-4 gba:text-primary" />
          <span className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:text-primary gba:flex-1 gba:truncate">
            {sessionTitle || t('whiteboard-ai-title')}
          </span>
          {isConnected && <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />}
        </div>
        <div className="gba:flex gba:items-center gba:gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearHistory} data-testid={`${testId}-clear`}>
              <Trash2 className="gba:h-3.5 gba:w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} data-testid={`${testId}-close`}>
            <X className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="gba:flex-1 gba:overflow-y-auto gba:min-h-0">
        {isEmpty && !isStreaming ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:px-6 gba:text-center">
            <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-4">
              <Bot className="gba:h-6 gba:w-6 gba:text-primary" />
            </div>
            <p className="gba:text-sm gba:font-medium gba:mb-1">{t('whiteboard-ai-welcome')}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-6">{t('whiteboard-ai-welcome-sub')}</p>
            <div className="gba:flex gba:flex-col gba:gap-2 gba:w-full">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={suggestion}
                  type="button"
                  className="gba:text-left gba:text-xs gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:border-border gba:hover:bg-accent gba:transition-colors"
                  onClick={() => onSend(suggestion)}
                  data-testid={`${testId}-suggestion-${i}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map(msg => (
              <WhiteboardAiMessage key={msg.id} message={msg} userAvatarUrl={userAvatarUrl} userName={userName} />
            ))}
            {isStreaming && streamingContent && (
              <div className="gba:flex gba:gap-2.5 gba:px-4 gba:py-3">
                <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:mt-0.5">
                  <AvatarFallback className="gba:bg-primary/10 gba:text-primary">
                    <Bot className="gba:h-3.5 gba:w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="gba:max-w-[85%] gba:rounded-2xl gba:rounded-bl-sm gba:bg-muted/60 gba:px-4 gba:py-3">
                  <p className="gba:text-sm gba:whitespace-pre-wrap gba:break-words">
                    {streamingContent}
                    <span className="gba:inline-block gba:w-1.5 gba:h-4 gba:bg-foreground gba:animate-pulse gba:ml-0.5" />
                  </p>
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && status && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:text-muted-foreground">
                <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                <span className="gba:text-xs">{status}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="gba:px-3 gba:pb-3 gba:pt-2" data-testid={`${testId}-input`}>
        <div className="gba:bg-card/80 gba:backdrop-blur-sm gba:rounded-2xl gba:border gba:border-border/60 gba:focus-within:border-primary/30 gba:transition-all gba:duration-200">
          {pendingImage && (
            <div className="gba:px-4 gba:pt-3 gba:flex gba:items-start gba:gap-2">
              <div className="gba:relative gba:inline-block">
                <img
                  src={pendingImage}
                  alt="Pending upload"
                  className="gba:h-20 gba:rounded-lg gba:border gba:border-border gba:object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="gba:absolute gba:-top-1.5 gba:-right-1.5 gba:h-5 gba:w-5 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground gba:flex gba:items-center gba:justify-center gba:hover:opacity-80 gba:transition-opacity"
                  aria-label={t('whiteboard-ai-remove-image')}
                  data-testid={`${testId}-remove-image`}
                >
                  <X className="gba:h-3 gba:w-3" />
                </button>
              </div>
            </div>
          )}
          {imageError && <p className="gba:px-4 gba:pt-2 gba:text-xs gba:text-destructive">{imageError}</p>}
          <div className="gba:px-4 gba:pt-3 gba:pb-1">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={t('whiteboard-ai-placeholder')}
              disabled={isStreaming}
              className="gba:h-9 gba:min-h-9 gba:max-h-[120px] gba:resize-none gba:overflow-y-auto gba:w-full gba:border-0 gba:bg-transparent gba:text-sm gba:placeholder:text-muted-foreground/60 gba:px-3 gba:py-2 gba:focus-visible:ring-0 gba:focus-visible:ring-offset-0 gba:block"
              rows={1}
              data-testid={`${testId}-textarea`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:pb-3 gba:pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="gba:hidden"
              onChange={handleFileChange}
              data-testid={`${testId}-file-input`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              aria-label={t('whiteboard-ai-attach-image')}
              data-testid={`${testId}-attach-image`}
            >
              <ImagePlus className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              size="icon"
              className={`gba:h-8 gba:w-8 gba:rounded-xl gba:transition-all gba:duration-200 ${
                value.trim() || pendingImage ? 'gba:opacity-100 gba:scale-100' : 'gba:opacity-40 gba:scale-95'
              }`}
              onClick={handleSend}
              disabled={isStreaming || (!value.trim() && !pendingImage)}
              data-testid={`${testId}-send`}
            >
              <SendHorizontal className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
