import React, { useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, useTranslation } from '@newwork/nw-design-system'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { type QuickAction } from '../hooks/useQuickActions'
import translations from '../_i18n'

interface QuickActionsGridProps {
  actions: QuickAction[]
  'data-testid'?: string
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  actions,
  'data-testid': testId = 'work-home-quick-actions'
}) => {
  const { t } = useTranslation(translations)

  const handleAction = useCallback((action: QuickAction) => {
    if (action.openAI) {
      openEveryAI()
    } else if (action.href) {
      navigateTo(buildPlatformUrl(action.href, { from: 'work-home' }))
    }
  }, [])

  return (
    <Card className="gba:rounded-xl gba:p-4 gba:h-full" data-testid={testId}>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">{t('quick-actions-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          {actions.map(action => {
            const Icon = action.icon
            return (
              <button
                type="button"
                key={action.id}
                onClick={() => handleAction(action)}
                className="gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:p-3 gba:bg-surface gba:rounded-lg gba:hover:bg-muted/40 gba:transition-colors gba:cursor-pointer gba:text-center"
                data-testid={`${testId}-${action.id}`}
              >
                <Icon className="gba:h-4 gba:w-4 gba:text-primary" />
                <span className="gba:text-xs gba:font-medium gba:text-foreground gba:leading-tight">
                  {t(action.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
