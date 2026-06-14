import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import { SquaresFourIcon, TableIcon, WarningCircleIcon, RobotIcon } from '@phosphor-icons/react'
import customer360I18n from '../../_i18n'
import type { CustomerPortfolioStats } from '../../data/portfolio/types'
import type { Customer360HomeViewKey } from '../types'

export interface PortfolioHeroProps {
  stats: CustomerPortfolioStats
  loading?: boolean
  onNavigateView: (view: Customer360HomeViewKey) => void
}

const TEST_ID = 'customer-360-portfolio-hero'

/**
 * Welcoming hero band for the Customer 360 home. Frames the surface as the home
 * of customer data with a dynamic portfolio summary and the primary entry points
 * (explore the book of business, jump to what needs attention, ask the agent).
 *
 * Text colors are inherited from the decorative Card (`card-decorative-foreground`)
 * so the band stays legible on the deep accent background.
 */
const PortfolioHero: React.FC<PortfolioHeroProps> = ({ stats, loading = false, onNavigateView }) => {
  const { t } = useFluentTranslation(customer360I18n)

  return (
    <Card variant="decorative" data-testid={TEST_ID}>
      <CardContent className="gba:flex gba:flex-col gba:gap-6 gba:py-7 gba:lg:flex-row gba:lg:items-center gba:lg:justify-between">
        <div className="gba:flex gba:items-start gba:gap-4">
          <div className="gba:flex gba:size-12 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-card-decorative-foreground/15 gba:text-card-decorative-foreground">
            <SquaresFourIcon className="gba:size-6" weight="duotone" />
          </div>
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <span className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-card-decorative-foreground/70">
              {t('home-hero-eyebrow')}
            </span>
            <CardTitle className="gba:text-2xl">{t('home-hero-title')}</CardTitle>
            <CardDescription className="gba:max-w-prose">
              {t('home-hero-subtitle', {
                total: stats.totalCustomers,
                accounts: stats.totalAccounts,
                attention: stats.needsAttention
              })}
            </CardDescription>
          </div>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-2 gba:sm:flex-row gba:lg:shrink-0">
          <Button
            variant="default"
            onClick={() => onNavigateView('explorer')}
            disabled={loading}
            data-testid={`${TEST_ID}-explore`}
          >
            <TableIcon className="gba:size-4" />
            {t('home-hero-explore')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateView('explorer', { attentionFilter: true })}
            disabled={loading}
            data-testid={`${TEST_ID}-attention`}
          >
            <WarningCircleIcon className="gba:size-4" />
            {t('home-hero-attention')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateView('agent')}
            disabled={loading}
            data-testid={`${TEST_ID}-agent`}
          >
            <RobotIcon className="gba:size-4" />
            {t('home-hero-agent')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PortfolioHero
export { PortfolioHero }
