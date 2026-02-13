/**
 * ThinkingSteps - Shows AI thinking process step-by-step
 * Visual representation of analysis phases
 */

import React from 'react'
import { Check, Sparkles, Clock } from 'lucide-react'
import { Card, CardContent, Progress, cn } from '@newwork/nw-design-system'

// Keyframes for subtle scale animation and glow effects
const keyframesStyles = `
  @keyframes subtleScale {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  
  .sparkle-glow-large {
    animation: subtleScale 2s ease-in-out infinite;
    stroke-width: 1.5;
    filter: drop-shadow(0 0 4px hsl(var(--info) / 0.5)) drop-shadow(0 0 8px hsl(var(--info) / 0.3));
  }
  
  .sparkle-glow-small {
    animation: subtleScale 2s ease-in-out infinite;
    stroke-width: 1.5;
    filter: drop-shadow(0 0 3px hsl(var(--info) / 0.4));
  }
`

export interface ThinkingStep {
  id: string
  title: string
  detail: string
  status: 'pending' | 'active' | 'complete'
  duration?: number
}

export interface ThinkingStepsProps {
  steps: ThinkingStep[]
  currentStep?: string
  progress: number
  phaseMessage?: string
  className?: string
  'data-testid'?: string
}

export const ThinkingSteps: React.FC<ThinkingStepsProps> = ({
  steps,
  currentStep,
  progress,
  phaseMessage,
  className,
  'data-testid': testId = 'thinking-steps'
}) => {
  return (
    <>
      <style>{keyframesStyles}</style>
      <Card className={cn('gba:overflow-hidden', className)} data-testid={testId}>
        <CardContent className="gba:p-6">
          {/* Animated AI brain visual - Blue sparkle */}
          <div className="gba:flex gba:flex-col gba:items-center gba:mb-6">
            <div className="gba:relative gba:w-20 gba:h-20 gba:mb-4">
              {/* Outer pulsing ring */}
              <div className="gba:absolute gba:inset-0 gba:rounded-full gba:bg-foreground/10 gba:animate-ping"></div>
              {/* Middle ring */}
              <div className="gba:absolute gba:inset-2 gba:rounded-full gba:bg-foreground/15 gba:animate-pulse"></div>
              {/* Sparkle icon centered */}
              <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
                <Sparkles className="sparkle-glow-large gba:w-9 gba:h-9 gba:text-info" />
              </div>
            </div>

            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Analyzing your request...</h3>
            <p className="gba:text-sm gba:text-muted-foreground">{phaseMessage || 'Planning the perfect solution'}</p>
          </div>

          {/* Thinking steps list - Minimal and monochrome */}
          <div className="gba:space-y-2 gba:mb-6">
            {steps.map(step => {
              const isActive = step.status === 'active' || step.id === currentStep
              const isComplete = step.status === 'complete'
              const isPending = step.status === 'pending' && !isActive && !isComplete

              return (
                <div
                  key={step.id}
                  className={cn(
                    'gba:flex gba:items-start gba:gap-3 gba:py-2 gba:px-0 gba:transition-all gba:duration-300',
                    isPending && 'gba:opacity-40'
                  )}
                >
                  {/* Status icon */}
                  <div className="gba:mt-0.5 gba:shrink-0">
                    {isComplete && <Check className="gba:w-4 gba:h-4 gba:text-foreground" />}
                    {isActive && <Sparkles className="sparkle-glow-small gba:w-4 gba:h-4 gba:text-info" />}
                    {isPending && <Clock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />}
                  </div>

                  {/* Step content */}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                      <h4 className="gba:font-medium gba:text-sm gba:text-foreground">{step.title}</h4>
                      {step.duration && isComplete && (
                        <span className="gba:text-xs gba:text-muted-foreground gba:font-mono">{step.duration}ms</span>
                      )}
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="gba:space-y-2">
            <Progress value={progress} className="gba:h-2" />
            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
              <span>Analysis progress</span>
              <span className="gba:font-semibold">{Math.round(progress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default ThinkingSteps
