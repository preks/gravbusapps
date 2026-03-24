/**
 * Create view: hero (AI / from scratch), AI flow generator, template patterns.
 * Rendered above the flow list when in list view.
 */

import React, { useState } from 'react'
import { Badge, Card, CardContent } from '@newwork/nw-design-system'
import { ChevronRight, Settings, Sparkles } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { useWizardStore } from '@/business-apps/flow/apps/creator/hooks/useWizardStore'
import { FlowWizardDialog } from '@/business-apps/flow/apps/creator/components/wizard/FlowWizardDialog'
import { AIFlowGenerator, AI_PROMPT_TEST_ID } from '../components/AIFlowGenerator'
import { businessPatterns } from '../data/businessPatterns'

interface FlowStudioCreateViewProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  onCreateNewFlow: () => void
  /** Opens the designer with optional AI prompt pre-filled (e.g. from "Create with AI"). */
  onOpenDesignerWithAI?: (prompt: string) => void
  onTemplateCreated?: (templateId: string) => void
  'data-testid'?: string
}

export const FlowStudioCreateView: React.FC<FlowStudioCreateViewProps> = ({
  accessToken,
  userInfo,
  onCreateNewFlow,
  onOpenDesignerWithAI,
  onTemplateCreated,
  'data-testid': testId = 'flow-studio-create-view'
}) => {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const templateClient = useFlowTemplateClient(accessToken)

  const handleCreateWithAIClick = () => {
    if (onOpenDesignerWithAI) {
      onOpenDesignerWithAI('')
    } else {
      const el = document.querySelector(`[data-testid="${AI_PROMPT_TEST_ID}"]`) as HTMLElement
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => el.focus(), 500)
      }
    }
  }

  const handleSubPatternSelect = () => {
    useWizardStore.getState().initializeForCreate()
    setWizardOpen(true)
  }

  const handleWizardComplete = async (payload: { template?: unknown }) => {
    const raw = payload?.template
    if (!raw || typeof raw !== 'object') return
    const template = { ...raw } as Record<string, unknown>
    delete template.id
    try {
      const created = await templateClient.createTemplate(
        template as Parameters<typeof templateClient.createTemplate>[0]
      )
      if (created?.id && onTemplateCreated) {
        onTemplateCreated(created.id)
      }
    } catch (err) {
      console.error('Failed to create template from wizard:', err)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:w-full gba:pb-8" data-testid={testId}>
      {/* Hero */}
      <div className="gba:relative gba:mb-12 gba:pb-10" data-testid={`${testId}-hero`}>
        <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center">
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-sm gba:font-medium gba:mb-6">
            <Sparkles className="gba:h-4 gba:w-4" />
            AI-Powered Flow Builder
          </div>
          <h1 className="gba:text-4xl gba:sm:text-5xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-4">
            Build flows that <span className="gba:text-primary">work</span>
          </h1>
          <p className="gba:text-lg gba:text-muted-foreground gba:max-w-2xl gba:mx-auto gba:mb-10 gba:leading-relaxed">
            Create powerful automated flows in minutes. Describe what you need, or start from proven templates.
          </p>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6 gba:max-w-3xl gba:mx-auto">
            <div
              className="gba:group gba:relative gba:p-6 gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:text-left gba:transition-all gba:duration-300 gba:hover:border-primary/50 gba:hover:shadow-lg gba:cursor-pointer"
              onClick={handleCreateWithAIClick}
              onKeyDown={e => e.key === 'Enter' && handleCreateWithAIClick()}
              role="button"
              tabIndex={0}
              data-testid={`${testId}-hero-ai-cta`}
            >
              <div className="gba:absolute gba:inset-0 gba:rounded-2xl gba:bg-gradient-to-br gba:from-primary/5 gba:to-transparent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />
              <div className="gba:relative">
                <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-3 gba:group-hover:scale-110 gba:transition-transform">
                  <Sparkles className="gba:h-6 gba:w-6 gba:text-primary" />
                </div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-card-foreground gba:mb-2">Create with AI</h3>
                <p className="gba:text-muted-foreground gba:text-sm gba:leading-relaxed">
                  Describe your flow in plain language. Our AI will design it for you instantly.
                </p>
                <div className="gba:mt-3 gba:flex gba:items-center gba:text-primary gba:text-sm gba:font-medium">
                  Get started
                  <ChevronRight className="gba:h-4 gba:w-4 gba:ml-1 gba:group-hover:translate-x-1 gba:transition-transform" />
                </div>
              </div>
            </div>
            <div
              className="gba:group gba:relative gba:p-6 gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:text-left gba:transition-all gba:duration-300 gba:hover:border-primary/50 gba:hover:shadow-lg gba:cursor-pointer"
              onClick={onCreateNewFlow}
              onKeyDown={e => e.key === 'Enter' && onCreateNewFlow()}
              role="button"
              tabIndex={0}
              data-testid={`${testId}-hero-manual-cta`}
            >
              <div className="gba:absolute gba:inset-0 gba:rounded-2xl gba:bg-gradient-to-br gba:from-secondary/50 gba:to-transparent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />
              <div className="gba:relative">
                <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-secondary gba:flex gba:items-center gba:justify-center gba:mb-3 gba:group-hover:scale-110 gba:transition-transform">
                  <Settings className="gba:h-6 gba:w-6 gba:text-secondary-foreground" />
                </div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-card-foreground gba:mb-2">Build from Scratch</h3>
                <p className="gba:text-muted-foreground gba:text-sm gba:leading-relaxed">
                  Full creative control. Design every step with our visual flow builder.
                </p>
                <div className="gba:mt-3 gba:flex gba:items-center gba:text-primary gba:text-sm gba:font-medium">
                  Open designer
                  <ChevronRight className="gba:h-4 gba:w-4 gba:ml-1 gba:group-hover:translate-x-1 gba:transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Section */}
      <div className="gba:mb-12">
        <div className="gba:max-w-3xl gba:mx-auto">
          <AIFlowGenerator onStartAIFlow={onOpenDesignerWithAI} data-testid={`${testId}-ai-generator`} />
        </div>
      </div>

      {/* Template patterns */}
      <div className="gba:mb-10">
        <div className="gba:mb-6">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-1">Start from a template</h2>
          <p className="gba:text-muted-foreground gba:text-sm">Proven flow patterns to get you started quickly</p>
        </div>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
          {businessPatterns.map(pattern => {
            const IconComponent = pattern.icon
            const isExpanded = expandedPattern === pattern.id
            return (
              <Card
                key={pattern.id}
                className={`gba:transition-all gba:duration-200 ${
                  isExpanded
                    ? 'gba:ring-2 gba:ring-primary gba:border-primary'
                    : 'gba:hover:border-primary/50 gba:hover:shadow-md'
                }`}
                data-testid={`${testId}-pattern-${pattern.id}`}
              >
                <CardContent
                  className="gba:p-0"
                  onClick={() => setExpandedPattern(isExpanded ? null : pattern.id)}
                  onKeyDown={e => e.key === 'Enter' && setExpandedPattern(isExpanded ? null : pattern.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="gba:p-5 gba:cursor-pointer">
                    <div className="gba:flex gba:items-start gba:gap-4">
                      <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                        <IconComponent className="gba:h-5 gba:w-5 gba:text-primary" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                          <h4 className="gba:font-medium gba:text-card-foreground">{pattern.name}</h4>
                          <Badge variant="secondary" className="gba:text-xs gba:shrink-0">
                            {pattern.subPatterns.length}
                          </Badge>
                        </div>
                        <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">{pattern.description}</p>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="gba:border-t gba:border-border gba:p-4 gba:bg-muted/30">
                      <div className="gba:space-y-2">
                        {pattern.subPatterns.map(sub => (
                          <div
                            key={sub.id}
                            className="gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border gba:cursor-pointer gba:transition-all gba:hover:border-primary/50"
                            onClick={e => {
                              e.stopPropagation()
                              handleSubPatternSelect()
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.stopPropagation()
                                handleSubPatternSelect()
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            data-testid={`${testId}-subpattern-${sub.id}`}
                          >
                            <h5 className="gba:font-medium gba:text-sm gba:text-card-foreground gba:mb-1">
                              {sub.name}
                            </h5>
                            <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{sub.description}</p>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                              <span>{sub.steps.length} steps</span>
                              <span>·</span>
                              <span>{sub.roles.length} roles</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <FlowWizardDialog
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
        context={{ accessToken, userInfo }}
        data-testid={`${testId}-wizard-dialog`}
      />
    </div>
  )
}
