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
import { openEveryFabric } from '@/common/utils/openEveryFabric'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import customer360I18n from '../../../_i18n'
import AttentionList from '../../components/AttentionList'
import { buildPortfolioHandoff } from './portfolioHandoff'
import type { Customer360HomeViewProps } from '../../types'

const TEST_ID = 'customer-360-portfolio-agent-view'
const PREVIEW_LIMIT = 5

/**
 * Portfolio Agent cockpit — hands the whole book of business to the Customer 360
 * Analyst workforce agent for triage, and links into Enterprise Workforce where
 * the agent's runs and recommendations live.
 */
const PortfolioAgentView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, stats, loading } = portfolio

  const handoff = useMemo(() => buildPortfolioHandoff(rows, stats), [rows, stats])
  const topRows = useMemo(() => rows.filter(row => row.attentionReasons.length > 0), [rows])

  const handleTriage = useCallback(() => {
    const prompt = handoff.additionInfo ? `${handoff.prompt}\n\nContext:\n${handoff.additionInfo}` : handoff.prompt
    openEveryFabric({ prompt })
  }, [handoff])

  const handleOpenWorkforce = useCallback(() => {
    navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={TEST_ID}>
      <Card variant="decorative">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <RobotIcon className="gba:size-5 gba:text-card-decorative-foreground" />
            <CardTitle>{t('portfolio-agent-title')}</CardTitle>
          </div>
          <CardDescription>{t('portfolio-agent-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-4">
          <div className="gba:rounded-md gba:border gba:border-card-decorative-foreground/20 gba:bg-card-decorative-foreground/10 gba:p-4">
            <p className="gba:text-sm gba:font-medium gba:text-card-decorative-foreground">
              {t('portfolio-agent-context-title')}
            </p>
            <p className="gba:mt-1 gba:text-sm gba:text-card-decorative-foreground/70">
              {t('portfolio-agent-context-hint')}
            </p>
          </div>
          <div className="gba:flex gba:flex-col gba:gap-2 gba:sm:flex-row">
            <Button variant="default" onClick={handleTriage} disabled={loading} data-testid={`${TEST_ID}-triage`}>
              <SparkleIcon className="gba:size-4" />
              {t('portfolio-agent-triage-button')}
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

      <Card variant="surface">
        <CardHeader>
          <CardTitle className="gba:text-base">{t('portfolio-agent-focus-title')}</CardTitle>
          <CardDescription>{t('portfolio-agent-focus-hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AttentionList
            rows={topRows}
            openCustomer={openCustomer}
            limit={PREVIEW_LIMIT}
            testId={`${TEST_ID}-focus-list`}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default PortfolioAgentView
export { PortfolioAgentView }
