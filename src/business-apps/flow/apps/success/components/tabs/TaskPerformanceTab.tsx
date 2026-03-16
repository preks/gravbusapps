import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle, CheckCircle2, Target, Timer, Users } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useTaskPerformanceAnalytics } from '../../hooks/useFlowAnalytics'
import { useResolvedUserNames } from '../../hooks/useResolvedUserNames'
import { useSystemTaskReliability } from '../../hooks/useSystemTaskReliability'
import {
  SuccessEmptyState,
  SuccessErrorState,
  SuccessKpiGrid,
  SuccessSectionCardHeader,
  SuccessTabPage,
  SuccessTimeframeSelect,
  SystemTaskReliabilityPanel
} from '../shared'
import { formatMinutesDuration, formatPercent } from '../../utils/formatters'
import { DEFAULT_SUCCESS_TIMEFRAME, getSuccessTimeframeOptions, type SuccessTimeframe } from '../../utils/timeframe'
import type { FlowSuccessDrilldownTarget } from '../../shellState'

interface TaskPerformanceTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  onTimeframeChange?: (timeframe: SuccessTimeframe) => void
  templateId?: string
  showControls?: boolean
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

export const TaskPerformanceTab: React.FC<TaskPerformanceTabProps> = ({
  prefixDataTestId = 'task-performance-tab',
  accessToken,
  timeframe,
  onTimeframeChange,
  templateId,
  showControls = true,
  section,
  onDrilldown,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const [internalTimeframe, setInternalTimeframe] = useState<SuccessTimeframe>(DEFAULT_SUCCESS_TIMEFRAME)
  const activeTimeframe = timeframe ?? internalTimeframe
  const handleTimeframeChange = onTimeframeChange ?? setInternalTimeframe
  const scopedTemplateId = templateId && templateId !== 'ALL' ? templateId : undefined

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useTaskPerformanceAnalytics({
    timeframe: activeTimeframe,
    templateId: scopedTemplateId,
    accessToken
  })
  const { data: systemReliability, isLoading: reliabilityLoading } = useSystemTaskReliability({
    timeframe: activeTimeframe,
    templateId: scopedTemplateId,
    accessToken
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const taskTypePerformance = analytics?.taskTypePerformance ?? []
  const assignmentModeAnalytics = analytics?.assignmentModeAnalytics ?? []
  const userProductivity = analytics?.userProductivity ?? []
  const productivityUserIds = useMemo(() => userProductivity.map(user => user.userId), [userProductivity])
  const resolvedUserNames = useResolvedUserNames(accessToken, productivityUserIds)
  const timeframeOptions = getSuccessTimeframeOptions(t)
  const kpiItems = [
    {
      id: 'pending-tasks',
      label: t('tasks-pending'),
      value: String(analytics?.pendingTasks ?? 0),
      description: t('tasks-pending-description'),
      icon: <Timer className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () => onDrilldown?.({ primaryView: 'performance', performanceView: 'tasks', section: 'task-types' })
    },
    {
      id: 'overdue-tasks',
      label: t('tasks-overdue'),
      value: String(analytics?.overdueTasks ?? 0),
      description: t('tasks-overdue-description'),
      icon: <AlertTriangle className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () =>
        onDrilldown?.({
          primaryView: 'governance',
          governanceView: 'sla',
          templateId: templateId || 'ALL',
          section: 'sla-immediate-action'
        })
    },
    {
      id: 'avg-completion-rate',
      label: t('tasks-avg-completion-rate'),
      value: formatPercent(
        taskTypePerformance.length > 0
          ? Math.round(taskTypePerformance.reduce((sum, t) => sum + t.completionRate, 0) / taskTypePerformance.length)
          : 0
      ),
      description: t('tasks-avg-completion-rate-description'),
      icon: <CheckCircle2 className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () => onDrilldown?.({ primaryView: 'performance', performanceView: 'tasks', section: 'task-types' })
    },
    {
      id: 'avg-tasks-per-user',
      label: t('tasks-avg-tasks-per-user'),
      value: String(
        userProductivity.length > 0
          ? Math.round(userProductivity.reduce((sum, u) => sum + u.tasksCompleted, 0) / userProductivity.length)
          : 0
      ),
      description: t('tasks-avg-tasks-per-user-description'),
      icon: <Users className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () =>
        onDrilldown?.({ primaryView: 'performance', performanceView: 'tasks', section: 'user-productivity' })
    }
  ]

  return (
    <SuccessTabPage
      title={t('analytics-subview-tasks')}
      description={t('tasks-description')}
      actions={
        showControls || headerActions ? (
          <>
            {showControls ? (
              <SuccessTimeframeSelect
                value={activeTimeframe}
                onChange={handleTimeframeChange}
                options={timeframeOptions}
                data-testid={`${prefixDataTestId}-timeframe-select`}
              />
            ) : null}
            {headerActions}
          </>
        ) : undefined
      }
      data-testid={prefixDataTestId}
    >
      {error ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={error.message}
          onRetry={refetch}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={kpiItems}
          isLoading={isLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('tasks-description')}
          data-testid={`${prefixDataTestId}-kpis`}
        />
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2">
        <Card className="gba:border-border gba:bg-card" id="task-types">
          <SuccessSectionCardHeader>
            <CardTitle>{t('tasks-task-types')}</CardTitle>
            <CardDescription>{t('tasks-task-types-description')}</CardDescription>
          </SuccessSectionCardHeader>
          <CardContent className="gba:p-5">
            {!taskTypePerformance.length ? (
              <SuccessEmptyState
                title={t('state-empty')}
                description={t('tasks-task-types-description')}
                icon={<Timer className="gba:h-8 gba:w-8" />}
              />
            ) : (
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('tasks-task-type')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('tasks-total-tasks')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('tasks-completed-tasks')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('tasks-avg-completion-rate')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('tasks-avg-response-time')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('tasks-median-response-time')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskTypePerformance.map(task => (
                      <tr key={task.taskType} className="gba:border-b gba:border-border/60">
                        <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">{task.taskType}</td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{task.totalTasks}</td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {task.completedTasks}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(task.completionRate)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatMinutesDuration(task.avgResponseTime)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatMinutesDuration(task.medianResponseTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gba:border-border gba:bg-card" id="assignment-modes">
          <SuccessSectionCardHeader>
            <CardTitle>{t('tasks-assignment-modes')}</CardTitle>
            <CardDescription>{t('tasks-assignment-modes-description')}</CardDescription>
          </SuccessSectionCardHeader>
          <CardContent className="gba:p-5">
            {!assignmentModeAnalytics.length ? (
              <SuccessEmptyState
                title={t('state-empty')}
                description={t('tasks-assignment-modes-description')}
                icon={<Target className="gba:h-8 gba:w-8" />}
              />
            ) : (
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">
                        {t('tasks-assignment-mode')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('tasks-total-tasks')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('tasks-avg-completion-time')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('tasks-avg-completion-rate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentModeAnalytics.map(mode => (
                      <tr key={mode.assignmentMode} className="gba:border-b gba:border-border/60">
                        <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">
                          {mode.assignmentMode}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{mode.totalTasks}</td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatMinutesDuration(mode.avgCompletionTime)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(mode.completionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="task-reliability">
        <SystemTaskReliabilityPanel
          title={t('system-reliability-title')}
          description={t('system-reliability-tasks-description')}
          data={systemReliability}
          isLoading={reliabilityLoading}
          data-testid={`${prefixDataTestId}-system-reliability`}
        />
      </div>

      <Card className="gba:border-border gba:bg-card" id="user-productivity">
        <SuccessSectionCardHeader>
          <CardTitle>{t('tasks-user-productivity')}</CardTitle>
          <CardDescription>{t('tasks-user-productivity-description')}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:p-5">
          {!userProductivity.length ? (
            <SuccessEmptyState
              title={t('state-empty')}
              description={t('tasks-user-productivity-description')}
              icon={<Users className="gba:h-8 gba:w-8" />}
            />
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('tasks-user-name')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('tasks-tasks-completed')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                      {t('tasks-avg-completion-time')}
                    </th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                      {t('tasks-productivity-score')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userProductivity.map(user => (
                    <tr key={user.userId} className="gba:border-b gba:border-border/60">
                      <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">
                        {resolvedUserNames[user.userId] || user.userName || user.userId}
                      </td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{user.tasksCompleted}</td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {formatMinutesDuration(user.avgCompletionTime)}
                      </td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {user.productivityScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
