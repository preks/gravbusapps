import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  Monitor,
  Workflow,
  Bot,
  Code2,
  Database,
  LayoutTemplate,
  Sparkles,
  BarChart3,
  Cable,
  GitBranch
} from 'lucide-react'
import { Button, cn, useTranslation } from '@newwork/nw-design-system'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import translations from './_i18n'
import {
  HeroSection,
  ToolCard,
  AIQuickStart,
  NeuralBackground,
  ConnectionsVisualization,
  ToolCardProps
} from './features/landing'

export interface NewworkCreateProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * NEWWORK CREATE - Premium landing page for the creation suite
 *
 * Provides unified access to all NEWWORK creation tools:
 * - Screen Builder
 * - Flow
 * - Task Expert Studio
 * - Functions
 * - Data Models
 * - Templates
 *
 * Also includes AI Orchestrator for unified component building.
 */
const AI_ORCHESTRATOR_URL = '/platform/create/ai-builder'

export const NewworkCreate: React.FC<NewworkCreateProps> = ({ 'data-testid': testId = 'create-workspace' }) => {
  const { t } = useTranslation(translations)
  // Feature flag for AI features
  const isDevEnabled = useFeature<boolean>(Feature.Dev.Enabled.Key)

  // Tool definitions
  const tools: Array<Omit<ToolCardProps, 'data-testid'> & { id: string }> = [
    {
      id: 'ai-builder',
      title: 'Screen Builder',
      description:
        'Design and build UI screens with Screen Builder. Create forms, dashboards, lists, and custom layouts.',
      icon: Monitor,
      href: buildPlatformUrl('/platform/create/screen-builder'),
      badge: 'AI-Powered',
      badgeVariant: 'info',
      accentColor: 'ai'
    },
    {
      id: 'ai-builder-metrics',
      title: 'AI Builder Metrics',
      description: 'Track LLM token usage, model distribution, and session-level consumption for AI Builder.',
      icon: BarChart3,
      href: buildPlatformUrl('/platform/create/ai-builder-metrics'),
      badge: 'Ops',
      badgeVariant: 'warning',
      accentColor: 'info'
    },
    {
      id: 'ai-builder-admin',
      title: 'AI Builder Admin',
      description: 'Visualize AI Builder orchestration states and inspect jobs by lifecycle state.',
      icon: GitBranch,
      href: buildPlatformUrl('/platform/create/ai-builder-admin'),
      badge: 'Admin',
      badgeVariant: 'warning',
      accentColor: 'warning'
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
      title: t('card-enterprise-agents-title'),
      description: t('card-enterprise-agents-description'),
      icon: Bot,
      href: buildPlatformUrl('/platform/create/prompt-manager'),
      badge: 'AI-Powered',
      badgeVariant: 'info',
      accentColor: 'ai'
    },
    {
      id: 'connect',
      title: 'NEWWORK CONNECT',
      description:
        'Manage AnyPoint, DataBridge, and MCP connections in one product surface and reuse them across experts, tools, functions, and imports.',
      icon: Cable,
      href: buildPlatformUrl('/platform/create/connect'),
      badge: 'Unified',
      badgeVariant: 'info',
      accentColor: 'primary'
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

  // Handle AI quick start submission - open AI Orchestrator app with prompt
  const handleAIQuickStart = useCallback((prompt: string) => {
    const params = new URLSearchParams({ plan: 'new' })
    if (prompt.trim()) params.set('prompt', prompt.trim())
    navigateTo(buildPlatformUrl(`${AI_ORCHESTRATOR_URL}?${params.toString()}`))
  }, [])

  // Handle tool card click
  const handleToolClick = useCallback((href: string) => {
    navigateTo(href)
  }, [])

  // Open AI Orchestrator app (standalone)
  const handleOpenOrchestrator = useCallback(() => {
    navigateTo(buildPlatformUrl(`${AI_ORCHESTRATOR_URL}?plan=new`))
  }, [])

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
              onClick={handleOpenOrchestrator}
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
