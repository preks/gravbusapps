import React, { useState } from 'react'
import { AiButton, Textarea } from '@newwork/nw-design-system'
import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react'

export interface AIQuickStartProps {
  onSubmit?: (prompt: string) => void
  'data-testid'?: string
}

const EXAMPLE_PROMPTS = [
  'Create a lead management screen with filters and charts',
  'Build a flow for expense approval with 3 levels',
  'Design a task expert that helps with customer onboarding',
  'Create a serverless function for data validation'
]

/**
 * AIQuickStart - Natural language input for AI-powered creation
 * Allows users to describe what they want to build and routes to the appropriate tool
 */
export const AIQuickStart: React.FC<AIQuickStartProps> = ({
  onSubmit,
  'data-testid': testId = 'create-workspace-ai-quickstart'
}) => {
  const [prompt, setPrompt] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = () => {
    if (prompt.trim() && onSubmit) {
      onSubmit(prompt.trim())
    }
  }

  const handleExampleClick = (example: string) => {
    setPrompt(example)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
    >
      {/* Background that transitions from hero gradient to neutral */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-primary/5 gba:via-background gba:to-background" />

      <div className="gba:relative gba:max-w-3xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:text-center gba:mb-4">
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-ai gba:mb-3">
            <Sparkles className="gba:h-5 gba:w-5" />
            <span className="gba:text-sm gba:font-medium gba:uppercase gba:tracking-wider">AI Quick Start</span>
          </div>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-3">
            Describe what you want to create
          </h2>
          <p className="gba:text-muted-foreground">Tell us in plain language and we will guide you to the right tool</p>
        </div>

        {/* Input area */}
        <div
          className={`gba:relative gba:rounded-2xl gba:border gba:bg-card gba:transition-all gba:duration-300 ${isFocused ? 'gba:border-ai gba:ring-4 gba:ring-ai/10' : 'gba:border-border'}`}
        >
          {/* Gradient border effect when focused */}
          {isFocused && (
            <div
              className="gba:absolute gba:-inset-px gba:rounded-2xl gba:bg-gradient-to-r gba:from-ai gba:via-primary gba:to-ai gba:opacity-20 gba:-z-10"
              style={{ animation: 'gradient-shift 3s ease infinite', backgroundSize: '200% 200%' }}
            />
          )}

          <div className="gba:p-4">
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Create a dashboard for tracking sales performance with charts and KPIs..."
              className="gba:min-h-[120px] gba:border-0 gba:bg-transparent gba:resize-none gba:text-base focus:gba:ring-0 focus:gba:outline-none"
              data-testid={`${testId}-input`}
            />

            <div className="gba:flex gba:items-center gba:justify-between gba:pt-3 gba:border-t gba:border-border">
              <div className="gba:text-xs gba:text-muted-foreground">Press Enter to submit</div>
              <AiButton onClick={handleSubmit} disabled={!prompt.trim()} data-testid={`${testId}-submit`}>
                <span>Create with AI</span>
                <ArrowRight className="gba:h-4 gba:w-4 gba:ml-2" />
              </AiButton>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div className="gba:mt-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:mb-3">
            <Lightbulb className="gba:h-4 gba:w-4" />
            <span className="gba:text-sm">Try one of these examples:</span>
          </div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="gba:px-3 gba:py-1.5 gba:text-sm gba:rounded-full gba:border gba:border-border gba:bg-muted/50 gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground hover:gba:border-border gba:transition-all gba:duration-200"
                data-testid={`${testId}-example-${index}`}
              >
                {example.length > 50 ? `${example.substring(0, 50)}...` : example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AIQuickStart
