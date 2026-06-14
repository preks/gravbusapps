import React, { useCallback } from 'react'
import { Badge, Button, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, ChatCircleDotsIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import {
  formatTimestamp,
  runStatusVisual,
  shortenInput
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/runDisplay'
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import customer360I18n from '../../../_i18n'
import Customer360Section from '../../../shared/Customer360Section'
import type { Customer360Subject } from '../../../data/types'
import { useCustomerAgentRuns } from '../../../data/record/hooks/useCustomerAgentRuns'
import { readInputMeta, readTriggerField } from '../../../home/views/inbound/inboundRunFields'

export interface CustomerAgentRunsSectionProps {
  accessToken: string
  subject: Customer360Subject
}

/**
 * Inbound agent activity for this customer — EveryFabric Workforce runs that
 * resolved to this account/contact (via the persisted `customer_ref`). Sits
 * beside the flow-based Service Tickets so the operator sees both the durable
 * ticket and the agent run that produced it.
 */
const CustomerAgentRunsSection: React.FC<CustomerAgentRunsSectionProps> = ({ accessToken, subject }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { data: runs, loading, error } = useCustomerAgentRuns(accessToken, subject)

  const handleOpenRun = useCallback((run: WorkforceRun) => {
    const agentId = run.agent_id || ''
    if (!agentId) return
    navigateTo(
      buildPlatformUrl(Navigation.EVERY_FABRIC, {
        view: 'enterprise-workforce',
        agentId,
        tab: 'runs',
        runId: run.session_id
      })
    )
  }, [])

  return (
    <Customer360Section
      title={t('agent-runs-title')}
      icon={ChatCircleDotsIcon}
      count={loading ? undefined : runs.length}
      loading={loading}
      error={error}
      errorTitle={t('error-title')}
      isEmpty={!loading && runs.length === 0}
      emptyTitle={t('agent-runs-empty-title')}
      emptyDescription={t('agent-runs-empty-description')}
      testId="customer-360-agent-runs-section"
    >
      <div className="gba:overflow-x-auto" data-testid="customer-360-agent-runs-table">
        <table className="gba:min-w-full gba:text-left gba:text-sm">
          <thead className="gba:text-xs gba:font-medium gba:uppercase gba:text-muted-foreground">
            <tr>
              <th className="gba:px-3 gba:py-2">{t('inbound-col-from')}</th>
              <th className="gba:px-3 gba:py-2">{t('inbound-col-subject')}</th>
              <th className="gba:px-3 gba:py-2">{t('inbound-col-status')}</th>
              <th className="gba:px-3 gba:py-2">{t('inbound-col-received')}</th>
              <th className="gba:px-3 gba:py-2" />
            </tr>
          </thead>
          <tbody className="gba:divide-y gba:divide-border">
            {runs.map(run => {
              const visual = runStatusVisual(run.status)
              const from = readTriggerField(run, 'from') || readInputMeta(run, 'from') || '—'
              const subjectText =
                readTriggerField(run, 'subject') || readInputMeta(run, 'subject') || shortenInput(run.input, 80) || '—'
              return (
                <tr key={run.session_id} data-testid={`customer-360-agent-run-row-${run.session_id}`}>
                  <td className="gba:max-w-48 gba:truncate gba:px-3 gba:py-2 gba:text-foreground">{from}</td>
                  <td className="gba:max-w-64 gba:truncate gba:px-3 gba:py-2 gba:text-foreground">{subjectText}</td>
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
                      onClick={() => handleOpenRun(run)}
                      data-testid={`customer-360-agent-run-open-${run.session_id}`}
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
    </Customer360Section>
  )
}

export default CustomerAgentRunsSection
export { CustomerAgentRunsSection }
