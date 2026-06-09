import React from 'react'
import { Badge, Button, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, UserCircleCheckIcon } from '@phosphor-icons/react'
import {
  formatTimestamp,
  runStatusVisual,
  shortenInput
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/runDisplay'
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import customer360I18n from '../../../_i18n'
import type { CustomerSubjectType } from '../../../data/types'
import { readInputMeta, readSenderEmail, readTriggerField } from './inboundRunFields'
import type { InboundCustomerMatch } from './resolveCustomersByEmail'

export interface InboundStreamProps {
  runs: WorkforceRun[]
  onOpenRun: (run: WorkforceRun) => void
  onOpenCustomer: (type: CustomerSubjectType, id: string) => void
  /** View-time fallback matches keyed by lowercased sender email. */
  emailMatches?: Record<string, InboundCustomerMatch>
}

interface MatchedCustomer {
  type: CustomerSubjectType
  id: string
  label: string
}

/**
 * The customer this run is about. Preference order:
 * 1. persisted `customer_ref` (written by the backend when the run resolved
 *    the customer itself),
 * 2. derived `case_ref` from the run trace,
 * 3. view-time email resolution with the viewer's token (`emailMatches`).
 */
function readMatchedCustomer(
  run: WorkforceRun,
  emailMatches?: Record<string, InboundCustomerMatch>
): MatchedCustomer | null {
  const customerRef = run.customer_ref
  if (customerRef?.customerId && (customerRef.customerType === 'account' || customerRef.customerType === 'contact')) {
    return {
      type: customerRef.customerType,
      id: customerRef.customerId,
      label: customerRef.displayName || customerRef.customerId
    }
  }
  const caseRef = run.case_ref
  if (caseRef?.record_id) {
    const entity = (caseRef.entity_type ?? '').trim().toLowerCase()
    if (entity === 'account' || entity === 'contact') {
      const label = caseRef.record_labels?.[caseRef.record_id]
      return { type: entity, id: caseRef.record_id, label: label || caseRef.record_id }
    }
  }
  if (emailMatches) {
    const sender = readSenderEmail(run)
    const fallback = sender ? emailMatches[sender] : undefined
    if (fallback) return { type: fallback.type, id: fallback.id, label: fallback.label }
  }
  return null
}

/** The inbound run table — sender, subject, matched customer, status, time. */
const InboundStream: React.FC<InboundStreamProps> = ({ runs, onOpenRun, onOpenCustomer, emailMatches }) => {
  const { t } = useFluentTranslation(customer360I18n)
  return (
    <div className="gba:overflow-x-auto" data-testid="customer-360-inbound-stream-table">
      <table className="gba:min-w-full gba:text-left gba:text-sm">
        <thead className="gba:text-xs gba:font-medium gba:uppercase gba:text-muted-foreground">
          <tr>
            <th className="gba:px-3 gba:py-2">{t('inbound-col-from')}</th>
            <th className="gba:px-3 gba:py-2">{t('inbound-col-subject')}</th>
            <th className="gba:px-3 gba:py-2">{t('inbound-col-customer')}</th>
            <th className="gba:px-3 gba:py-2">{t('inbound-col-status')}</th>
            <th className="gba:px-3 gba:py-2">{t('inbound-col-received')}</th>
            <th className="gba:px-3 gba:py-2" />
          </tr>
        </thead>
        <tbody className="gba:divide-y gba:divide-border">
          {runs.map(run => {
            const visual = runStatusVisual(run.status)
            const from = readTriggerField(run, 'from') || readInputMeta(run, 'from') || '—'
            const subject =
              readTriggerField(run, 'subject') || readInputMeta(run, 'subject') || shortenInput(run.input, 80) || '—'
            const customer = readMatchedCustomer(run, emailMatches)
            return (
              <tr key={run.session_id} data-testid={`customer-360-inbound-row-${run.session_id}`}>
                <td className="gba:max-w-48 gba:truncate gba:px-3 gba:py-2 gba:text-foreground">{from}</td>
                <td className="gba:max-w-64 gba:truncate gba:px-3 gba:py-2 gba:text-foreground">{subject}</td>
                <td className="gba:px-3 gba:py-2">
                  {customer ? (
                    <button
                      type="button"
                      onClick={() => onOpenCustomer(customer.type, customer.id)}
                      className="gba:flex gba:items-center gba:gap-1.5 gba:text-left gba:text-sm gba:text-foreground gba:hover:underline"
                      data-testid={`customer-360-inbound-open-customer-${run.session_id}`}
                    >
                      <UserCircleCheckIcon className="gba:size-4 gba:shrink-0 gba:text-muted-foreground" />
                      <span className="gba:truncate">{customer.label}</span>
                    </button>
                  ) : (
                    <span className="gba:text-muted-foreground">{t('inbound-customer-unmatched')}</span>
                  )}
                </td>
                <td className="gba:px-3 gba:py-2">
                  <Badge variant="outline" size="sm" className={visual.pillClass}>
                    {visual.label}
                  </Badge>
                </td>
                <td className="gba:whitespace-nowrap gba:px-3 gba:py-2 gba:text-muted-foreground">
                  {formatTimestamp(run.created_at)}
                </td>
                <td className="gba:px-3 gba:py-2 gba:text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenRun(run)}
                    data-testid={`customer-360-inbound-open-run-${run.session_id}`}
                  >
                    <ArrowSquareOutIcon className="gba:size-4" />
                    {t('inbound-open-run')}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default InboundStream
export { InboundStream }
