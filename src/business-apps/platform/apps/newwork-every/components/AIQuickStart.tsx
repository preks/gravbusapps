import React, { useState, useCallback } from 'react'
import { AiButton, Textarea } from '@newwork/nw-design-system'
import { Sparkles, Send } from 'lucide-react'

interface AIQuickStartProps {
  onSubmit: (prompt: string) => void
  'data-testid'?: string
}

export const AIQuickStart: React.FC<AIQuickStartProps> = ({
  onSubmit,
  'data-testid': testId = 'newwork-every-ai-quickstart'
}) => {
  const [prompt, setPrompt] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback(() => {
    if (prompt.trim()) {
      onSubmit(prompt.trim())
      setPrompt('')
    }
  }, [prompt, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const examplePrompts = [
    'What meetings do I have today?',
    'Show my pending approvals',
    'Create a new document',
    'Search the intranet for policies'
  ]

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
    >
      {/* Background gradient */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-success/5 gba:via-background gba:to-background" />

      <div className="gba:relative gba:max-w-3xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:text-center gba:mb-4">
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-success gba:mb-3">
            <Sparkles className="gba:h-5 gba:w-5" />
            <span className="gba:text-sm gba:font-medium gba:uppercase gba:tracking-wider">AI Quick Start</span>
          </div>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
            What would you like to do?
          </h2>
          <p className="gba:text-muted-foreground">Ask anything about your day, documents, or work tasks</p>
        </div>

        {/* Input area */}
        <div
          className={`gba:relative gba:rounded-xl gba:border gba:transition-all gba:duration-300 ${
            isFocused
              ? 'gba:border-success gba:shadow-lg gba:shadow-success/10'
              : 'gba:border-border gba:hover:border-success/50'
          }`}
        >
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask EveryAI anything..."
            className="gba:min-h-[100px] gba:resize-none gba:border-0 gba:focus:ring-0 gba:bg-transparent gba:pr-14"
            data-testid={`${testId}-input`}
          />

          {/* Submit button */}
          <div className="gba:absolute gba:bottom-3 gba:right-3">
            <AiButton onClick={handleSubmit} disabled={!prompt.trim()} size="sm" data-testid={`${testId}-submit`}>
              <Send className="gba:h-4 gba:w-4" />
            </AiButton>
          </div>
        </div>

        {/* Example prompts */}
        <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-2 gba:justify-center">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example)}
              className="gba:text-xs gba:px-3 gba:py-1.5 gba:rounded-full gba:bg-muted/50 gba:text-muted-foreground gba:hover:bg-success/10 gba:hover:text-success gba:transition-colors gba:border gba:border-transparent gba:hover:border-success/20"
              data-testid={`${testId}-example-${index}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
