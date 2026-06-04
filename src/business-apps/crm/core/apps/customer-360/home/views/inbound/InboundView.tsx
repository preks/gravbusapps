import React, { useCallback } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import {
  TrayIcon,
  SparkleIcon,
  MagnifyingGlassIcon,
  UserCircleCheckIcon,
  PaperPlaneTiltIcon
} from '@phosphor-icons/react'
import { openEveryAI } from '@/common/utils/openEveryAI'
import customer360I18n from '../../../_i18n'
import Customer360Section from '../../../components/Customer360Section'
import type { Customer360HomeViewProps } from '../../types'

const TEST_ID = 'customer-360-inbound-view'

const FLOW_STEPS = [
  { icon: TrayIcon, key: 'inbound-step-receive' },
  { icon: MagnifyingGlassIcon, key: 'inbound-step-match' },
  { icon: UserCircleCheckIcon, key: 'inbound-step-context' },
  { icon: PaperPlaneTiltIcon, key: 'inbound-step-draft' }
] as const

/**
 * Inbound triage — incoming email/ticket stream auto-matched to a customer
 * ("we know who it is") with an agent draft-reply handoff. The live stream is
 * sourced from the planned customer-service inbound endpoint; until then this
 * surfaces the triage concept and lets the agent draft replies on demand.
 */
const InboundView: React.FC<Customer360HomeViewProps> = ({ portfolio }) => {
  const { t } = useFluentTranslation(customer360I18n)

  const handleAskAgent = useCallback(() => {
    openEveryAI({
      prompt: t('inbound-agent-prompt'),
      newSession: true
    })
  }, [t])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={TEST_ID}>
      <Card variant="decorative">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <TrayIcon className="gba:size-5 gba:text-primary" />
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
                  className="gba:flex gba:flex-col gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:p-4"
                >
                  <StepIcon className="gba:size-5 gba:text-primary" />
                  <span className="gba:text-sm gba:text-foreground">{t(step.key)}</span>
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
        loading={portfolio.loading}
        errorTitle={t('error-title')}
        isEmpty
        emptyTitle={t('inbound-stream-empty-title')}
        emptyDescription={t('inbound-stream-empty-description')}
        testId={`${TEST_ID}-stream`}
      />
    </div>
  )
}

export default InboundView
export { InboundView }
