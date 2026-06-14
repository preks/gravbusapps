import React, { useCallback, useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import { RobotIcon, SparkleIcon, StorefrontIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { openEveryFabric } from '@/common/utils/openEveryFabric'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../../data/types'
import { buildCustomer360Handoff } from '../../agent/agentHandoff'

export interface AgentViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

const TEST_ID = 'customer-360-agent-view'

/**
 * Agent tab — Every Fabric / Every AI context handoff.
 */
const AgentView: React.FC<AgentViewProps> = ({ subject, snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)

  const handoff = useMemo(() => buildCustomer360Handoff(subject, snapshot), [subject, snapshot])

  const handleAskAgent = useCallback(() => {
    const prompt = handoff.additionInfo ? `${handoff.prompt}\n\nContext:\n${handoff.additionInfo}` : handoff.prompt
    openEveryFabric({ prompt })
  }, [handoff])

  const handleOpenWorkforce = useCallback(() => {
    const url = buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' })
    navigateTo(url)
  }, [])

  return (
    <div className="gba:col-span-12" data-testid={TEST_ID}>
      <Card variant="surface">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <RobotIcon className="gba:size-5 gba:text-primary" />
            <CardTitle>{t('agent-panel-title')}</CardTitle>
          </div>
          <CardDescription>{t('agent-panel-description', { name: subject.displayName })}</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-4">
          <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted gba:p-4">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('agent-context-title')}</p>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('agent-context-hint')}</p>
          </div>
          <div className="gba:flex gba:flex-col gba:gap-2 gba:sm:flex-row">
            <Button variant="default" onClick={handleAskAgent} disabled={loading} data-testid={`${TEST_ID}-ask`}>
              <SparkleIcon className="gba:size-4" />
              {t('agent-ask-button')}
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenWorkforce}
              disabled={loading}
              data-testid={`${TEST_ID}-workforce`}
            >
              <StorefrontIcon className="gba:size-4" />
              {t('agent-workforce-button')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AgentView
export { AgentView }
