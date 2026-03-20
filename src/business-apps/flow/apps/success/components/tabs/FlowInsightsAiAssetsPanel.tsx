import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Bot, ExternalLink, FunctionSquare, ShieldCheck } from 'lucide-react'
import type { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import translations from '../../_i18n'
import { SuccessEmptyState, SuccessSectionCardHeader } from '../shared'
import { collectFlowInsightsAiAssets, type FlowInsightReliabilityHotspot } from './flowInsightsAiAssets.utils'

interface FlowInsightsAiAssetsPanelProps {
  accessToken: string
  templateId?: string
  reliabilityHotspots?: FlowInsightReliabilityHotspot[]
  'data-testid'?: string
}

export const FlowInsightsAiAssetsPanel: React.FC<FlowInsightsAiAssetsPanelProps> = ({
  accessToken,
  templateId,
  reliabilityHotspots = [],
  'data-testid': testId = 'flow-insights-ai-assets'
}) => {
  const { t } = useTranslation(translations)
  const templateClient = useFlowTemplateClient(accessToken)
  const [template, setTemplate] = useState<FlowTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!templateId) {
      setTemplate(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    templateClient
      .getTemplate(templateId)
      .then(nextTemplate => {
        if (!cancelled) setTemplate(nextTemplate)
      })
      .catch(() => {
        if (!cancelled) setTemplate(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [templateClient, templateId])

  const assets = useMemo(
    () => collectFlowInsightsAiAssets(template, t('value-not-available'), reliabilityHotspots),
    [reliabilityHotspots, template, t]
  )

  const sections = [
    {
      id: 'policies',
      title: t('decisions-ai-assets-policies'),
      icon: <ShieldCheck className="gba:h-4 gba:w-4" />,
      items: assets.policies,
      emptyLabel: t('decisions-ai-assets-empty-policies')
    },
    {
      id: 'task-experts',
      title: t('decisions-ai-assets-task-experts'),
      icon: <Bot className="gba:h-4 gba:w-4" />,
      items: assets.taskExperts,
      emptyLabel: t('decisions-ai-assets-empty-task-experts')
    },
    {
      id: 'functions',
      title: t('decisions-ai-assets-functions'),
      icon: <FunctionSquare className="gba:h-4 gba:w-4" />,
      items: assets.functions,
      emptyLabel: t('decisions-ai-assets-empty-functions')
    }
  ]
  const hasAssets = sections.some(section => section.items.length > 0)

  return (
    <Card className="gba:border-border gba:bg-card" data-testid={testId}>
      <SuccessSectionCardHeader>
        <CardTitle>{t('decisions-ai-assets-title')}</CardTitle>
        <CardDescription>{t('decisions-ai-assets-description')}</CardDescription>
      </SuccessSectionCardHeader>
      <CardContent className="gba:p-5">
        {isLoading ? (
          <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center">
            <Spinner />
          </div>
        ) : !hasAssets ? (
          <SuccessEmptyState
            title={t('decisions-ai-assets-empty-title')}
            description={t('decisions-ai-assets-empty')}
            icon={<Bot className="gba:h-8 gba:w-8" />}
            data-testid={`${testId}-empty`}
          />
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:gap-5">
            {sections.map(section => (
              <div key={section.id} className="gba:flex gba:flex-col gba:gap-3">
                <span className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium gba:text-foreground">
                  {section.icon}
                  {section.title}
                </span>
                {!section.items.length ? (
                  <span className="gba:text-sm gba:text-muted-foreground">{section.emptyLabel}</span>
                ) : (
                  section.items.map((item, index) => {
                    const usageLabel = item.usages.slice(0, 2).join(', ')
                    const usageOverflow = item.usages.length > 2 ? ` +${item.usages.length - 2}` : ''
                    const body = (
                      <>
                        <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
                          <span className="gba:text-sm gba:font-medium gba:text-foreground">{item.label}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {[
                              item.versionLabel,
                              usageLabel ? `${t('decisions-ai-assets-used-in')} ${usageLabel}${usageOverflow}` : null
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                        {item.href ? (
                          <ExternalLink className="gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                        ) : null}
                      </>
                    )

                    if (!item.href) {
                      return (
                        <div
                          key={item.key}
                          className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-3"
                          data-testid={`${testId}-${section.id}-${index}`}
                        >
                          {body}
                        </div>
                      )
                    }

                    return (
                      <a
                        key={item.key}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-3 gba:no-underline gba:transition-colors gba:hover:bg-muted/50"
                        data-testid={`${testId}-${section.id}-${index}`}
                      >
                        {body}
                      </a>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
