'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { CalendarBlank, PencilSimpleLine, CaretRight } from '@phosphor-icons/react'
import timeTrackingTranslations from '../_i18n'

export const QuickActionsCard: React.FC = () => {
  const { t } = useTranslation(timeTrackingTranslations)

  const actions = [
    {
      key: 'request-leave',
      icon: CalendarBlank,
      title: t('request_leave'),
      description: t('request_leave_description')
    },
    {
      key: 'request-correction',
      icon: PencilSimpleLine,
      title: t('request_correction'),
      description: t('request_correction_description')
    }
  ]

  return (
    <Card className="gba:h-full" data-testid="timeclock-quick-actions-card">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-xs gba:font-semibold gba:tracking-wide gba:text-muted-foreground">
          {t('quick_actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {actions.map(action => (
          <button
            key={action.key}
            type="button"
            className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:p-3 gba:text-left gba:transition-colors hover:gba:bg-muted/50"
            data-testid={`timeclock-${action.key}-button`}
          >
            <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted">
              <action.icon size={20} />
            </div>
            <div className="gba:flex-1">
              <div className="gba:text-sm gba:font-medium">{action.title}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{action.description}</div>
            </div>
            <CaretRight size={16} className="gba:text-muted-foreground gba:shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
