import React, { useCallback, useMemo } from 'react'
import { Button, Card, CardContent, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { SquaresFourIcon, RobotIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360Metric from '../../components/Customer360Metric'
import Customer360JournalFeed from '../../components/Customer360JournalFeed'
import { isOpenStatus } from '../../utils/statusBadge'
import { formatCurrency } from '../../utils/format'

export interface OverviewViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

function buildAgentHref(): string {
  if (typeof window === 'undefined') return '?tab=agent'
  const params = new URLSearchParams(window.location.search)
  params.set('tab', 'agent')
  return `${window.location.pathname}?${params.toString()}`
}

/**
 * Overview tab — at-a-glance counts, a condensed journal feed and an entry point
 * into the scoped agent experience.
 */
const OverviewView: React.FC<OverviewViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)

  // Switch to the agent tab client-side (RecordLayout reads the active tab from
  // the URL via the popstate listener in Customer360Content). Modifier-clicks
  // fall through to the anchor's href so the tab can still be opened in a new tab.
  const handleOpenAgent = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    if (typeof window === 'undefined') return
    event.preventDefault()
    window.history.pushState(null, '', buildAgentHref())
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  const summary = useMemo(() => {
    const contracts = snapshot.contracts ?? []
    const tickets = snapshot.tickets ?? []
    const cases = snapshot.cases ?? []
    const invoices = snapshot.invoices ?? []
    return {
      contracts: contracts.length,
      openTickets: tickets.filter(ticket => isOpenStatus(ticket.status)).length,
      openCases: cases.filter(customerCase => isOpenStatus(customerCase.status)).length,
      openInvoices: invoices.filter(invoice => isOpenStatus(invoice.status)).length,
      lifetimeValue: snapshot.balance?.lifetimeValue,
      currency: snapshot.balance?.currency
    }
  }, [snapshot])

  return (
    <div
      className="gba:col-span-12 gba:grid gba:grid-cols-1 gba:gap-4 gba:items-start gba:lg:grid-cols-3"
      data-testid="customer-360-overview-view"
    >
      <div className="gba:flex gba:flex-col gba:gap-4 gba:lg:col-span-2">
        <Customer360Section
          title={t('overview-snapshot-title')}
          icon={SquaresFourIcon}
          errorTitle={t('error-title')}
          emptyTitle={t('overview-snapshot-title')}
          testId="customer-360-overview-snapshot"
        >
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:sm:grid-cols-3">
            <Customer360Metric label={t('kpi-active-contracts')} testId="customer-360-overview-contracts">
              {summary.contracts}
            </Customer360Metric>
            <Customer360Metric label={t('kpi-open-tickets')} testId="customer-360-overview-tickets">
              {summary.openTickets}
            </Customer360Metric>
            <Customer360Metric label={t('overview-open-cases')} testId="customer-360-overview-cases">
              {summary.openCases}
            </Customer360Metric>
            <Customer360Metric label={t('kpi-open-invoices')} testId="customer-360-overview-invoices">
              {summary.openInvoices}
            </Customer360Metric>
            <Customer360Metric label={t('kpi-lifetime-value')} testId="customer-360-overview-lifetime">
              {formatCurrency(summary.lifetimeValue, summary.currency) || '—'}
            </Customer360Metric>
          </div>
        </Customer360Section>

        <Customer360JournalFeed
          entries={snapshot.journal ?? []}
          loading={loading}
          limit={8}
          titleKey="overview-recent-activity"
          testId="customer-360-overview-journal"
        />
      </div>

      <Card variant="decorative" data-testid="customer-360-overview-ask-agent">
        <CardContent className="gba:flex gba:flex-col gba:gap-3 gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <RobotIcon className="gba:size-5" />
            <span className="gba:text-base gba:font-semibold">{t('overview-ask-agent-title')}</span>
          </div>
          <p className="gba:text-sm">{t('overview-ask-agent-description')}</p>
          <Button asChild variant="secondary" size="sm">
            <a href={buildAgentHref()} onClick={handleOpenAgent} data-testid="customer-360-overview-ask-agent-cta">
              {t('overview-ask-agent-cta')}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default OverviewView
export { OverviewView }
