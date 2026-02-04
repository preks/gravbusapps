import React, { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { Monitor, Workflow, Bot, Code2, Database, LayoutTemplate, Sparkles } from 'lucide-react'
import { Button, cn } from '@newwork/nw-design-system'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import {
  HeroSection,
  ToolCard,
  AIQuickStart,
  NeuralBackground,
  ConnectionsVisualization,
  ToolCardProps
} from './features/landing'
import { OrchestratorViewConversational } from './features/orchestrator/views'

export interface NewworkCreateProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type ViewMode = 'landing' | 'orchestrator'

/**
 * NEWWORK CREATE - Premium landing page for the creation suite
 *
 * Provides unified access to all NEWWORK creation tools:
 * - Screen Builder (AI Builder)
 * - Flow
 * - Task Expert Studio
 * - Functions
 * - Data Models
 * - Templates
 *
 * Also includes AI Orchestrator for unified component building.
 */
export const NewworkCreate: React.FC<NewworkCreateProps> = ({
  accessToken,
  'data-testid': testId = 'create-workspace'
}) => {
  // Feature flag for AI features
  const isDevEnabled = useFeature<boolean>(Feature.Dev.Enabled.Key)

  // View mode state - landing page or orchestrator
  const [viewMode, setViewMode] = useState<ViewMode>('landing')
  const [orchestratorPrompt, setOrchestratorPrompt] = useState('')

  // Tool definitions
  const tools: Array<Omit<ToolCardProps, 'data-testid'> & { id: string }> = [
    {
      id: 'ai-builder',
      title: 'AI Builder',
      description:
        'Design and build UI screens with AI assistance. Create forms, dashboards, lists, and custom layouts.',
      icon: Monitor,
      href: buildPlatformUrl('/platform/ai-builder'),
      badge: 'AI-Powered',
      badgeVariant: 'info',
      accentColor: 'ai'
    },
    {
      id: 'flow',
      title: 'Flow',
      description:
        'Design automated workflows and business processes. Connect steps, define logic, and orchestrate tasks.',
      icon: Workflow,
      href: buildPlatformUrl('/platform/apps/flow/apps/creator') + '#create',
      badge: 'Popular',
      badgeVariant: 'success',
      accentColor: 'success'
    },
    {
      id: 'task-experts',
      title: 'AI Task Experts',
      description:
        'Create AI-powered task experts that automate repetitive work and assist users with complex operations.',
      icon: Bot,
      href: buildPlatformUrl('/platform/create/prompt-manager'),
      badge: 'AI-Powered',
      badgeVariant: 'info',
      accentColor: 'ai'
    },
    {
      id: 'functions',
      title: 'Functions',
      description: 'Build serverless functions and custom logic. Extend platform capabilities with your own code.',
      icon: Code2,
      href: buildPlatformUrl('/platform/create/function-manager'),
      badge: 'New',
      badgeVariant: 'success',
      accentColor: 'warning'
    },
    {
      id: 'data-models',
      title: 'Data Models',
      description: 'Define and manage data structures. Create entities, relationships, and validation rules.',
      icon: Database,
      href: buildPlatformUrl('/platform/create/data-models'),
      isComingSoon: true,
      badge: 'Coming Soon',
      accentColor: 'info'
    },
    {
      id: 'templates',
      title: 'Templates',
      description: 'Start from pre-built templates. Accelerate development with proven patterns and best practices.',
      icon: LayoutTemplate,
      href: buildPlatformUrl('/platform/create/templates'),
      isComingSoon: true,
      badge: 'Coming Soon',
      accentColor: 'primary'
    }
  ]

  // Handle AI quick start submission - now launches orchestrator
  const handleAIQuickStart = useCallback((prompt: string) => {
    // Launch the AI Orchestrator with the prompt
    setOrchestratorPrompt(prompt)
    setViewMode('orchestrator')
  }, [])

  // Handle orchestrator back button
  const handleOrchestratorBack = useCallback(() => {
    setViewMode('landing')
    setOrchestratorPrompt('')
  }, [])

  // Handle orchestrator completion
  const handleOrchestratorComplete = useCallback((success: boolean) => {
    console.log('Orchestrator completed:', success ? 'success' : 'with errors')
    // Could show a toast or notification here
  }, [])

  // Handle tool card click
  const handleToolClick = useCallback((href: string) => {
    navigateTo(href)
  }, [])

  // Render Orchestrator View
  if (viewMode === 'orchestrator') {
    return (
      <OrchestratorViewConversational
        accessToken={accessToken}
        initialPrompt={orchestratorPrompt}
        onBack={handleOrchestratorBack}
        onComplete={handleOrchestratorComplete}
        data-testid={`${testId}-orchestrator-view`}
      />
    )
  }

  // Render Landing Page
  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative" data-testid={testId}>
      {/* Neural Network Background - Subtle AI atmosphere */}
      <div className="gba:fixed gba:inset-0 gba:pointer-events-none gba:z-0 gba:overflow-hidden">
        <NeuralBackground />
      </div>

      {/* Content layer */}
      <div className="gba:relative gba:z-10">
        {/* Hero Section */}
        <HeroSection data-testid={`${testId}-hero`} />

        {/* AI Quick Start Section - Now launches orchestrator */}
        {/* Disabled when dev.enabled feature flag is false */}
        <div
          className={cn(!isDevEnabled && 'gba:opacity-50 gba:pointer-events-none gba:select-none')}
          title={!isDevEnabled ? 'AI features are not enabled in this environment' : undefined}
        >
          <AIQuickStart onSubmit={handleAIQuickStart} data-testid={`${testId}-ai-quickstart`} />

          {/* Direct Orchestrator Access Button */}
          <div className="gba:flex gba:justify-center gba:py-4">
            <Button
              variant="outline"
              onClick={() => setViewMode('orchestrator')}
              className="gba:flex gba:items-center gba:gap-2"
              disabled={!isDevEnabled}
              data-testid={`${testId}-orchestrator-button`}
            >
              <Sparkles className="gba:w-4 gba:h-4" />
              Open AI Orchestrator
            </Button>
          </div>
        </div>

        {/* Tools Grid Section */}
        <section className="gba:py-6 gba:px-6 gba:relative" data-testid={`${testId}-tools-section`}>
          {/* Subtle background */}
          <div className="gba:absolute gba:inset-0 gba:bg-background" />

          <div className="gba:relative gba:max-w-6xl gba:mx-auto">
            {/* Section header */}
            <div className="gba:text-center gba:mb-6">
              <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
                Or choose a specific tool
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
                Build individual components directly with our specialized creation tools
              </p>
            </div>

            {/* Tool cards grid */}
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
              {tools.map((tool, index) => (
                <ToolCard
                  key={tool.id}
                  {...tool}
                  onClick={() => handleToolClick(tool.href)}
                  data-testid={`${testId}-tool-${tool.id}`}
                  animationDelay={0.1 * (index + 1)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Connections Visualization Section */}
        <ConnectionsVisualization data-testid={`${testId}-connections`} />

        {/* Footer tagline */}
        <section className="gba:py-6 gba:px-6 gba:border-t gba:border-border gba:relative">
          <div className="gba:absolute gba:inset-0 gba:bg-background" />
          <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center">
            <p className="gba:text-muted-foreground">
              Part of the <span className="gba:font-semibold gba:text-foreground">NEWWORK</span> platform. Build faster,
              ship smarter.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default NewworkCreate
