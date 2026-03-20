/**
 * IdleCanvas - Full-screen entry point for CREATE.
 * Hero banner matches AI Builder style: large centered icon, title, feature chips, subtitle.
 * Uses the same space hero video background.
 */

import React, { useRef, useState } from 'react'
import {
  Users,
  Receipt,
  MessageSquare,
  FolderKanban,
  Package,
  ArrowRight,
  Blocks,
  Loader2,
  History,
  Upload
} from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import { AppIconBadge } from '../ui/AppIconBadge'
import type { BuildPlan } from '../../types'

const gradientBorderStyles = `
  @property --idle-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }

  @keyframes idle-border-spin {
    to { --idle-angle: 360deg; }
  }

  .idle-gradient-border {
    position: relative;
    border-radius: 0.75rem;
  }

  .idle-gradient-border::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.35);
    pointer-events: none;
    z-index: 2;
  }

  .idle-gradient-border::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: calc(0.75rem + 1px);
    padding: 1px;
    background: conic-gradient(
      from var(--idle-angle),
      transparent 0%,
      transparent 40%,
      #818cf8 55%,
      #a78bfa 62%,
      #c4b5fd 66%,
      #a78bfa 70%,
      #818cf8 76%,
      transparent 88%,
      transparent 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: idle-border-spin 6s linear infinite;
    pointer-events: none;
    z-index: 3;
  }
`

export interface IdleCanvasProps {
  onSubmit?: (prompt: string) => void
  onOpenHistory?: () => void
  onSelectSession?: (jobId: string) => void
  recentPlans?: BuildPlan[]
  onImportFolderAsNewApp?: (files: File[]) => void | Promise<void>
  isImportingFolderAsNewApp?: boolean
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
  onOpenHistory,
  onSelectSession,
  recentPlans,
  onImportFolderAsNewApp,
  isImportingFolderAsNewApp = false,
  isLoading = false,
  'data-testid': testId = 'idle-canvas'
}) => {
  const [inputValue, setInputValue] = useState('')
  const importFolderInputRef = useRef<HTMLInputElement>(null)

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

  const handleImportFolderClick = () => {
    if (!onImportFolderAsNewApp || isImportingFolderAsNewApp || isLoading) return
    importFolderInputRef.current?.click()
  }

  const handleFolderSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (!onImportFolderAsNewApp || selectedFiles.length === 0) return
    await onImportFolderAsNewApp(selectedFiles)
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto" data-testid={testId}>
      {/* Hero Banner */}
      <section className="gba:relative gba:overflow-hidden gba:shrink-0 gba:min-h-80" data-testid={`${testId}-hero`}>
        <PremiumHeroBackground data-testid={`${testId}-hero-background`} />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

        {/* Centered hero content */}
        <div className="gba:relative gba:py-12 gba:px-6 gba:max-w-4xl gba:mx-auto gba:text-center">
          {/* Icon + wordmark */}
          <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2 gba:mb-6">
            <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-white/10 gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center">
              <Blocks className="gba:w-8 gba:h-8 gba:text-white" strokeWidth={1.25} />
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
      <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-start gba:px-8 gba:pt-6 gba:pb-4 gba:overflow-y-auto">
        <style>{gradientBorderStyles}</style>
        <div className="gba:w-full gba:max-w-2xl gba:flex gba:flex-col gba:items-center gba:gap-4">
          {/* Input card with button inside */}
          <div className="idle-gradient-border gba:w-full">
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your application idea... e.g., Create an HR dashboard with employee profiles, time tracking, and leave management"
              disabled={isLoading}
              rows={4}
              className="gba:w-full gba:resize-none gba:min-h-24 gba:rounded-t-xl gba:bg-muted/40 gba:px-4 gba:pt-3 gba:pb-2 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground/50 gba:leading-relaxed gba:transition-colors gba:duration-200 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed gba:block"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
              data-testid={`${testId}-input`}
            />
            {/* Toolbar row inside the card */}
            <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:bg-muted/40 gba:rounded-b-xl">
              <div className="gba:flex gba:items-center gba:gap-2">
                {onOpenHistory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenHistory}
                    className="gba:h-7 gba:w-7 gba:text-muted-foreground/60 gba:hover:text-foreground"
                    data-testid={`${testId}-history-btn`}
                  >
                    <History className="gba:w-3.5 gba:h-3.5" />
                  </Button>
                )}
                <span className="gba:text-[10px] gba:text-muted-foreground/50">
                  Enter to submit, Shift+Enter for new line
                </span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="gba:gap-1.5 gba:rounded-xl gba:bg-linear-to-r gba:from-sky-500 gba:to-indigo-600 gba:text-white gba:border-0 gba:px-4 gba:font-semibold gba:hover:opacity-90 gba:text-xs"
                data-testid={`${testId}-submit`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze & Build
                    <ArrowRight className="gba:w-3.5 gba:h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Example suggestions */}
          <div className="gba:w-full gba:space-y-3 gba:mt-4">
            <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground/50 gba:uppercase gba:tracking-wider">
              Or try an example
            </span>
            <div className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-2">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                  disabled={isLoading}
                  className="gba:flex gba:items-center gba:gap-1.5 gba:py-1.5 gba:bg-transparent gba:text-muted-foreground hover:gba:text-primary gba:transition-colors gba:duration-200 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed"
                  data-testid={`${testId}-suggestion-${suggestion.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <suggestion.icon className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
                  <span className="gba:text-[11px] gba:font-medium">{suggestion.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Import as new app */}
          {onImportFolderAsNewApp && (
            <div className="gba:w-full gba:mt-6 gba:space-y-2">
              <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground/50">OR</p>
              <div className="gba:flex gba:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportFolderClick}
                  disabled={isImportingFolderAsNewApp || isLoading}
                  className="gba:gap-1.5"
                  data-testid={`${testId}-import-new-app`}
                >
                  <Upload className="gba:w-3.5 gba:h-3.5" />
                  {isImportingFolderAsNewApp ? 'Importing Folder...' : 'Import Folder as New App'}
                </Button>
              </div>
              <input
                ref={importFolderInputRef}
                type="file"
                multiple
                onChange={handleFolderSelected}
                className="gba:hidden"
                {...({ webkitdirectory: 'true', directory: 'true' } as Record<string, string>)}
              />
            </div>
          )}

          {/* Recent apps grid */}
          {recentPlans && recentPlans.length > 0 && (
            <div className="gba:w-full gba:mt-6">
              <span className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                Recent Apps
              </span>
              <div className="gba:grid gba:grid-cols-8 gba:gap-x-4 gba:gap-y-4 gba:justify-items-center gba:mt-4">
                {recentPlans.slice(0, 15).map(plan => {
                  const name = plan.appMetadata?.name ?? plan.userSummary?.title ?? 'Untitled'
                  return (
                    <button
                      key={plan.jobId}
                      onClick={() => onSelectSession?.(plan.jobId)}
                      disabled={isLoading}
                      className="gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:bg-transparent gba:group gba:disabled:opacity-50 gba:disabled:cursor-not-allowed gba:w-full"
                      data-testid={`${testId}-recent-${plan.jobId}`}
                    >
                      <div className="gba:transition-transform gba:duration-200 gba:group-hover:scale-105">
                        <AppIconBadge
                          iconName={plan.appMetadata?.icon}
                          size="lg"
                          className="gba:w-12 gba:h-12 gba:rounded-xl"
                        />
                      </div>
                      <span className="gba:text-[9px] gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors gba:duration-200 gba:text-center gba:leading-tight gba:max-w-full gba:truncate gba:w-full">
                        {name}
                      </span>
                    </button>
                  )
                })}
                {/* History button — last slot in the grid */}
                {onOpenHistory && (
                  <button
                    onClick={onOpenHistory}
                    className="gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:bg-transparent gba:group gba:w-full"
                    data-testid={`${testId}-history-grid-btn`}
                  >
                    <div className="gba:transition-transform gba:duration-200 gba:group-hover:scale-105 gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted gba:flex gba:items-center gba:justify-center gba:border gba:border-border/50">
                      <History className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors gba:duration-200" />
                    </div>
                    <span className="gba:text-[9px] gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors gba:duration-200 gba:text-center gba:leading-tight">
                      History
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IdleCanvas
