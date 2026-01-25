import React, { useState, useRef, useCallback, useId, useEffect } from 'react'
import { Button, Textarea, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { Plus, Paperclip, Globe, Trash, PaperPlaneTilt } from '@phosphor-icons/react'
import { useFileUploadManager, MaxNumberOfFilesError, MaxTotalSizeError } from '../hooks/useFileUploadManager'
import { VoiceModeButton } from './voice/VoiceModeButton'

type Suggestion = string | { heading?: string; message?: string }

function getUploadErrorMessage(err: unknown): string {
  if (err instanceof MaxNumberOfFilesError) {
    return 'You can only upload up to 5 files.'
  }
  if (err instanceof MaxTotalSizeError) {
    return 'The total size of the files exceeds 100MB.'
  }
  return 'File upload failed. Please check size/format.'
}

function shouldSendMessage(params: { disabled?: boolean; value: string; fileCount: number }): {
  canSend: boolean
  trimmed: string
} {
  if (params.disabled) return { canSend: false, trimmed: '' }
  const trimmed = params.value.trim()
  if (!trimmed && params.fileCount === 0) return { canSend: false, trimmed }
  return { canSend: true, trimmed }
}

interface ChatInputProps {
  onSend: (
    text: string,
    files: File[],
    isThinking: boolean,
    isSearching: boolean,
    mentions?: Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
  ) => void
  onClear: () => void
  disabled?: boolean
  className?: string
  suggestions?: Suggestion[]
  isPrechatLoading?: boolean
  placeholder?: string
  // Voice mode props
  isSpeechMode?: boolean
  isListening?: boolean
  isSpeaking?: boolean
  isVoiceLoading?: boolean
  voiceVolume?: number
  onToggleVoiceMode?: () => void
  onStopSpeaking?: () => void
  /**
   * Optional callback fired as soon as the user attaches files.
   * Used for "upload early" behaviour where files are pre-uploaded before pressing Send.
   */
  onFilesAttached?: (files: File[]) => void
  // Cancel restoration props
  cancelledMessageText?: string | null
  onClearCancelledMessage?: () => void
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onClear,
  disabled,
  className,
  suggestions,
  isPrechatLoading = false,
  placeholder = 'Ask EveryAI anything...',
  // Voice mode props with defaults
  isSpeechMode = false,
  isListening = false,
  isSpeaking = false,
  isVoiceLoading = false,
  voiceVolume = 0,
  onToggleVoiceMode,
  onStopSpeaking,
  onFilesAttached,
  cancelledMessageText,
  onClearCancelledMessage
}) => {
  const [value, setValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { files, uploadFile, removeFile, clearFiles } = useFileUploadManager()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsScrollId = useId()

  const handleSend = useCallback(() => {
    const { canSend, trimmed } = shouldSendMessage({ disabled, value, fileCount: files.length })
    if (!canSend) return
    onSend(
      trimmed,
      files.map(f => f.file),
      false,
      isSearching,
      undefined
    )
    setValue('')
    clearFiles()
    setIsSearching(false)
  }, [value, files, onSend, clearFiles, disabled, isSearching])

  const pickFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return
      const attachedFiles: File[] = []
      Array.from(list).forEach(file => {
        try {
          uploadFile(file)
          attachedFiles.push(file)
        } catch (err) {
          alert(getUploadErrorMessage(err))
        }
      })
      // Notify parent that new files were attached so they can be pre-uploaded if desired.
      if (attachedFiles.length > 0) {
        onFilesAttached?.(attachedFiles)
      }
    },
    [uploadFile, onFilesAttached]
  )

  const focusTextarea = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [])

  // Check if voice mode is supported (has the callback)
  const voiceModeSupported = !!onToggleVoiceMode

  // Restore cancelled message to input when cancelledMessageText changes
  useEffect(() => {
    if (cancelledMessageText) {
      setValue(cancelledMessageText)
      onClearCancelledMessage?.()
      // Focus the textarea after restoring the message
      setTimeout(() => {
        textareaRef.current?.focus()
        // Move cursor to end of text
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length
          textareaRef.current.selectionEnd = textareaRef.current.value.length
        }
      }, 0)
    }
  }, [cancelledMessageText, onClearCancelledMessage])

  // Golden color for animations
  const goldRgb = '212, 175, 55'
  const goldSecondary = 'var(--nw-ai-secondary)'

  return (
    <>
      <style>{`
        .golden-button {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          background-size: 200% 200%;
          animation: golden-border-flow 3s ease infinite;
        }
        #${suggestionsScrollId} {
          -ms-overflow-style: none;
          scrollbar-width: none;
          overflow-x: auto;
          overflow-y: hidden;
        }
        #${suggestionsScrollId}::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        @keyframes golden-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(${goldRgb}, 0.15), 0 0 0 1px rgba(${goldRgb}, 0.1); }
          50% { box-shadow: 0 4px 30px rgba(${goldRgb}, 0.25), 0 0 0 1px rgba(${goldRgb}, 0.2); }
        }
        @keyframes golden-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes suggestion-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .input-container-premium {
          background: var(--nw-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .input-container-premium:focus-within {
          animation: golden-glow 2s ease-in-out infinite;
        }
        .golden-button {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          background-size: 200% 200%;
          animation: golden-border-flow 3s ease infinite;
        }
        .golden-button:hover {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          filter: brightness(1.1);
        }
      `}</style>
      <div
        className={`gba:flex gba:flex-col gba:gap-3 ${disabled ? 'gba:opacity-50 gba:pointer-events-none' : ''} ${className || ''}`}
        data-testid="chat-input"
      >
        {/* Premium Suggestions - floating glass pills */}
        {suggestions && suggestions.length > 0 && (
          <div className="gba:relative gba:overflow-hidden gba:-mt-2">
            {/* Fade overlay on right edge */}
            <div className="gba:absolute gba:right-0 gba:top-0 gba:bottom-0 gba:w-12 gba:bg-gradient-to-l gba:from-background gba:to-transparent gba:z-10 gba:pointer-events-none" />
            <div
              id={suggestionsScrollId}
              className="gba:flex gba:flex-nowrap gba:gap-2 gba:pr-12 gba:overflow-x-auto gba:overflow-y-hidden gba:py-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {isPrechatLoading ? (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:px-1">
                  <div
                    className="gba:h-4 gba:w-4 gba:rounded-full gba:border-2"
                    style={{
                      borderColor: `rgba(${goldRgb}, 0.3)`,
                      borderTopColor: `rgb(${goldRgb})`,
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <span>Thinking of suggestions...</span>
                </div>
              ) : (
                suggestions.map((s, idx) => {
                  const label = typeof s === 'string' ? s : s.heading || s.message || ''
                  const text = typeof s === 'string' ? s : s.message || s.heading || ''
                  return (
                    <button
                      key={idx}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSend(
                          text,
                          files.map(f => f.file),
                          false,
                          isSearching,
                          undefined
                        )
                        clearFiles()
                        setIsSearching(false)
                      }}
                      className="gba:group gba:flex-shrink-0 gba:inline-flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap gba:text-xs gba:rounded-full gba:px-4 gba:py-2 gba:transition-all gba:duration-300"
                      className="gba:bg-card/90"
                      style={{
                        boxShadow: `0 2px 8px rgba(${goldRgb}, 0.1), 0 0 0 1px rgba(${goldRgb}, 0.15)`,
                        animation: `suggestion-float 3s ease-in-out infinite`,
                        animationDelay: `${idx * 0.15}s`
                      }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                          `0 4px 16px rgba(${goldRgb}, 0.25), 0 0 0 1px rgba(${goldRgb}, 0.3)`
                        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                          `0 2px 8px rgba(${goldRgb}, 0.1), 0 0 0 1px rgba(${goldRgb}, 0.15)`
                        ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                      }}
                      data-testid={`suggestion-${idx}`}
                    >
                      <span className="gba:font-medium gba:transition-colors" className="gba:text-foreground">
                        {label}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Premium File Chips with golden styling */}
        {files.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="uploaded-files">
            {files.map(f => (
              <div
                key={f.id}
                className="gba:group/file gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:px-3 gba:py-2 gba:text-xs gba:transition-all gba:duration-300"
                className="gba:bg-card/95"
                style={{
                  boxShadow: `0 2px 8px rgba(${goldRgb}, 0.12), 0 0 0 1px rgba(${goldRgb}, 0.2)`
                }}
              >
                <div
                  className="gba:flex-shrink-0 gba:h-5 gba:w-5 gba:rounded-md gba:flex gba:items-center gba:justify-center"
                  style={{ background: `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})` }}
                >
                  <svg className="gba:h-3 gba:w-3" fill="none" stroke="var(--nw-ai-foreground)" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span
                  className="gba:truncate gba:max-w-[180px] gba:font-medium gba:text-foreground"
                  title={f.file.name}
                >
                  {f.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  aria-label="Remove file"
                  className="gba:ml-1 gba:flex-shrink-0 gba:h-5 gba:w-5 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:text-muted-foreground hover:gba:bg-destructive/10 hover:gba:text-destructive gba:transition-all"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="gba:h-3.5 gba:w-3.5"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container - Ultra-modern floating glass design */}
        <div className="gba:relative gba:group">
          {/* Main input container with glass morphism */}
          <div
            className="input-container-premium gba:relative gba:rounded-2xl gba:p-3 gba:transition-all gba:duration-500"
            style={{
              boxShadow: `0 4px 24px rgba(${goldRgb}, 0.08), 0 0 0 1px rgba(${goldRgb}, 0.1), inset 0 1px 0 rgba(255,255,255,0.8)`
            }}
          >
            <div className="gba:flex gba:items-center gba:gap-3">
              {/* Left side: More actions menu - sleek circular button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-10 gba:w-10 gba:rounded-full gba:transition-all gba:duration-300 gba:flex-shrink-0 gba:border-0"
                    style={{
                      background:
                        isSearching || files.length > 0
                          ? `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`
                          : 'rgba(0,0,0,0.04)',
                      color: isSearching || files.length > 0 ? 'white' : '#666',
                      boxShadow: isSearching || files.length > 0 ? `0 2px 12px rgba(${goldRgb}, 0.3)` : 'none'
                    }}
                    aria-label="More options"
                    title="More options"
                    disabled={disabled}
                  >
                    <Plus className="gba:h-5 gba:w-5" weight="bold" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="gba:w-60 gba:p-2.5 gba:rounded-xl gba:border-0"
                  className="gba:bg-card/98"
                  style={{
                    backdropFilter: 'blur(20px)',
                    boxShadow: `0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(${goldRgb}, 0.1)`
                  }}
                  side="top"
                  align="start"
                  sideOffset={12}
                >
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    {/* Attach File */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:transition-all gba:duration-200 gba:w-full gba:text-left"
                      className="gba:text-foreground"
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = `rgba(${goldRgb}, 0.08)`
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                      }}
                      disabled={disabled}
                    >
                      <div
                        className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                        style={{ background: `rgba(${goldRgb}, 0.12)` }}
                      >
                        <Paperclip className="gba:h-4 gba:w-4" style={{ color: `rgb(${goldRgb})` }} weight="bold" />
                      </div>
                      <span className="gba:font-medium">Attach file</span>
                      {files.length > 0 && (
                        <span
                          className="gba:ml-auto gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold"
                          style={{
                            background: `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`,
                            color: 'var(--nw-ai-foreground)'
                          }}
                        >
                          {files.length}
                        </span>
                      )}
                    </button>

                    {/* Web Search Toggle */}
                    <button
                      onClick={() => setIsSearching(!isSearching)}
                      className="gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:transition-all gba:duration-200 gba:w-full gba:text-left"
                      style={{
                        background: isSearching ? 'var(--nw-success)1A' : 'transparent',
                        color: isSearching ? 'var(--nw-success)' : 'var(--nw-foreground)'
                      }}
                      disabled={disabled}
                    >
                      <div
                        className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                        style={{ background: isSearching ? 'rgb(34, 197, 94)' : `rgba(${goldRgb}, 0.12)` }}
                      >
                        <Globe
                          className="gba:h-4 gba:w-4"
                          style={{ color: isSearching ? 'var(--nw-success-foreground)' : `rgb(${goldRgb})` }}
                          weight={isSearching ? 'fill' : 'bold'}
                        />
                      </div>
                      <span className="gba:font-medium">Web search</span>
                      {isSearching && (
                        <span className="gba:ml-auto gba:text-xs gba:bg-success gba:text-success-foreground gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold">
                          ON
                        </span>
                      )}
                    </button>

                    {/* Divider */}
                    <div
                      className="gba:h-px gba:my-1.5"
                      style={{
                        background: `linear-gradient(to right, transparent, rgba(${goldRgb}, 0.2), transparent)`
                      }}
                    />

                    {/* Clear Conversation */}
                    <button
                      onClick={() => {
                        setValue('')
                        clearFiles()
                        onClear()
                        focusTextarea()
                      }}
                      className="gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:text-destructive gba:transition-all gba:duration-200 gba:w-full gba:text-left"
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.08)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                      }}
                      disabled={disabled}
                    >
                      <div className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:bg-destructive/10 gba:flex gba:items-center gba:justify-center gba:transition-all">
                        <Trash className="gba:h-4 gba:w-4 gba:text-destructive" weight="bold" />
                      </div>
                      <span className="gba:font-medium">Clear chat</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Textarea - Seamless integration */}
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={placeholder}
                className="gba:flex-1 gba:min-w-0 gba:min-h-[40px] gba:max-h-32 gba:resize-none gba:bg-transparent gba:border-none focus-visible:gba:ring-0 gba:text-base gba:py-2 gba:px-1 gba:leading-relaxed"
                className="gba:text-foreground"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={disabled}
              />

              {/* Right side: Voice + Send - vertical premium stack */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:flex-shrink-0">
                {/* Voice Mode Button */}
                {voiceModeSupported && (
                  <VoiceModeButton
                    isActive={isSpeechMode}
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    isLoading={isVoiceLoading}
                    volume={voiceVolume}
                    onToggle={onToggleVoiceMode}
                    onStopSpeaking={onStopSpeaking}
                    disabled={disabled}
                    size="sm"
                  />
                )}

                {/* Send Button - Premium golden design */}
                <Button
                  variant="default"
                  size="sm"
                  className="gba:h-10 gba:w-10 gba:rounded-full gba:border-0 gba:transition-all gba:duration-300"
                  onClick={handleSend}
                  aria-label="Send"
                  title="Send message"
                  disabled={disabled || (!value.trim() && files.length === 0)}
                  style={{
                    background:
                      !disabled && (value.trim() || files.length > 0)
                        ? `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`
                        : 'rgba(0,0,0,0.06)',
                    color:
                      !disabled && (value.trim() || files.length > 0)
                        ? 'var(--nw-ai-foreground)'
                        : 'var(--nw-muted-foreground)',
                    boxShadow:
                      !disabled && (value.trim() || files.length > 0) ? `0 4px 16px rgba(${goldRgb}, 0.4)` : 'none',
                    transform: !disabled && (value.trim() || files.length > 0) ? 'scale(1)' : 'scale(0.95)'
                  }}
                >
                  <PaperPlaneTilt className="gba:h-5 gba:w-5" weight="fill" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="gba:hidden"
          onChange={e => {
            const list = e.target.files
            if (list && list.length) pickFiles(list)
            if (e.target) e.target.value = ''
          }}
        />
      </div>
    </>
  )
}

export default ChatInput
