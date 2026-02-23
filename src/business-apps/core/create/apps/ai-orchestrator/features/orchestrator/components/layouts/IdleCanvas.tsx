/**
 * IdleCanvas - Full-screen entry point for CREATE.
 * Hero banner matches AI Builder style: large centered icon, title, feature chips, subtitle.
 * Uses the same space hero video background.
 */

import React, { useState } from 'react'
import { Users, Receipt, MessageSquare, FolderKanban, Package, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'

const HERO_VIDEO_URL = import.meta.env?.VITE_SPACE_HERO_VIDEO_URL || ''

export interface IdleCanvasProps {
  onSubmit?: (prompt: string) => void
  isLoading?: boolean
  'data-testid'?: string
}

interface Suggestion {
  icon: React.ComponentType<{ className?: string }>
  title: string
  prompt: string
}

const suggestions: Suggestion[] = [
  { icon: Users, title: 'HR Dashboard', prompt: 'Build an HR dashboard to manage employee profiles and absences' },
  {
    icon: Receipt,
    title: 'Expense Tracker',
    prompt: 'Create an expense tracking system with approval workflow'
  },
  {
    icon: MessageSquare,
    title: 'Support Tickets',
    prompt: 'Build a customer support ticket management system'
  },
  {
    icon: FolderKanban,
    title: 'Project Manager',
    prompt: 'Create a project management dashboard with task tracking'
  },
  {
    icon: Package,
    title: 'Inventory System',
    prompt: 'Build an inventory management system with stock tracking and alerts'
  }
]

export const IdleCanvas: React.FC<IdleCanvasProps> = ({
  onSubmit,
  isLoading = false,
  'data-testid': testId = 'idle-canvas'
}) => {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return
    onSubmit?.(inputValue.trim())
  }

  const handleSuggestionClick = (prompt: string) => {
    if (isLoading) return
    setInputValue(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto" data-testid={testId}>
      {/* Hero Banner */}
      <section className="gba:relative gba:overflow-hidden gba:shrink-0 gba:min-h-80" data-testid={`${testId}-hero`}>
        {/* Background */}
        {HERO_VIDEO_URL ? (
          <video
            src={HERO_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
            aria-hidden="true"
            data-testid={`${testId}-hero-video`}
          />
        ) : (
          <SpaceHeroBackground />
        )}

        {/* Overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none gba:bg-linear-to-br gba:from-foreground/40 gba:via-foreground/10 gba:to-transparent"
          aria-hidden
        />

        {/* Centered hero content */}
        <div className="gba:relative gba:py-12 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
          {/* Icon + wordmark */}
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2 gba:mb-6">
            <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-white/10 gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center">
              <Sparkles className="gba:w-8 gba:h-8 gba:text-white" />
            </div>
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase gba:mt-2">
              NEWWORK
            </span>
            <h1
              className="gba:font-funnel-display gba:text-5xl gba:font-semibold gba:text-white gba:tracking-tight"
              data-testid={`${testId}-title`}
            >
              CREATE
            </h1>
          </div>

          {/* Feature chips */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:mb-5">
            {['Build Plans', 'AI-Powered', 'Full Stack'].map(chip => (
              <span
                key={chip}
                className="gba:inline-flex gba:items-center gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/10 gba:text-white/90 gba:text-xs gba:font-medium gba:border gba:border-white/20"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Headline + subtitle */}
          <h2 className="gba:text-2xl gba:font-semibold gba:tracking-tight gba:text-white gba:mb-3">
            Build apps. <span className="gba:text-white/80">Powered by AI.</span>
          </h2>
          <p className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed">
            Describe your idea and I'll generate a complete build plan with screens, data models, and workflows.
          </p>
        </div>
      </section>

      {/* Prompt input area */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-8 gba:py-10">
        <div className="gba:w-full gba:max-w-2xl gba:flex gba:flex-col gba:items-center gba:space-y-3">
          <Textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your application idea... e.g., Create an HR dashboard with employee profiles, time tracking, and leave management"
            disabled={isLoading}
            rows={6}
            className="gba:w-full gba:resize-y gba:min-h-36 gba:rounded-xl gba:border gba:border-primary gba:bg-muted/40 gba:px-4 gba:py-3 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground/50 gba:leading-relaxed gba:transition-all gba:duration-200 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed"
            data-testid={`${testId}-input`}
          />

          <div className="gba:w-full gba:flex gba:items-center gba:justify-between">
            <p className="gba:text-xs gba:text-muted-foreground/60">Press Enter to submit, Shift+Enter for new line</p>
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading}
              className="gba:gap-2 gba:rounded-2xl gba:bg-linear-to-r gba:from-sky-500 gba:to-indigo-600 gba:text-white gba:border-0 gba:px-5 gba:font-semibold gba:hover:opacity-90"
              data-testid={`${testId}-submit`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze & Build
                  <ArrowRight className="gba:w-4 gba:h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Example suggestions */}
          <div className="gba:mt-8 gba:w-full gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:h-px gba:flex-1 gba:bg-border" />
              <span className="gba:text-[11px] gba:text-muted-foreground/50">Or try an example</span>
              <div className="gba:h-px gba:flex-1 gba:bg-border" />
            </div>
            <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-x-4 gba:gap-y-1">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                  disabled={isLoading}
                  className="gba:flex gba:items-center gba:gap-1.5 gba:py-1.5 gba:bg-transparent gba:text-muted-foreground hover:gba:text-primary gba:transition-colors gba:duration-200 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed gba:group"
                  data-testid={`${testId}-suggestion-${suggestion.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <suggestion.icon className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
                  <span className="gba:text-[11px] gba:font-medium">{suggestion.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IdleCanvas
