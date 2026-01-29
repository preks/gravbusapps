import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { Monitor, Workflow, Bot, Code2, Database, LayoutTemplate } from 'lucide-react'
import {
  HeroSection,
  ToolCard,
  AIQuickStart,
  NeuralBackground,
  ConnectionsVisualization,
  ToolCardProps
} from './components'

export interface NewworkCreateProps extends BusinessAppContextProps {
  'data-testid'?: string
}

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
 */
export const NewworkCreate: React.FC<NewworkCreateProps> = ({ 'data-testid': testId = 'create-workspace' }) => {
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
      title: 'Task Experts',
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

  // Handle AI quick start submission
  const handleAIQuickStart = useCallback((prompt: string) => {
    // Analyze the prompt to determine the best tool
    const lowerPrompt = prompt.toLowerCase()

    // Keywords that suggest different tools
    const screenKeywords = [
      'screen',
      'dashboard',
      'form',
      'ui',
      'interface',
      'page',
      'view',
      'layout',
      'list',
      'table',
      'chart'
    ]
    const flowKeywords = ['workflow', 'flow', 'process', 'approval', 'automate', 'sequence', 'step', 'trigger']
    const taskExpertKeywords = ['task expert', 'ai assistant', 'bot', 'automate task', 'help with', 'assist']
    const functionKeywords = ['function', 'serverless', 'code', 'script', 'logic', 'api', 'endpoint', 'lambda']
    const dataModelKeywords = ['data model', 'entity', 'schema', 'database', 'structure', 'field', 'relationship']

    // Score each tool based on keyword matches
    const scores = {
      screenBuilder: screenKeywords.filter(k => lowerPrompt.includes(k)).length,
      flowCreator: flowKeywords.filter(k => lowerPrompt.includes(k)).length,
      taskExperts: taskExpertKeywords.filter(k => lowerPrompt.includes(k)).length,
      functions: functionKeywords.filter(k => lowerPrompt.includes(k)).length,
      dataModels: dataModelKeywords.filter(k => lowerPrompt.includes(k)).length
    }

    // Find the highest scoring tool
    const maxScore = Math.max(...Object.values(scores))

    // Store the prompt for the target app to use
    try {
      sessionStorage.setItem('newworkCreatePrompt', prompt)
    } catch {
      // Ignore storage errors
    }

    // Navigate to the appropriate tool based on keyword scoring
    if (maxScore > 0) {
      if (scores.flowCreator === maxScore) {
        navigateTo(buildPlatformUrl('/platform/apps/flow/apps/creator') + '#create')
        return
      } else if (scores.taskExperts === maxScore) {
        navigateTo(buildPlatformUrl('/platform/create/prompt-manager'))
        return
      } else if (scores.functions === maxScore) {
        navigateTo(buildPlatformUrl('/platform/create/function-manager'))
        return
      }
      // Data models coming soon, fall through to default
    }

    // Default to AI Builder for screen creation
    navigateTo(buildPlatformUrl('/platform/ai-builder'))
  }, [])

  // Handle tool card click
  const handleToolClick = useCallback((href: string) => {
    navigateTo(href)
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

        {/* AI Quick Start Section */}
        <AIQuickStart onSubmit={handleAIQuickStart} data-testid={`${testId}-ai-quickstart`} />

        {/* Tools Grid Section */}
        <section className="gba:py-6 gba:px-6 gba:relative" data-testid={`${testId}-tools-section`}>
          {/* Subtle background */}
          <div className="gba:absolute gba:inset-0 gba:bg-background" />

          <div className="gba:relative gba:max-w-6xl gba:mx-auto">
            {/* Section header */}
            <div className="gba:text-center gba:mb-6">
              <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
                Choose your creation tool
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
                Everything you need to build enterprise applications, from UI screens to automated flows
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
