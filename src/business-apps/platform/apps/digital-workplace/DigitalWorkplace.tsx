import React, { useCallback, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWorkplaceTranslation } from './_i18n/useWorkplaceTranslation'
import WorkplaceAiConsole from './components/WorkplaceAiConsole'
import WorkplaceKpis from './components/WorkplaceKpis'
import AgentsPanel from './components/AgentsPanel'
import TasksPanel from './components/TasksPanel'
import RemindersDock from './components/RemindersDock'
import MessagesPanel from './components/MessagesPanel'
import DocumentsPanel from './components/DocumentsPanel'
import WeekCalendar from './components/WeekCalendar'
import type { WorkplaceMetricKey, WorkplaceMetrics } from './types'

const TEST_ID = 'digital-workplace'
const PANEL_SIZING = 'gba:h-80 gba:md:h-auto gba:md:flex-1'
const DESK_CELL = 'gba:flex gba:min-h-0 gba:min-w-0 gba:flex-col gba:gap-4'

const INITIAL_METRICS: WorkplaceMetrics = {
  tasksDue: undefined,
  mailUnread: undefined,
  chatsUnread: undefined,
  reminders: undefined,
  agentsWorking: undefined,
  agentsWaiting: undefined
}

export type DigitalWorkplaceProps = BusinessAppContextProps

/**
 * Digital Workplace — the single command center over the whole workplace.
 * Aggregates EveryBox tasks, reminders, Office documents, mail, chats and the
 * live EveryFabric Agent Workforce (incl. HITL) into one screen, with the
 * EveryFabric composer to start new work. Each panel owns its data and reports
 * a headline metric up for the KPI strip.
 */
const DigitalWorkplace: React.FC<DigitalWorkplaceProps> = ({ accessToken, userInfo, additionalData }) => {
  const { t } = useWorkplaceTranslation()
  const [metrics, setMetrics] = useState<WorkplaceMetrics>(INITIAL_METRICS)

  const context = useMemo<BusinessAppContextProps>(
    () => ({ accessToken, userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  const handleMetric = useCallback((key: WorkplaceMetricKey, value: number) => {
    setMetrics(prev => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const displayName = userInfo?.givenName || userInfo?.employeeDetails?.firstName
  const greetingLine = displayName ? t('greeting-named', { name: displayName }) : t('greeting')

  return (
    <div
      data-testid={TEST_ID}
      className="gba:relative gba:flex gba:h-full gba:w-full gba:flex-col gba:overflow-hidden gba:bg-background"
    >
      <header className="gba:flex gba:shrink-0 gba:flex-col gba:gap-0.5 gba:px-4 gba:pb-1 gba:pt-4">
        <h1 className="gba:truncate gba:text-xl gba:font-semibold gba:tracking-tight gba:text-foreground">
          {greetingLine}
        </h1>
        <p className="gba:truncate gba:text-sm gba:text-muted-foreground">{t('subtitle')}</p>
      </header>

      {/* Right padding reserves a gutter for the dock. */}
      <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-4 gba:overflow-hidden gba:p-4 gba:pr-16">
        <WorkplaceKpis metrics={metrics} />

        {/* Desk: four equal-width columns — Digital Workforce, EveryBox, EveryOne and EveryOffice. */}
        <div className="gba:grid gba:min-h-0 gba:flex-1 gba:grid-cols-1 gba:gap-4 gba:overflow-y-auto gba:md:grid-cols-4 gba:md:overflow-hidden">
          {/* Left region (3 columns): the work panels shrink to make room for the
              Every AI console pinned beneath them. */}
          <div className="gba:flex gba:min-h-0 gba:flex-col gba:gap-4 gba:md:col-span-3">
            <div className="gba:grid gba:min-h-0 gba:flex-1 gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-3 gba:md:overflow-hidden">
              <div className={DESK_CELL}>
                <AgentsPanel context={context} onMetric={handleMetric} className={PANEL_SIZING} />
              </div>
              <div className={DESK_CELL}>
                <TasksPanel context={context} onMetric={handleMetric} className={PANEL_SIZING} />
              </div>
              <div className={DESK_CELL}>
                <MessagesPanel context={context} onMetric={handleMetric} className={PANEL_SIZING} />
              </div>
            </div>

            {/* Prominent Every AI console — prompt field + customizable quick actions. */}
            <div className="gba:shrink-0">
              <WorkplaceAiConsole accessToken={accessToken} userId={userInfo?.id} />
            </div>
          </div>

          {/* EveryOffice rail stays full height to the right of the console. */}
          <div className={DESK_CELL} data-testid={`${TEST_ID}-office-rail`}>
            <WeekCalendar context={context} />
            <DocumentsPanel context={context} onMetric={handleMetric} className={PANEL_SIZING} />
          </div>
        </div>
      </div>

      {/* Floating reminders dock pinned to the right corner, expandable on hover. */}
      <RemindersDock context={context} />
    </div>
  )
}

export default DigitalWorkplace
export { DigitalWorkplace }
