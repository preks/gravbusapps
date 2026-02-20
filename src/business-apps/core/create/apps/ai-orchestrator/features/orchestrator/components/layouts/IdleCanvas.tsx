/**
 * IdleCanvas - Nexus-style empty state with hero banner and card grid
 * User can select from example prompts or start building with custom input.
 * Hero uses same animated video as Nexus (replicated here, no change to shared SpaceHeroBackground).
 */

import React, { useState, useRef, useEffect } from 'react'
import { Users, Receipt, MessageSquare, FolderKanban, Package, ArrowRight } from 'lucide-react'
import { Button, Textarea } from '@newwork/nw-design-system'

/** Nexus-style space hero video (same asset as Nexus banner). */
const CREATE_HERO_VIDEO_URL =
  'https://nwcdndevfiles.blob.core.windows.net/screens/assets/space-hero-background.mp4?sp=racwdl&st=2025-05-21T06:11:03Z&se=2099-01-01T11:00:00Z&spr=https&sv=2024-11-04&sr=c&sig=LhG406gAATrx10dvPep6qiZvo5tsGMJ%2FpLWqkmrnn1U%3D'

export interface IdleCanvasProps {
  onSubmit?: (prompt: string) => void
  isLoading?: boolean
  'data-testid'?: string
}

interface Suggestion {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  prompt: string
}

const suggestions: Suggestion[] = [
  {
    icon: Users,
    title: 'HR Dashboard',
    description: 'Build an employee management system with profiles, absences, and org charts',
    prompt: 'Build an HR dashboard to manage employee profiles and absences'
  },
  {
    icon: Receipt,
    title: 'Expense Tracker',
    description: 'Create an expense tracking system with approval workflow and reports',
    prompt: 'Create an expense tracking system with approval workflow'
  },
  {
    icon: MessageSquare,
    title: 'Support Tickets',
    description: 'Build a customer support ticket system with assignment and tracking',
    prompt: 'Build a customer support ticket management system'
  },
  {
    icon: FolderKanban,
    title: 'Project Manager',
    description: 'Create a project management dashboard with tasks, milestones, and team collaboration',
    prompt: 'Create a project management dashboard with task tracking'
  },
  {
    icon: Package,
    title: 'Inventory System',
    description: 'Build an inventory management system with stock tracking and alerts',
    prompt: 'Build an inventory management system with stock tracking and alerts'
  }
]

export const IdleCanvas: React.FC<IdleCanvasProps> = ({
  onSubmit,
  isLoading = false,
  'data-testid': testId = 'idle-canvas'
}) => {
  const [inputValue, setInputValue] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

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
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto " data-testid={testId}>
      {/* Hero Banner - square top corners, Nexus-style video background */}
      <div className="gba:relative gba:overflow-hidden gba:shrink-0 gba:rounded-t-none">
        <video
          ref={videoRef}
          src={CREATE_HERO_VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
          tabIndex={-1}
          className="gba:absolute gba:inset-0 gba:pointer-events-none gba:w-full gba:h-full gba:object-cover"
          aria-hidden="true"
          data-testid={`${testId}-hero-video`}
        />

        {/* Dark overlay for readability (design tokens) */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none gba:bg-linear-to-br gba:from-foreground/40 gba:via-foreground/15 gba:to-transparent"
          aria-hidden
        />

        {/* Hero content */}
        <div className="gba:relative gba:px-8 gba:py-8">
          <div className="gba:mb-3">
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
              NEWWORK
            </span>
          </div>
          <h1
            className="gba:font-funnel-display gba:text-4xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-2"
            data-testid={`${testId}-title`}
          >
            CREATE
          </h1>
          <p className="gba:text-sm gba:text-white/60 gba:max-w-lg">
            AI-powered application builder. Describe your idea and I'll generate a complete build plan with screens,
            data models, and workflows.
          </p>
        </div>
      </div>

      {/* Main content - Centered chat input (prominent) */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-8 gba:py-10">
        <div className="gba:w-full gba:max-w-3xl gba:flex gba:flex-col gba:items-center">
          {/* Main prompt input - larger height, centred, thin primary border */}
          <div className="gba:w-full gba:space-y-3">
            <div className="gba:relative">
              <Textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your application idea... e.g., Create an HR dashboard with employee profiles, time tracking, and leave management"
                disabled={isLoading}
                rows={6}
                className="gba:w-full gba:min-h-32 gba:resize-y gba:rounded-xl gba:border gba:border-primary gba:bg-muted/40 gba:px-4 gba:py-3 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground/50 gba:leading-relaxed gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-primary/20 gba:focus:border-primary gba:disabled:opacity-50 gba:disabled:cursor-not-allowed gba:transition-all gba:duration-200"
                data-testid={`${testId}-input`}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <p className="gba:text-xs gba:text-muted-foreground/60">
                Press Enter to submit, Shift+Enter for new line
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                size="default"
                data-testid={`${testId}-submit`}
              >
                {isLoading ? (
                  <>
                    <span className="gba:animate-spin gba:mr-2">⏳</span>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze & Build</span>
                    <ArrowRight className="gba:ml-2 gba:w-4 gba:h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Examples - smaller, no card background, pushed down */}
          <div className="gba:mt-14 gba:w-full gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
              <div className="gba:h-px gba:flex-1 gba:bg-border"></div>
              <span className="gba:text-[11px] gba:text-muted-foreground/50">Or try an example</span>
              <div className="gba:h-px gba:flex-1 gba:bg-border"></div>
            </div>

            <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-x-4 gba:gap-y-1">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                  disabled={isLoading}
                  className="gba:flex gba:items-center gba:gap-1.5 gba:py-1.5 gba:px-0 gba:text-left gba:bg-transparent gba:text-muted-foreground hover:gba:text-primary gba:transition-colors gba:duration-200 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed gba:group"
                  data-testid={`${testId}-suggestion-${suggestion.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <suggestion.icon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:group-hover:text-primary gba:transition-colors" />
                  <span className="gba:text-[11px] gba:font-medium gba:text-inherit">{suggestion.title}</span>
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
