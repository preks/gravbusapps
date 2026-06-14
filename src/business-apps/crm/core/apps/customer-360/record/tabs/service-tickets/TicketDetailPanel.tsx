import React, { useMemo } from 'react'
import { Badge, Button, Spinner, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { buildPlatformUrl, openInNewTab } from '@/common/utils/navigationUtils'
import customer360I18n from '../../../_i18n'
import type { CustomerTicket } from '../../../data/types'
import { useCustomerTicketDetail } from '../../../data/record/hooks/useCustomerTicketDetail'
import { getStatusBadgeVariant, isOpenStatus } from '../../../utils/statusBadge'
import { formatDate } from '../../../utils/format'

const SERVICE_DESK_PATH = '/platform/sales-demo/service-desk'
const SERVICE_DESK_DEV_APP = 'ser/apps/service-desk'

/**
 * Builds a service-desk deep link (prod platform URL or dev query-param URL).
 * Targets a specific task when `taskId` is known; otherwise opens the tickets
 * view carrying the `flowId` so the user lands next to the right ticket.
 */
function buildServiceDeskUrl(params: { taskId?: string; flowId?: string }): string {
  const isProduction = import.meta.env.MODE === 'production'
  const query: Record<string, string> = params.taskId
    ? { taskId: params.taskId }
    : { subview: 'tickets', ...(params.flowId ? { flowId: params.flowId } : {}) }

  if (isProduction) {
    return buildPlatformUrl(SERVICE_DESK_PATH, query)
  }
  return `${globalThis.location.origin}?app=${SERVICE_DESK_DEV_APP}&${new URLSearchParams(query).toString()}`
}

export interface TicketDetailPanelProps {
  accessToken: string
  ticket: CustomerTicket
}

/**
 * Expanded detail for a single service ticket: flow steps with per-step
 * statuses, plus deep links into the service desk for each task and for the
 * active task overall.
 */
const TicketDetailPanel: React.FC<TicketDetailPanelProps> = ({ accessToken, ticket }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { data, loading, error } = useCustomerTicketDetail(accessToken, ticket.id)

  const activeTaskId = useMemo(() => {
    const steps = data?.steps ?? []
    const open = steps.find(step => step.taskId && isOpenStatus(step.status))
    return open?.taskId ?? steps.find(step => step.taskId)?.taskId
  }, [data])

  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-6"
        data-testid={`customer-360-ticket-detail-loading-${ticket.id}`}
      >
        <Spinner size="sm" />
      </div>
    )
  }

  if (error) {
    return (
      <p
        className="gba:px-2 gba:py-4 gba:text-xs gba:text-destructive"
        data-testid={`customer-360-ticket-detail-error-${ticket.id}`}
      >
        {error}
      </p>
    )
  }

  const steps = data?.steps ?? []

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-3 gba:px-2 gba:pb-3"
      data-testid={`customer-360-ticket-detail-${ticket.id}`}
    >
      {steps.length > 0 ? (
        <ol className="gba:flex gba:flex-col gba:gap-2">
          {steps.map((step, index) => (
            <li
              key={step.taskId || `${ticket.id}-step-${step.title || index}`}
              className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-md gba:bg-muted/50 gba:px-3 gba:py-2"
            >
              <div className="gba:flex gba:min-w-0 gba:flex-col">
                <span className="gba:truncate gba:text-sm gba:text-foreground">
                  {step.title || t('tickets-step-untitled')}
                </span>
                {step.completedAt ? (
                  <span className="gba:text-xs gba:text-muted-foreground">{formatDate(step.completedAt)}</span>
                ) : null}
              </div>
              <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
                {step.status ? (
                  <Badge variant={getStatusBadgeVariant(step.status)} size="sm">
                    {step.status}
                  </Badge>
                ) : null}
                {step.taskId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openInNewTab(buildServiceDeskUrl({ taskId: step.taskId }))}
                    data-testid={`customer-360-ticket-step-open-${step.taskId}`}
                  >
                    <ArrowSquareOutIcon className="gba:size-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="gba:px-1 gba:text-xs gba:text-muted-foreground">{t('tickets-no-steps')}</p>
      )}

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openInNewTab(buildServiceDeskUrl({ taskId: activeTaskId, flowId: ticket.id }))}
          data-testid={`customer-360-ticket-open-${ticket.id}`}
        >
          <ArrowSquareOutIcon className="gba:mr-2 gba:size-4" />
          {t('tickets-open-in-service-desk')}
        </Button>
      </div>
    </div>
  )
}

export default TicketDetailPanel
export { TicketDetailPanel }
