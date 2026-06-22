import React, { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
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
  const tools: Array<Omit<ToolCardProps, 'data-testid'> & { id: string }> = useMemo(
    () => [
      {
        id: 'ai-builder',
        title: t('tool-screen-builder-title'),
        description: t('tool-screen-builder-description'),
        icon: Monitor,
        href: buildPlatformUrl('/platform/create/screen-builder'),
        badge: t('tool-badge-ai-powered'),
        badgeVariant: 'info',
        accentColor: 'ai'
      },
      {
        id: 'ai-builder-metrics',
        title: t('tool-ai-builder-metrics-title'),
        description: t('tool-ai-builder-metrics-description'),
        icon: BarChart3,
        href: buildPlatformUrl('/platform/create/ai-builder-metrics'),
        badge: t('tool-badge-ops'),
        badgeVariant: 'warning',
        accentColor: 'info'
      },
      {
        id: 'ai-builder-admin',
        title: t('tool-ai-builder-admin-title'),
        description: t('tool-ai-builder-admin-description'),
        icon: GitBranch,
        href: buildPlatformUrl('/platform/create/ai-builder-admin'),
        badge: t('tool-badge-admin'),
        badgeVariant: 'warning',
        accentColor: 'warning'
      },
      {
        id: 'flow',
        title: t('tool-flow-title'),
        description: t('tool-flow-description'),
        icon: Workflow,
        href: `${buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR)}#create`,
        badge: t('tool-badge-popular'),
        badgeVariant: 'success',
        accentColor: 'success'
      },
      {
        id: 'task-experts',
        title: t('card-enterprise-agents-title'),
        description: t('card-enterprise-agents-description'),
        icon: Bot,
        href: buildPlatformUrl('/platform/create/prompt-manager'),
        badge: t('tool-badge-ai-powered'),
        badgeVariant: 'info',
        accentColor: 'ai'
      },
      {
        id: 'connect',
        title: t('tool-connect-title'),
        description: t('tool-connect-description'),
        icon: Cable,
        href: buildPlatformUrl('/platform/create/connect'),
        badge: t('tool-badge-unified'),
        badgeVariant: 'info',
        accentColor: 'primary'
      },
      {
        id: 'functions',
        title: t('tool-functions-title'),
        description: t('tool-functions-description'),
        icon: Code2,
        href: buildPlatformUrl('/platform/create/function-manager'),
        badge: t('tool-badge-new'),
        badgeVariant: 'success',
        accentColor: 'warning'
      },
      {
        id: 'data-models',
        title: t('tool-data-models-title'),
        description: t('tool-data-models-description'),
        icon: Database,
        href: buildPlatformUrl(Navigation.CREATE_CUSTOM_DATA_MANAGER),
        isComingSoon: true,
        badge: t('tool-badge-coming-soon'),
        accentColor: 'info'
      },
      {
        id: 'templates',
        title: t('tool-templates-title'),
        description: t('tool-templates-description'),
        icon: LayoutTemplate,
        href: buildPlatformUrl('/platform/create/templates'),
        isComingSoon: true,
        badge: t('tool-badge-coming-soon'),
        accentColor: 'primary'
      }
    ],
    [t]
  )

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
          title={!isDevEnabled ? t('feature-disabled-title') : undefined}
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
              {t('orchestrator-button')}
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
                {t('tools-section-title')}
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">{t('tools-section-description')}</p>
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
            <p className="gba:text-muted-foreground">{t('footer-tagline')}</p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default NewworkCreate
