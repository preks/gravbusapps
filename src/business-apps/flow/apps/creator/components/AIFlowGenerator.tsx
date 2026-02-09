import React, { useState } from 'react'
import { Button, Textarea, Badge } from '@newwork/nw-design-system'
import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { buildFlowGenerationPrompt } from '@/common/utils/buildFlowGenerationPrompt'

interface AIFlowGeneratorProps {
  'data-testid'?: string
}

const EXAMPLE_PROMPTS = [
  'Expense approval with manager and finance review',
  'Employee onboarding with IT setup and training',
  'Document approval with multi-level sign-off',
  'Leave request with manager approval'
]

/**
 * AI-powered flow generation component - OpenAI inspired design
 */
export const AIFlowGenerator: React.FC<AIFlowGeneratorProps> = ({ 'data-testid': testId = 'ai-flow-generator' }) => {
  const [aiPrompt, setAiPrompt] = useState('')

  const handleAIGenerate = () => {
    if (!aiPrompt.trim()) return

    const prompt = buildFlowGenerationPrompt(aiPrompt.trim())
    openEveryAI({ prompt })

    // Clear the input after opening the sidebar
    setAiPrompt('')
  }

  const handleExampleClick = (example: string) => {
    setAiPrompt(example)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAIGenerate()
    }
  }

  return (
    <div
      className="gba:relative gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:overflow-hidden"
      data-testid={testId}
    >
      {/* Subtle gradient accent at top */}
      <div className="gba:h-1 gba:w-full gba:bg-gradient-to-r gba:from-primary gba:via-primary/80 gba:to-primary/60" />

      <div className="gba:p-6 gba:sm:p-8">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
          <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Sparkles className="gba:h-5 gba:w-5 gba:text-primary" />
          </div>
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-card-foreground">Describe your flow</h3>
            <p className="gba:text-sm gba:text-muted-foreground">Tell us what you need, and AI will design it</p>
          </div>
        </div>

        {/* Main Input Area */}
        <div className="gba:space-y-4">
          <div className="gba:relative">
            <Textarea
              placeholder="Create an approval flow for expense reports with manager review, finance approval, and automatic notifications when approved or rejected..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              className="gba:min-h-[140px] gba:text-base gba:resize-none gba:border-border gba:focus:border-primary gba:focus:ring-1 gba:focus:ring-primary gba:rounded-xl gba:pr-4 gba:pb-8"
              data-testid={`${testId}-ai-prompt`}
            />
            {/* Character count */}
            <div className="gba:absolute gba:bottom-3 gba:right-3 gba:text-xs gba:text-muted-foreground">
              {aiPrompt.length} / 500
            </div>
          </div>

          {/* Generate Button */}
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            <p className="gba:text-xs gba:text-muted-foreground gba:hidden gba:sm:block">
              Press{' '}
              <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-muted-foreground gba:font-mono gba:text-xs">
                ⌘
              </kbd>{' '}
              +{' '}
              <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-muted-foreground gba:font-mono gba:text-xs">
                ↵
              </kbd>{' '}
              to open AI assistant
            </p>
            <Button
              onClick={handleAIGenerate}
              disabled={!aiPrompt.trim()}
              size="lg"
              className="gba:min-w-[180px]"
              data-testid={`${testId}-ai-generate`}
            >
              Create with AI
              <ArrowRight className="gba:h-4 gba:w-4 gba:ml-2" />
            </Button>
          </div>
        </div>

        {/* Example Prompts */}
        <div className="gba:mt-6 gba:pt-6 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <Lightbulb className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:text-muted-foreground">Try an example</span>
          </div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <Badge
                key={index}
                variant="outline"
                className="gba:cursor-pointer gba:hover:bg-accent gba:hover:text-accent-foreground gba:transition-colors"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
