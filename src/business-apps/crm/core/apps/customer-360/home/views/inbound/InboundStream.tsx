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

export interface InboundStreamProps {
  runs: WorkforceRun[]
  onOpenRun: (run: WorkforceRun) => void
  onOpenCustomer: (type: CustomerSubjectType, id: string) => void
}

interface MatchedCustomer {
  type: CustomerSubjectType
  id: string
  label: string
}

function readTriggerField(run: WorkforceRun, field: string): string {
  const payload = run.trigger_payload
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Fallback when the trigger payload has no structured sender/subject: the
 * inbound forwarder embeds them in the run input text as
 * `Inbound email from <addr>` / `Subject: <subject>`. Parse those so the
 * stream still shows who wrote and about what.
 */
function readInputMeta(run: WorkforceRun, field: 'from' | 'subject'): string {
  const input = run.input
  if (!input) return ''
  if (field === 'from') {
    const match = input.match(/from[:\s]+([^\s<>"']+@[^\s<>"']+)/i)
    return match ? match[1].trim() : ''
  }
  const match = input.match(/^\s*subject[:\s]+(.+)$/im)
  return match ? match[1].trim() : ''
}

/** The customer the agent matched, derived from the run's case reference. */
function readMatchedCustomer(run: WorkforceRun): MatchedCustomer | null {
  const caseRef = run.case_ref
  if (!caseRef?.record_id) return null
  const entity = (caseRef.entity_type ?? '').trim().toLowerCase()
  if (entity !== 'account' && entity !== 'contact') return null
  const label = caseRef.record_labels?.[caseRef.record_id]
  return { type: entity, id: caseRef.record_id, label: label || caseRef.record_id }
}

/** The inbound run table — sender, subject, matched customer, status, time. */
const InboundStream: React.FC<InboundStreamProps> = ({ runs, onOpenRun, onOpenCustomer }) => {
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
            const customer = readMatchedCustomer(run)
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
