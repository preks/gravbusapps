import React, { useState } from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon, LifebuoyIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot, Customer360Subject, CustomerTicket } from '../../../data/types'
import Customer360Section from '../../../shared/Customer360Section'
import { Customer360Row } from '../../../shared/Customer360List'
import { formatDate } from '../../../utils/format'
import { getStatusBadgeVariant } from '../../../utils/statusBadge'
import CustomerAgentRunsSection from './CustomerAgentRunsSection'
import TicketDetailPanel from './TicketDetailPanel'

export interface ServiceTicketsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

interface TicketRowProps {
  ticket: CustomerTicket
  expanded: boolean
  onToggle: () => void
  accessToken: string
}

const TicketRow: React.FC<TicketRowProps> = ({ ticket, expanded, onToggle, accessToken }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const CaretIcon = expanded ? CaretDownIcon : CaretRightIcon

  return (
    <div className="gba:flex gba:flex-col">
      <Customer360Row
        row={{
          id: ticket.id,
          icon: LifebuoyIcon,
          primary: ticket.title || t('tickets-untitled'),
          secondary: ticket.priority ? t('tickets-priority', { priority: ticket.priority }) : undefined,
          testId: `customer-360-ticket-${ticket.id}`,
          onClick: onToggle,
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
              <CaretIcon className="gba:size-4 gba:text-muted-foreground" />
            </div>
          )
        }}
      />
      {expanded ? <TicketDetailPanel accessToken={accessToken} ticket={ticket} /> : null}
    </div>
  )
}

/**
 * Service Tickets tab — custom-flow-engine flow instances correlated to the
 * customer. Each row expands to the flow's step list (with statuses) and
 * deep-links into the Service Desk.
 */
const ServiceTicketsView: React.FC<ServiceTicketsViewProps> = ({ subject, snapshot, loading, ...props }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const tickets = snapshot.tickets ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-service-tickets-view">
      <Customer360Section
        title={t('tab-service-tickets')}
        icon={LifebuoyIcon}
        count={loading ? undefined : tickets.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={tickets.length === 0}
        emptyTitle={t('tickets-empty-title')}
        emptyDescription={t('tickets-empty-description')}
        testId="customer-360-service-tickets-section"
      >
        <div
          className="gba:flex gba:flex-col gba:divide-y gba:divide-border"
          data-testid="customer-360-service-tickets-list"
        >
          {tickets.map(ticket => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              expanded={expandedId === ticket.id}
              onToggle={() => setExpandedId(current => (current === ticket.id ? null : ticket.id))}
              accessToken={props.accessToken}
            />
          ))}
        </div>
      </Customer360Section>
      <CustomerAgentRunsSection accessToken={props.accessToken} subject={subject} />
    </div>
  )
}

export default ServiceTicketsView
export { ServiceTicketsView }
