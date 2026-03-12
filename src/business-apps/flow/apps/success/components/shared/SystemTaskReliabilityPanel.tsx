import React from 'react'
import { Card, CardContent, CardDescription, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle, Bot, FunctionSquare, ShieldAlert } from 'lucide-react'
import translations from '../../_i18n'
import type { SystemTaskReliabilityData } from '../../hooks/useSystemTaskReliability'
import { SuccessSectionCardHeader } from './SuccessSectionCardHeader'
import { SuccessEmptyState } from './SuccessStates'
import { formatMillisecondsDuration, formatPercent } from '../../utils/formatters'

interface SystemTaskReliabilityPanelProps {
  title: string
  description: string
  data: SystemTaskReliabilityData | null
  isLoading?: boolean
  maxRows?: number
  'data-testid'?: string
}

export const SystemTaskReliabilityPanel: React.FC<SystemTaskReliabilityPanelProps> = ({
  title,
  description,
  data,
  isLoading = false,
  maxRows = 5,
  'data-testid': testId = 'system-task-reliability'
}) => {
  const { t } = useTranslation(translations)
  const hotspots = data?.hotspots.slice(0, maxRows) || []
  const byTaskType = data?.byTaskType || []
  const automationInsights = data?.automationInsights

  if (isLoading && !data) {
    return (
      <div className="gba:flex gba:min-h-48 gba:items-center gba:justify-center" data-testid={testId}>
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="gba:border-border gba:bg-card" data-testid={testId}>
      <SuccessSectionCardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </SuccessSectionCardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-5 gba:p-5">
        {!data ? (
          <SuccessEmptyState
            title={t('state-empty')}
            description={description}
            icon={<ShieldAlert className="gba:h-8 gba:w-8" />}
          />
        ) : (
          <>
            <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-4">
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                  {t('system-reliability-failure-rate')}
                </span>
                <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                  {formatPercent(data.summary.failureRate)}
                </div>
              </div>
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                  {t('system-reliability-timeout-rate')}
                </span>
                <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                  {formatPercent(data.summary.timeoutRate)}
                </div>
              </div>
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                  {t('system-reliability-total-failures')}
                </span>
                <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                  {data.summary.failedTasks + data.summary.timedOutTasks}
                </div>
              </div>
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                  {t('system-reliability-p95-duration')}
                </span>
                <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                  {formatMillisecondsDuration(data.summary.p95DurationMs)}
                </div>
              </div>
            </div>

            {automationInsights ? (
              <div className="gba:flex gba:flex-col gba:gap-3">
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                    {t('system-reliability-execution-mix-title')}
                  </span>
                  <span className="gba:text-sm gba:text-muted-foreground">
                    {t('system-reliability-execution-mix-description')}
                  </span>
                </div>
                <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
                  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                    <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                      {t('system-reliability-automation-ratio')}
                    </span>
                    <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                      {formatPercent(automationInsights.automationRatio)}
                    </div>
                    <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                      {t('system-reliability-task-count', {
                        count: automationInsights.totalAutomationTasks
                      })}
                    </div>
                  </div>
                  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                    <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                      {t('system-reliability-human-ratio')}
                    </span>
                    <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                      {formatPercent(automationInsights.humanRatio)}
                    </div>
                    <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                      {t('system-reliability-task-count', {
                        count: automationInsights.humanTasks
                      })}
                    </div>
                  </div>
                  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                    <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                      {t('system-reliability-ai-share-of-automation')}
                    </span>
                    <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                      {formatPercent(automationInsights.aiShareOfAutomation)}
                    </div>
                    <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                      {t('system-reliability-ai-task-count', {
                        count: automationInsights.aiTasks
                      })}
                    </div>
                  </div>
                  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
                    <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                      {t('system-reliability-automation-volume')}
                    </span>
                    <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                      {automationInsights.totalAutomationTasks}
                    </div>
                    <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                      {t('system-reliability-total-tracked-task-count', {
                        count: automationInsights.totalTrackedTasks
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {byTaskType.length ? (
              <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
                {byTaskType.map(item => (
                  <div
                    key={item.taskType}
                    className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4"
                  >
                    <div className="gba:flex gba:items-start gba:gap-3">
                      {item.taskType === 'AGENT' || item.taskType === 'AI_AGENT' ? (
                        <Bot className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      ) : (
                        <FunctionSquare className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      )}
                      <div className="gba:flex gba:flex-col gba:gap-1">
                        <span className="gba:text-sm gba:font-medium gba:text-foreground">{item.taskType}</span>
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {item.failedTasks + item.timedOutTasks} {t('system-reliability-failures-short')}
                        </span>
                      </div>
                    </div>
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">
                      {formatPercent(item.failureRate + item.timeoutRate)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {!hotspots.length ? (
              <SuccessEmptyState
                title={t('state-empty')}
                description={t('system-reliability-hotspots-description')}
                icon={<AlertTriangle className="gba:h-8 gba:w-8" />}
              />
            ) : (
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">
                        {t('system-reliability-step')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('system-reliability-failures')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('system-reliability-failure-rate')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('system-reliability-timeout-rate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotspots.map(hotspot => (
                      <tr
                        key={`${hotspot.templateId}-${hotspot.stepReference}-${hotspot.taskType}`}
                        className="gba:border-b gba:border-border/60"
                      >
                        <td className="gba:p-3 gba:text-sm">
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            <span className="gba:font-medium gba:text-foreground">{hotspot.stepTitle}</span>
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {hotspot.taskType} · {hotspot.stepReference}
                            </span>
                          </div>
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {hotspot.failedTasks + hotspot.timedOutTasks}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(hotspot.failureRate)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(hotspot.timeoutRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
