/**
 * IdleCanvas - Empty state with direct input form
 * User can enter their prompt and start the build process
 */

import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Lightbulb, ArrowRight } from 'lucide-react'
import { Button, cn } from '@newwork/nw-design-system'

export interface IdleCanvasProps {
  onSubmit?: (prompt: string) => void
  isLoading?: boolean
  'data-testid'?: string
}

const examplePrompts = [
  'Build an HR dashboard to manage employee profiles and absences',
  'Create an expense tracking system with approval workflow',
  'Build a customer support ticket management system',
  'Create a project management dashboard with task tracking'
]

export const IdleCanvas: React.FC<IdleCanvasProps> = ({
  onSubmit,
  isLoading = false,
  'data-testid': testId = 'idle-canvas'
}) => {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return
    onSubmit?.(inputValue.trim())
  }

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:px-8"
      data-testid={testId}
    >
      <div className="gba:mb-8">
        <div className="gba:w-16 gba:h-16 gba:mx-auto gba:mb-4 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
          <Sparkles className="gba:w-8 gba:h-8 gba:text-foreground" />
        </div>
        <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground gba:mb-2">What would you like to build?</h2>
        <p className="gba:text-muted-foreground gba:max-w-md">
          Describe your idea below, and I'll analyze it and create a build plan with AI-generated components
        </p>
      </div>

      {/* Input Form */}
      <div className="gba:w-full gba:max-w-3xl gba:mb-8">
        <div className="gba:relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Create an HR dashboard with employee profiles, time tracking, and leave management..."
            disabled={isLoading}
            rows={3}
            className={cn(
              'gba:w-full gba:resize-none gba:rounded-2xl gba:border-2 gba:border-border',
              'gba:bg-background',
              'gba:px-6 gba:py-4 gba:text-base gba:text-foreground',
              'gba:placeholder-muted-foreground/60',
              'gba:leading-relaxed',
              'gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring/20 gba:focus:border-ring',
              'gba:disabled:opacity-50 gba:disabled:cursor-not-allowed',
              'gba:min-h-[120px] gba:max-h-[300px] gba:overflow-y-auto',
              'gba:transition-all gba:duration-200',
              'gba:shadow-sm'
            )}
            data-testid={`${testId}-input`}
          />
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <p className="gba:text-xs gba:text-muted-foreground gba:opacity-60">
            Press Enter to submit, Shift+Enter for new line
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading}
            size="lg"
            className="gba:min-w-[180px]"
            data-testid={`${testId}-submit`}
          >
            {isLoading ? (
              <>
                <span className="gba:animate-spin gba:mr-2">⏳</span>
                Analyzing...
              </>
            ) : (
              <>
                Analyze & Build
                <ArrowRight className="gba:ml-2 gba:w-4 gba:h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="gba:w-full gba:max-w-3xl">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <Lightbulb className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Try these examples:</span>
        </div>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(prompt)}
              disabled={isLoading}
              className={cn(
                'gba:p-4 gba:text-left gba:text-sm gba:text-muted-foreground gba:bg-muted gba:rounded-xl',
                'gba:border gba:border-border hover:gba:border-foreground/30 hover:gba:bg-muted/80',
                'gba:transition-all gba:duration-200',
                'gba:disabled:opacity-50 gba:disabled:cursor-not-allowed',
                'hover:gba:shadow-sm'
              )}
              data-testid={`${testId}-example-${index}`}
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IdleCanvas
