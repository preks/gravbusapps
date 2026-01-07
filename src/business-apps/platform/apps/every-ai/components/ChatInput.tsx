import React, { useState, useRef, useCallback, useId, useEffect } from 'react'
import { Button, Textarea, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { Plus, Paperclip, Globe, Trash, PaperPlaneTilt } from '@phosphor-icons/react'
import { useFileUploadManager, MaxNumberOfFilesError, MaxTotalSizeError } from '../hooks/useFileUploadManager'
import { VoiceModeButton } from './voice/VoiceModeButton'

type Suggestion = string | { heading?: string; message?: string }

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
    if (disabled) return
    const trimmed = value.trim()
    if (!trimmed && files.length === 0) return
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
          if (err instanceof MaxNumberOfFilesError) {
            alert('You can only upload up to 5 files.')
          } else if (err instanceof MaxTotalSizeError) {
            alert('The total size of the files exceeds 100MB.')
          } else {
            alert('File upload failed. Please check size/format.')
          }
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

  return (
    <>
      <style>{`
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
      `}</style>
      <div
        className={`gba:flex gba:flex-col gba:gap-2 ${disabled ? 'gba:opacity-50 gba:pointer-events-none' : ''} ${className || ''}`}
        data-testid="chat-input"
      >
        {/* Sleek AI Suggestions - horizontal scroll with hidden scrollbar */}
        {suggestions && suggestions.length > 0 && (
          <div className="gba:relative gba:overflow-hidden">
            {/* Fade overlay on right edge */}
            <div className="gba:absolute gba:right-0 gba:top-0 gba:bottom-0 gba:w-8 gba:bg-gradient-to-l gba:from-background gba:to-transparent gba:z-10 gba:pointer-events-none" />
            <div
              id={suggestionsScrollId}
              className="gba:flex gba:flex-nowrap gba:gap-2 gba:pr-8 gba:overflow-x-auto gba:overflow-y-hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {isPrechatLoading ? (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:px-1">
                  <div className="gba:animate-spin gba:rounded-full gba:h-3 gba:w-3 gba:border-2 gba:border-ai gba:border-t-transparent" />
                  <span>Loading suggestions...</span>
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
                      className="gba:group gba:flex-shrink-0 gba:inline-flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap gba:text-xs gba:rounded-full gba:bg-muted/50 hover:gba:bg-accent gba:px-3 gba:py-1.5 gba:transition-all hover:gba:shadow-sm gba:border gba:border-transparent hover:gba:border-ai/30"
                      data-testid={`suggestion-${idx}`}
                    >
                      <span className="gba:text-muted-foreground group-hover:gba:text-foreground gba:transition-colors">
                        {label}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Premium File Chips */}
        {files.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="uploaded-files">
            {files.map(f => (
              <div
                key={f.id}
                className="gba:flex gba:items-center gba:gap-2 gba:bg-gradient-to-r gba:from-muted gba:to-muted/50 gba:rounded-lg gba:px-3 gba:py-2 gba:text-xs gba:border gba:border-border gba:shadow-sm"
              >
                <svg className="gba:h-4 gba:w-4 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="gba:truncate gba:max-w-[180px] gba:font-medium" title={f.file.name}>
                  {f.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  aria-label="Remove file"
                  className="gba:ml-1 gba:text-muted-foreground hover:gba:text-destructive gba:transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="gba:h-3.5 gba:w-3.5"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container - Modern compact design */}
        <div className="gba:relative gba:group">
          <div className="gba:rounded-2xl gba:border-2 gba:border-border hover:gba:border-primary/50 gba:bg-card gba:shadow-lg gba:p-2 gba:transition-all gba:relative">
            <div className="gba:flex gba:items-end gba:gap-2">
              {/* Left side: More actions menu */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gba:h-9 gba:w-9 gba:rounded-xl gba:transition-all gba:flex-shrink-0 ${
                      isSearching || files.length > 0
                        ? 'gba:bg-ai gba:text-ai-foreground'
                        : 'gba:bg-muted hover:gba:bg-accent'
                    }`}
                    aria-label="More options"
                    title="More options"
                    disabled={disabled}
                  >
                    <Plus className="gba:h-5 gba:w-5" weight="bold" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="gba:w-48 gba:p-2" side="top" align="start" sideOffset={8}>
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    {/* Attach File */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:text-foreground hover:gba:bg-accent gba:transition-colors gba:w-full gba:text-left"
                      disabled={disabled}
                    >
                      <Paperclip className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="bold" />
                      <span>Attach file</span>
                      {files.length > 0 && (
                        <span className="gba:ml-auto gba:text-xs gba:bg-ai gba:text-ai-foreground gba:px-1.5 gba:py-0.5 gba:rounded-full">
                          {files.length}
                        </span>
                      )}
                    </button>

                    {/* Web Search Toggle */}
                    <button
                      onClick={() => setIsSearching(!isSearching)}
                      className={`gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors gba:w-full gba:text-left ${
                        isSearching ? 'gba:bg-success/10 gba:text-success' : 'gba:text-foreground hover:gba:bg-accent'
                      }`}
                      disabled={disabled}
                    >
                      <Globe className="gba:h-4 gba:w-4" weight={isSearching ? 'fill' : 'bold'} />
                      <span>Web search</span>
                      {isSearching && <span className="gba:ml-auto gba:text-xs gba:text-success">ON</span>}
                    </button>

                    {/* Divider */}
                    <div className="gba:h-px gba:bg-border gba:my-1" />

                    {/* Clear Conversation */}
                    <button
                      onClick={() => {
                        setValue('')
                        clearFiles()
                        onClear()
                        focusTextarea()
                      }}
                      className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:text-destructive hover:gba:bg-destructive/10 gba:transition-colors gba:w-full gba:text-left"
                      disabled={disabled}
                    >
                      <Trash className="gba:h-4 gba:w-4" weight="bold" />
                      <span>Clear chat</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Textarea - Takes all available space */}
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={placeholder}
                className="gba:flex-1 gba:min-w-0 gba:min-h-[36px] gba:max-h-32 gba:resize-none gba:bg-transparent gba:border-none focus-visible:gba:ring-0 gba:text-base placeholder:gba:text-muted-foreground/70 gba:py-1.5"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={disabled}
              />

              {/* Right side: Voice above Send (vertical stack) */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:flex-shrink-0">
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

                {/* Send Button */}
                <Button
                  variant="default"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary hover:gba:shadow-lg gba:transition-all"
                  onClick={handleSend}
                  aria-label="Send"
                  title="Send message"
                  disabled={disabled || (!value.trim() && files.length === 0)}
                >
                  <PaperPlaneTilt className="gba:h-4 gba:w-4" weight="fill" />
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
