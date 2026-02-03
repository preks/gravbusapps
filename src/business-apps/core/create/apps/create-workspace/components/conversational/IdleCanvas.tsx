/**
 * IdleCanvas - Empty state shown when no conversation started
 */

import React from 'react'
import { Sparkles, Lightbulb } from 'lucide-react'

export interface IdleCanvasProps {
  'data-testid'?: string
}

const examplePrompts = [
  'Build an HR dashboard to manage employee profiles and absences',
  'Create an expense tracking system with approval workflow',
  'Build a customer support ticket management system',
  'Create a project management dashboard with task tracking'
]

export const IdleCanvas: React.FC<IdleCanvasProps> = ({ 'data-testid': testId = 'idle-canvas' }) => {
  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center"
      data-testid={testId}
    >
      <div className="gba:mb-8">
        <div className="gba:w-16 gba:h-16 gba:mx-auto gba:mb-4 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
          <Sparkles className="gba:w-8 gba:h-8 gba:text-foreground" />
        </div>
        <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground gba:mb-2">What would you like to build?</h2>
        <p className="gba:text-muted-foreground gba:max-w-md">
          Describe your idea in the chat, and I'll help you build it with AI-generated components
        </p>
      </div>

      {/* Example Prompts */}
      <div className="gba:w-full gba:max-w-2xl">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
          <Lightbulb className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Example prompts:</span>
        </div>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3">
          {examplePrompts.map((prompt, index) => (
            <div
              key={index}
              className="gba:p-3 gba:text-left gba:text-sm gba:text-muted-foreground gba:bg-muted gba:rounded-lg gba:border gba:border-border hover:gba:border-foreground/20 gba:transition-colors"
            >
              "{prompt}"
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IdleCanvas
