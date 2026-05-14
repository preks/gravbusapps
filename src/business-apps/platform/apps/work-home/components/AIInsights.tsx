import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useAIInsights } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useAIInsights'
import { openEveryAI } from '@/common/utils/openEveryAI'
import translations from '../_i18n'

interface AIInsightsProps {
  accessToken: string
  employeeId: string
  hasTeamData: boolean
  'data-testid'?: string
}

interface InsightParagraph {
  id: string
  text: string
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  accessToken,
  employeeId,
  hasTeamData,
  'data-testid': testId = 'work-home-ai-insights'
}) => {
  const { t } = useTranslation(translations)

  const { insight, isLoading, refetch } = useAIInsights({
    accessToken,
    managerId: hasTeamData ? employeeId : undefined
  })

  const paragraphs = useMemo(() => {
    if (!insight) return []
    const seenParagraphs = new Map<string, number>()
    return insight
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map((text): InsightParagraph => {
        const occurrence = seenParagraphs.get(text) ?? 0
        seenParagraphs.set(text, occurrence + 1)
        return {
          id: `${text}-${occurrence}`,
          text
        }
      })
  }, [insight])

  if (!hasTeamData) return null

  if (isLoading) {
    return (
      <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:h-4 gba:w-4 gba:text-primary" />
            <CardTitle className="gba:text-lg">{t('ai-insights-title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-4 gba:w-full gba:bg-muted gba:rounded" />
            <div className="gba:h-4 gba:w-5/6 gba:bg-muted gba:rounded" />
            <div className="gba:h-4 gba:w-4/6 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!insight || paragraphs.length === 0) return null

  return (
    <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
      <CardHeader className="gba:flex-none gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:h-4 gba:w-4 gba:text-primary" />
            <CardTitle className="gba:text-lg">{t('ai-insights-title')}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} aria-label={t('ai-insights-refresh')}>
            <RefreshCw className="gba:h-3 gba:w-3" />
          </Button>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground">{t('ai-insights-subtitle')}</p>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {paragraphs.map(paragraph => (
          <p key={paragraph.id} className="gba:text-sm gba:text-foreground gba:leading-relaxed">
            {paragraph.text}
          </p>
        ))}
        <div className="gba:pt-2 gba:border-t">
          <Button variant="outline" size="sm" onClick={() => openEveryAI({ prompt: t('ai-insights-ask-more-prompt') })}>
            <Sparkles className="gba:h-3 gba:w-3 gba:mr-1" />
            {t('ai-insights-ask-more')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
