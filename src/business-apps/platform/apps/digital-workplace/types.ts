import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export type WorkplaceMetricKey =
  | 'tasksDue'
  | 'mailUnread'
  | 'chatsUnread'
  | 'reminders'
  | 'agentsWorking'
  | 'agentsWaiting'

export type WorkplaceMetrics = Record<WorkplaceMetricKey, number | undefined>

/** Props every workplace panel receives: app context + a metric reporter. */
export interface WorkplacePanelBaseProps {
  context: BusinessAppContextProps
  onMetric: (key: WorkplaceMetricKey, value: number) => void
  className?: string
}
