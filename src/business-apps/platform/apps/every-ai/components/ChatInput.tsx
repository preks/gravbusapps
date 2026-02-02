import React, { useState, useRef, useCallback, useEffect } from 'react'
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
  /** When true, applies translucent dark mode styling for dark backgrounds */
  darkMode?: boolean
  /** When true, show fewer suggestions (e.g. in sidebar) so they fit in one row */
  compactSuggestions?: boolean
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
  onClearCancelledMessage,
  darkMode = false,
  compactSuggestions = false
}) => {
  const [value, setValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { files, uploadFile, removeFile, clearFiles } = useFileUploadManager()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Blue color theme for animations (matching the EveryAI hero)
  const goldRgb = '59, 130, 246' // Royal blue
  const goldSecondary = 'rgb(96, 165, 250)' // Light blue

  return (
    <>
      <style>{`
        .golden-button {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          background-size: 200% 200%;
          animation: golden-border-flow 3s ease infinite;
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
          background: transparent;
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
        @keyframes chat-input-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(${goldRgb}, 0.35), 0 0 16px rgba(${goldRgb}, 0.2); }
          50% { box-shadow: 0 0 0 2px rgba(${goldRgb}, 0.6), 0 0 24px rgba(${goldRgb}, 0.35); }
        }
        .chat-input-pulse {
          animation: chat-input-pulse-glow 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="chat-input-pulse gba:relative gba:rounded-2xl gba:p-[2px] gba:min-w-0" data-testid="chat-input-outer">
        {/* Subtle circling lighter-blue ring - uses rgba for conic-gradient animation effect */}
        <div
          className="gba:absolute gba:inset-0 gba:rounded-2xl gba:overflow-hidden gba:pointer-events-none"
          style={{
            // eslint-disable-next-line newwork-local/no-hardcoded-colors
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(147, 197, 253, 0.5) 330deg, rgba(191, 219, 254, 0.6) 360deg)`,
            animation: 'chat-input-circle-rotate 5s linear infinite',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent calc(100% - 2px), black 100%)',
            maskImage: 'radial-gradient(circle at center, transparent calc(100% - 2px), black 100%)'
          }}
        />
      <div
        className={`gba:relative gba:rounded-2xl gba:flex gba:flex-col gba:gap-3 gba:pt-2 gba:px-2 ${disabled ? 'gba:opacity-50 gba:pointer-events-none' : ''} ${className || ''}`}
        data-testid="chat-input"
      >
        {/* Suggestions - in compact mode (sidebar) show fewer so they fit in one row */}
        {(isPrechatLoading || (suggestions && suggestions.length > 0)) && (
          <div
            className="gba:flex gba:w-full gba:max-w-full gba:min-w-0 gba:flex-nowrap gba:items-center gba:justify-start gba:gap-1.5 gba:overflow-hidden gba:-mb-1"
            data-testid="chat-input-suggestions"
          >
            {isPrechatLoading ? (
              <span className={`gba:text-xs ${darkMode ? 'gba:text-white/50' : 'gba:text-muted-foreground'}`}>
                Loading suggestions…
              </span>
            ) : (
              (compactSuggestions ? suggestions?.slice(0, 3) : suggestions)?.map((s, idx) => {
                const label = typeof s === 'string' ? s : s.heading || s.message || ''
                const text = typeof s === 'string' ? s : s.message || s.heading || ''

                if (!label || !text) return null

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`gba:flex-shrink gba:min-w-0 gba:max-w-full gba:h-6 gba:rounded-full gba:px-2.5 gba:text-[11px] gba:font-medium gba:transition-all gba:duration-200 gba:truncate ${
                      darkMode
                        ? 'gba:bg-white/10 gba:text-white/70 gba:border gba:border-white/15 hover:gba:bg-white/15 hover:gba:text-white'
                        : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-secondary/80'
                    }`}
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
                    data-testid={`suggestion-${idx}`}
                  >
                    {label}
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Premium File Chips with golden styling */}
        {files.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="uploaded-files">
            {files.map(f => (
              <div
                key={f.id}
                className="gba:group/file gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:bg-card/95 gba:px-3 gba:py-2 gba:text-xs gba:transition-all gba:duration-300"
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
                <span className="gba:truncate gba:max-w-48 gba:font-medium gba:text-foreground" title={f.file.name}>
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
              boxShadow: darkMode
                ? 'none'
                : `0 4px 24px rgba(${goldRgb}, 0.06), 0 0 0 1px rgba(${goldRgb}, 0.08)`,
              background: 'transparent'
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
                          : darkMode
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.04)',
                      color: isSearching || files.length > 0 ? 'white' : darkMode ? 'rgba(255,255,255,0.7)' : '#666',
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
                  className={`gba:w-60 gba:rounded-xl gba:border-0 gba:p-2.5 ${darkMode ? '' : 'gba:bg-card/98'}`}
                  style={{
                    backdropFilter: 'blur(20px)',
                    boxShadow: darkMode
                      ? '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(147, 197, 253, 0.2)'
                      : `0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(${goldRgb}, 0.1)`,
                    background: darkMode ? 'rgba(15, 23, 42, 0.95)' : undefined
                  }}
                  side="top"
                  align="start"
                  sideOffset={12}
                >
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    {/* Attach File */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`gba:group/option gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-xl gba:px-3 gba:py-2.5 gba:text-left gba:text-sm gba:transition-all gba:duration-200 ${darkMode ? 'gba:text-white/90 hover:gba:bg-white/10' : 'gba:text-foreground'}`}
                      onMouseEnter={e => {
                        if (!darkMode)
                          (e.currentTarget as HTMLButtonElement).style.background = `rgba(${goldRgb}, 0.08)`
                      }}
                      onMouseLeave={e => {
                        if (!darkMode) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                      }}
                      disabled={disabled}
                    >
                      <div
                        className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                        style={{ background: darkMode ? 'rgba(96, 165, 250, 0.2)' : `rgba(${goldRgb}, 0.12)` }}
                      >
                        <Paperclip
                          className="gba:h-4 gba:w-4"
                          style={{ color: darkMode ? 'rgb(147, 197, 253)' : `rgb(${goldRgb})` }}
                          weight="bold"
                        />
                      </div>
                      <span className="gba:font-medium">Attach file</span>
                      {files.length > 0 && (
                        <span
                          className="gba:ml-auto gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold"
                          style={{
                            background: darkMode
                              ? 'rgba(96, 165, 250, 0.3)'
                              : `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`,
                            color: darkMode ? 'white' : 'var(--nw-ai-foreground)'
                          }}
                        >
                          {files.length}
                        </span>
                      )}
                    </button>

                    {/* Web Search Toggle */}
                    <button
                      onClick={() => setIsSearching(!isSearching)}
                      className={`gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:transition-all gba:duration-200 gba:w-full gba:text-left ${darkMode && !isSearching ? 'gba:text-white/90 hover:gba:bg-white/10' : ''}`}
                      style={{
                        background: isSearching ? 'var(--nw-success)1A' : 'transparent',
                        color: isSearching ? 'var(--nw-success)' : darkMode ? undefined : 'var(--nw-foreground)'
                      }}
                      disabled={disabled}
                    >
                      <div
                        className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                        style={{
                          background: isSearching
                            ? 'rgb(34, 197, 94)'
                            : darkMode
                              ? 'rgba(96, 165, 250, 0.2)'
                              : `rgba(${goldRgb}, 0.12)`
                        }}
                      >
                        <Globe
                          className="gba:h-4 gba:w-4"
                          style={{
                            color: isSearching
                              ? 'var(--nw-success-foreground)'
                              : darkMode
                                ? 'rgb(147, 197, 253)'
                                : `rgb(${goldRgb})`
                          }}
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
                        background: darkMode
                          ? 'linear-gradient(to right, transparent, rgba(147, 197, 253, 0.3), transparent)'
                          : `linear-gradient(to right, transparent, rgba(${goldRgb}, 0.2), transparent)`
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
                      className="gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:text-destructive gba:transition-all gba:duration-200 gba:w-full gba:text-left hover:gba:bg-destructive/10"
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
                className={`gba:flex-1 gba:min-w-0 gba:min-h-10 gba:max-h-32 gba:resize-none gba:bg-transparent gba:border-none gba:px-1 gba:py-2 gba:text-base gba:leading-relaxed focus-visible:gba:ring-0 ${darkMode ? 'gba:text-white gba:placeholder-white/50' : 'gba:text-foreground'}`}
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

                {/* Send Button - Premium design */}
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
                        ? darkMode
                          ? 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))'
                          : `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`
                        : darkMode
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.06)',
                    color:
                      !disabled && (value.trim() || files.length > 0)
                        ? 'white'
                        : darkMode
                          ? 'rgba(255,255,255,0.5)'
                          : 'var(--nw-muted-foreground)',
                    boxShadow:
                      !disabled && (value.trim() || files.length > 0)
                        ? darkMode
                          ? '0 4px 16px rgba(59, 130, 246, 0.4)'
                          : `0 4px 16px rgba(${goldRgb}, 0.4)`
                        : 'none',
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
      </div>
    </>
  )
}

export default ChatInput
