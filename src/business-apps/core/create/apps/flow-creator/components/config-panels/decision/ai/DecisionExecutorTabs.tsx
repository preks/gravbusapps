import React from 'react'
import { Tabs, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import { Bot, Brain } from 'lucide-react'
import translations from '../../../../_i18n'

export type AIExecutor = 'EVERYAI' | 'TASK_EXPERT'

interface DecisionExecutorTabsProps {
  value: AIExecutor
  onValueChange: (executor: AIExecutor) => void
  variant: 'simple' | 'advanced'
  testIdPrefix: string
}

export const DecisionExecutorTabs: React.FC<DecisionExecutorTabsProps> = ({
  value,
  onValueChange,
  variant,
  testIdPrefix
}) => {
  const { t } = useTranslation(translations)
  const suffix = variant === 'simple' ? '-simple' : ''

  return (
    <Tabs
      value={value}
      onValueChange={(next: string) => onValueChange(next === 'TASK_EXPERT' ? 'TASK_EXPERT' : 'EVERYAI')}
    >
      <TabsList
        className="gba:w-full gba:grid gba:grid-cols-2"
        data-testid={`${testIdPrefix}-ai-decision-executor${suffix}`}
      >
        <TabsTrigger
          value="EVERYAI"
          className="gba:text-xs"
          data-testid={`${testIdPrefix}-ai-decision-executor-everyai${suffix}`}
        >
          <span className="gba:flex gba:items-center gba:gap-2">
            <Brain className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            {t('decision-ai-executor-everyai')}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="TASK_EXPERT"
          className="gba:text-xs"
          data-testid={`${testIdPrefix}-ai-decision-executor-taskexpert${suffix}`}
        >
          <span className="gba:flex gba:items-center gba:gap-2">
            <Bot className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            {t('decision-ai-executor-taskexpert')}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
