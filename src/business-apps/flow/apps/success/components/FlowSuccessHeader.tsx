import React, { useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import { TrendingUp } from 'lucide-react'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import translations from '../_i18n'
import { SuccessTimeframeSelect } from './shared'
import type { SuccessTimeframe } from '../utils/timeframe'

interface HeaderSecondaryOption {
  value: string
  label: string
  isActive: boolean
  onClick: () => void
}

interface HeaderTimeframeOption {
  value: SuccessTimeframe
  label: string
}

interface FlowSuccessHeaderProps {
  timeframe: SuccessTimeframe
  timeframeOptions: HeaderTimeframeOption[]
  onTimeframeChange: (value: SuccessTimeframe) => void
  secondaryOptions: HeaderSecondaryOption[]
  scopeBadgeLabel?: string
  emptyStateReason?: 'none' | 'no-flows' | 'no-analytics' | 'selected-flow-no-analytics'
  showHero?: boolean
  showControls?: boolean
  showSecondaryNavigation?: boolean
  showTimeframeControl?: boolean
  heroClassName?: string
  'data-testid'?: string
}

export const FlowSuccessHeader: React.FC<FlowSuccessHeaderProps> = ({
  timeframe,
  timeframeOptions,
  onTimeframeChange,
  secondaryOptions,
  scopeBadgeLabel,
  emptyStateReason = 'none',
  showHero = true,
  showControls = true,
  showSecondaryNavigation = true,
  showTimeframeControl = true,
  heroClassName,
  'data-testid': testId = 'flow-success-header'
}) => {
  const { t } = useTranslation(translations)
  const selectedTimeframeLabel = useMemo(
    () => timeframeOptions.find(option => option.value === timeframe)?.label || timeframe,
    [timeframe, timeframeOptions]
  )
  const heroBadges = [
    { label: `${t('label-timeframe')}: ${selectedTimeframeLabel}` },
    ...(scopeBadgeLabel ? [{ label: `${t('label-flow')}: ${scopeBadgeLabel}` }] : [])
  ]
  const activeSecondaryValue = useMemo(
    () => secondaryOptions.find(option => option.isActive)?.value || secondaryOptions[0]?.value || '',
    [secondaryOptions]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      {showHero ? (
        <CreateHeroHeader
          icon={TrendingUp}
          appLabel={t('app-title')}
          title={t('hero-title')}
          description={t('hero-description')}
          badges={heroBadges}
          className={heroClassName}
          data-testid={`${testId}-hero`}
        />
      ) : null}

      {showControls ? (
        <div className="gba:flex gba:flex-col gba:gap-3">
          <div className="gba:flex gba:flex-col gba:gap-3 gba:xl:flex-row gba:xl:items-center gba:xl:justify-between">
            {showSecondaryNavigation && secondaryOptions.length ? (
              <Tabs
                value={activeSecondaryValue}
                onValueChange={value => {
                  const nextOption = secondaryOptions.find(option => option.value === value)
                  nextOption?.onClick()
                }}
                className="gba:min-w-0 gba:flex-1"
              >
                <TabsList className="gba:h-auto gba:w-fit gba:max-w-full gba:flex-wrap gba:justify-start gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-1">
                  {secondaryOptions.map(option => (
                    <TabsTrigger
                      key={option.value}
                      value={option.value}
                      className={
                        option.isActive
                          ? 'gba:bg-card gba:text-foreground gba:font-semibold gba:shadow-none'
                          : 'gba:bg-transparent gba:text-muted-foreground'
                      }
                      data-testid={`${testId}-secondary-${option.value}`}
                    >
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <div />
            )}

            <div className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-center gba:justify-end gba:gap-3">
              {showTimeframeControl ? (
                <SuccessTimeframeSelect
                  value={timeframe}
                  onChange={onTimeframeChange}
                  options={timeframeOptions}
                  data-testid={`${testId}-timeframe-select`}
                />
              ) : null}
            </div>
          </div>

          {emptyStateReason === 'selected-flow-no-analytics' ? (
            <span className="gba:text-sm gba:text-muted-foreground">{t('header-selected-flow-empty')}</span>
          ) : null}
          {emptyStateReason === 'no-analytics' ? (
            <span className="gba:text-sm gba:text-muted-foreground">{t('header-no-analytics')}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
