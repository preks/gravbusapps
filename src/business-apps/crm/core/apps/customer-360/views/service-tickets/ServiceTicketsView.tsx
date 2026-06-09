import React, { useMemo } from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { LifebuoyIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360List, { type Customer360RowData } from '../../components/Customer360List'
import { getStatusBadgeVariant } from '../../utils/statusBadge'
import { formatDate } from '../../utils/format'

export interface ServiceTicketsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

/**
 * Service Tickets tab — custom-flow-engine flow instances correlated to the
 * customer, rendered as a status-aware list.
 */
const ServiceTicketsView: React.FC<ServiceTicketsViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const tickets = snapshot.tickets ?? []

  const rows = useMemo<Customer360RowData[]>(
    () =>
      tickets.map(ticket => ({
        id: ticket.id,
        icon: LifebuoyIcon,
        primary: ticket.title || t('tickets-untitled'),
        secondary: ticket.priority ? t('tickets-priority', { priority: ticket.priority }) : undefined,
        testId: `customer-360-ticket-${ticket.id}`,
        trailing: (
          <div className="gba:flex gba:items-center gba:gap-2">
            {ticket.status ? (
              <Badge variant={getStatusBadgeVariant(ticket.status)} size="sm">
                {ticket.status}
              </Badge>
            ) : null}
            {ticket.createdAt ? (
              <span className="gba:text-xs gba:text-muted-foreground">{formatDate(ticket.createdAt)}</span>
            ) : null}
          </div>
        )
      })),
    [tickets, t]
  )

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-service-tickets-view">
      <Customer360Section
        title={t('tab-service-tickets')}
        icon={LifebuoyIcon}
        count={loading ? undefined : tickets.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={rows.length === 0}
        emptyTitle={t('tickets-empty-title')}
        emptyDescription={t('tickets-empty-description')}
        testId="customer-360-service-tickets-section"
      >
        <Customer360List rows={rows} testId="customer-360-service-tickets-list" />
      </Customer360Section>
    </div>
  )
}

export default ServiceTicketsView
export { ServiceTicketsView }
