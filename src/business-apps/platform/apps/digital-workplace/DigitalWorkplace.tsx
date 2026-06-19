import React, { useCallback, useMemo, useState } from 'react'
import { useLocale } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWorkplaceTranslation } from './_i18n/useWorkplaceTranslation'
import WorkplaceAiConsole from './components/WorkplaceAiConsole'
import WorkplaceKpis from './components/WorkplaceKpis'
import FocusFeed from './components/FocusFeed'
import WorkplaceRail from './components/WorkplaceRail'
import { useReminders } from './hooks/useReminders'
import type { WorkplaceMetricKey, WorkplaceMetrics } from './types'

const TEST_ID = 'digital-workplace'
const FOCUS_SIZING = 'gba:h-96 gba:lg:h-auto gba:lg:min-h-0 gba:lg:flex-1'

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
 * Digital Workplace — a calm, focus-first command center. A single "Needs you
 * today" feed answers what needs the user now, with the Every AI bar to start
 * new work; everything else (calendar, messages, files, reminders) lives in a
 * quiet secondary rail so the screen no longer overwhelms.
 */
const DigitalWorkplace: React.FC<DigitalWorkplaceProps> = ({ accessToken, userInfo, additionalData }) => {
  const { t } = useWorkplaceTranslation()
  const { locale } = useLocale()
  const [metrics, setMetrics] = useState<WorkplaceMetrics>(INITIAL_METRICS)

  const context = useMemo<BusinessAppContextProps>(
    () => ({ accessToken, userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  const handleMetric = useCallback((key: WorkplaceMetricKey, value: number) => {
    setMetrics(prev => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  // Reminders are shared so completing one updates both the focus feed and rail.
  const { reminders, isLoading, error, createReminder, completeReminder } = useReminders(context)

  const displayName = userInfo?.givenName || userInfo?.employeeDetails?.firstName
  const greetingLine = displayName ? t('greeting-named', { name: displayName }) : t('greeting')
  const dateLine = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    [locale]
  )

  return (
    <div
      data-testid={TEST_ID}
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:overflow-hidden gba:bg-background"
    >
      <header className="gba:flex gba:shrink-0 gba:flex-col gba:gap-1 gba:px-4 gba:pt-5">
        <h1 className="gba:truncate gba:text-2xl gba:font-semibold gba:tracking-tight gba:text-foreground">
          {greetingLine}
        </h1>
        <p className="gba:truncate gba:text-sm gba:text-muted-foreground">
          {dateLine} · {t('subtitle')}
        </p>
      </header>

      <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-4 gba:overflow-hidden gba:p-4">
        <WorkplaceKpis metrics={metrics} />

        <div className="gba:grid gba:min-h-0 gba:flex-1 gba:grid-cols-1 gba:gap-4 gba:overflow-y-auto gba:lg:grid-cols-3 gba:lg:overflow-hidden">
          {/* Primary: the single focus feed + the calm Every AI bar beneath it. */}
          <div className="gba:flex gba:min-h-0 gba:flex-col gba:gap-4 gba:lg:col-span-2">
            <FocusFeed
              context={context}
              onMetric={handleMetric}
              className={FOCUS_SIZING}
              reminders={{ reminders, isLoading, error, createReminder, completeReminder }}
            />
            <div className="gba:shrink-0">
              <WorkplaceAiConsole accessToken={accessToken} userId={userInfo?.id} />
            </div>
          </div>

          {/* Secondary: quiet reference rail. */}
          <div className="gba:min-h-0 gba:lg:col-span-1" data-testid={`${TEST_ID}-rail`}>
            <WorkplaceRail context={context} onMetric={handleMetric} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DigitalWorkplace
export { DigitalWorkplace }
