import React, { useState, useRef, useCallback } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { useFileUploadManager, MaxNumberOfFilesError, MaxTotalSizeError } from '../hooks/useFileUploadManager'

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
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onClear,
  disabled,
  className,
  suggestions,
  isPrechatLoading = false,
  placeholder = 'Ask EveryAI anything...'
}) => {
  const [value, setValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { files, uploadFile, removeFile, clearFiles } = useFileUploadManager()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      Array.from(list).forEach(file => {
        try {
          uploadFile(file)
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
    },
    [uploadFile]
  )

  const focusTextarea = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [])

  return (
    <div
      className={`gba:flex gba:flex-col gba:gap-3 ${disabled ? 'gba:opacity-50 gba:pointer-events-none' : ''} ${className || ''}`}
      data-testid="chat-input"
    >
      {/* Compact AI Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {isPrechatLoading ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
              <div className="gba:animate-spin gba:rounded-full gba:h-4 gba:w-4 gba:border-2 gba:border-primary gba:border-t-transparent" />
              <span>Loading suggestions...</span>
            </div>
          ) : (
            suggestions.map((s, idx) => {
              const label = typeof s === 'string' ? s : s.heading || s.message || ''
              const text = typeof s === 'string' ? s : s.message || s.heading || ''
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setValue(text)
                    setTimeout(() => handleSend(), 100)
                  }}
                  className="gba:group gba:w-full gba:text-left gba:text-sm gba:leading-6 gba:rounded-xl gba:border gba:border-border gba:bg-card hover:gba:bg-accent gba:px-4 gba:py-2.5 gba:transition-all hover:gba:shadow-md hover:gba:border-primary/50 gba:relative gba:overflow-hidden"
                  data-testid={`suggestion-${idx}`}
                >
                  <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-primary/5 gba:to-info/5 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                  <span className="gba:relative gba:flex gba:items-center gba:gap-2">
                    <svg
                      className="gba:h-4 gba:w-4 gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="gba:text-foreground">{label}</span>
                  </span>
                </button>
              )
            })
          )}
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
              <svg className="gba:h-4 gba:w-4 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Premium Input Container with glow */}
      <div className="gba:relative gba:group">
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-primary gba:to-info gba:rounded-2xl gba:blur-xl gba:opacity-0 group-hover:gba:opacity-20 gba:transition-opacity" />

        <div className="gba:rounded-2xl gba:border-2 gba:border-border hover:gba:border-primary/50 gba:bg-card gba:shadow-lg gba:p-3 gba:transition-all gba:relative">
          <div className="gba:flex gba:items-end gba:gap-2">
            {/* File Upload Button */}
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-10 gba:w-10 gba:rounded-xl gba:bg-muted hover:gba:bg-primary hover:gba:text-primary-foreground gba:transition-all gba:shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              disabled={disabled}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="gba:h-5 gba:w-5"
              >
                <path d="M21.44 11.05 12 20.5a6 6 0 0 1-8.49-8.49l9.19-9.19a4.5 4.5 0 0 1 6.36 6.36L9.88 18.36a3 3 0 1 1-4.24-4.24l8.49-8.49" />
              </svg>
            </Button>

            {/* Premium Textarea */}
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              className="gba:min-h-[40px] gba:max-h-48 gba:resize-none gba:bg-transparent gba:border-none focus-visible:gba:ring-0 gba:text-base placeholder:gba:text-muted-foreground/70"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={disabled}
            />

            {/* Web Search Toggle with glow */}
            <Button
              variant="ghost"
              size="sm"
              className={`gba:h-10 gba:w-10 gba:rounded-xl gba:transition-all gba:shadow-sm ${
                isSearching
                  ? 'gba:bg-gradient-to-br gba:from-success gba:to-info gba:text-primary-foreground gba:shadow-lg'
                  : 'gba:bg-muted hover:gba:bg-success hover:gba:text-primary-foreground'
              }`}
              onClick={() => setIsSearching(!isSearching)}
              aria-label="Toggle web search"
              disabled={disabled}
              title={isSearching ? 'Web search enabled' : 'Enable web search'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="gba:h-5 gba:w-5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </Button>

            {/* Clear Button */}
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-10 gba:w-10 gba:rounded-xl gba:bg-muted hover:gba:bg-destructive hover:gba:text-destructive-foreground gba:transition-all gba:shadow-sm"
              onClick={() => {
                setValue('')
                clearFiles()
                onClear()
                focusTextarea()
              }}
              aria-label="Clear session"
              disabled={disabled}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="gba:h-5 gba:w-5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Button>

            {/* Premium Send Button with gradient */}
            <Button
              variant="default"
              size="sm"
              className="gba:h-10 gba:w-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary gba:to-info hover:gba:shadow-lg gba:transition-all gba:relative gba:group"
              onClick={handleSend}
              aria-label="Send"
              disabled={disabled || (!value.trim() && files.length === 0)}
            >
              <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-xl gba:blur-md gba:opacity-0 group-hover:gba:opacity-50 gba:transition-opacity" />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="gba:h-5 gba:w-5 gba:relative gba:z-10"
              >
                <path d="m5 12 14-7-7 14-1-6-6-1Z" />
              </svg>
            </Button>
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
  )
}

export default ChatInput
