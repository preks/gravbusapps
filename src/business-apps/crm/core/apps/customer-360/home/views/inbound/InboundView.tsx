import React, { useCallback } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import {
  TrayIcon,
  SparkleIcon,
  MagnifyingGlassIcon,
  UserCircleCheckIcon,
  PaperPlaneTiltIcon,
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon
} from '@phosphor-icons/react'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import customer360I18n from '../../../_i18n'
import Customer360Section from '../../../components/Customer360Section'
import type { Customer360HomeViewProps } from '../../types'
import InboundStream from './InboundStream'
import { useInboundRuns } from './useInboundRuns'

const TEST_ID = 'customer-360-inbound-view'

const FLOW_STEPS = [
  { icon: TrayIcon, key: 'inbound-step-receive' },
  { icon: MagnifyingGlassIcon, key: 'inbound-step-match' },
  { icon: UserCircleCheckIcon, key: 'inbound-step-context' },
  { icon: PaperPlaneTiltIcon, key: 'inbound-step-draft' }
] as const

/**
 * Inbound triage — incoming emails auto-matched to a customer ("we know who it
 * is") with an agent draft-reply handoff. The live stream is powered by the
 * EveryFabric Workforce: the "Customer 360 Analyst" agent's inbound-email
 * trigger starts a run per email, and `useInboundRuns` lists those runs.
 */
const InboundView: React.FC<Customer360HomeViewProps> = ({ openCustomer, accessToken }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const inbound = useInboundRuns(accessToken)

  const handleAskAgent = useCallback(() => {
    openEveryAI({
      prompt: t('inbound-agent-prompt'),
      newSession: true
    })
  }, [t])

  const handleOpenRun = useCallback(
    (run: WorkforceRun) => {
      if (!inbound.agentId) return
      navigateTo(
        buildPlatformUrl(Navigation.EVERY_FABRIC, {
          view: 'enterprise-workforce',
          agentId: inbound.agentId,
          tab: 'runs',
          runId: run.session_id
        })
      )
    },
    [inbound.agentId]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={TEST_ID}>
      <Card variant="decorative">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <TrayIcon className="gba:size-5 gba:text-card-decorative-foreground" />
            <CardTitle>{t('inbound-title')}</CardTitle>
          </div>
          <CardDescription>{t('inbound-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2 gba:lg:grid-cols-4">
            {FLOW_STEPS.map(step => {
              const StepIcon = step.icon
              return (
                <div
                  key={step.key}
                  className="gba:flex gba:flex-col gba:gap-2 gba:rounded-lg gba:border gba:border-card-decorative-foreground/20 gba:bg-card-decorative-foreground/10 gba:p-4"
                >
                  <StepIcon className="gba:size-5 gba:text-card-decorative-foreground" />
                  <span className="gba:text-sm gba:text-card-decorative-foreground">{t(step.key)}</span>
                </div>
              )
            })}
          </div>
          <div>
            <Button variant="default" onClick={handleAskAgent} data-testid={`${TEST_ID}-ask`}>
              <SparkleIcon className="gba:size-4" />
              {t('inbound-agent-button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Customer360Section
        title={t('inbound-stream-title')}
        icon={TrayIcon}
        count={inbound.total}
        loading={inbound.loading}
        error={inbound.error}
        errorTitle={t('error-title')}
        isEmpty={!inbound.loading && inbound.runs.length === 0}
        emptyTitle={inbound.agentMissing ? t('inbound-agent-missing-title') : t('inbound-stream-empty-title')}
        emptyDescription={
          inbound.agentMissing ? t('inbound-agent-missing-description') : t('inbound-stream-empty-description')
        }
        testId={`${TEST_ID}-stream`}
        action={
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              value={inbound.search}
              onChange={event => inbound.setSearch(event.target.value)}
              placeholder={t('inbound-search-placeholder')}
              className="gba:w-48"
              data-testid={`${TEST_ID}-search`}
            />
            <Button variant="ghost" size="sm" onClick={inbound.refetch} data-testid={`${TEST_ID}-refresh`}>
              <ArrowClockwiseIcon className="gba:size-4" />
              {t('inbound-refresh')}
            </Button>
          </div>
        }
      >
        <div className="gba:flex gba:flex-col gba:gap-3">
          <InboundStream runs={inbound.runs} onOpenRun={handleOpenRun} onOpenCustomer={openCustomer} />
          {inbound.totalPages > 1 ? (
            <div className="gba:flex gba:items-center gba:justify-between gba:pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={inbound.page <= 0}
                onClick={() => inbound.setPage(inbound.page - 1)}
                data-testid={`${TEST_ID}-prev`}
              >
                <CaretLeftIcon className="gba:size-4" />
                {t('inbound-prev')}
              </Button>
              <span className="gba:text-xs gba:text-muted-foreground">
                {t('inbound-pagination', { page: inbound.page + 1, total: inbound.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={inbound.page >= inbound.totalPages - 1}
                onClick={() => inbound.setPage(inbound.page + 1)}
                data-testid={`${TEST_ID}-next`}
              >
                {t('inbound-next')}
                <CaretRightIcon className="gba:size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </Customer360Section>
    </div>
  )
}

export default InboundView
export { InboundView }
