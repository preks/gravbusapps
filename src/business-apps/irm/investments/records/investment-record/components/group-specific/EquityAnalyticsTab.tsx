import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { TrendingUp, Target, Edit } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ShareholderStructureChart } from './ShareholderStructureChart'
import { LiquidityPreferenceTable } from './LiquidityPreferenceTable'
import { CombinedPpmChartsContainer } from './CombinedPpmChartsContainer'
// TODO: Re-enable once IRR/MOIC data is properly integrated from database instead of hardcoded values
// import { KPIsAtEntryVsCurrentChart } from './KPIsAtEntryVsCurrentChart'

interface EquityAnalyticsTabProps extends BusinessAppContextProps {
  investmentId: string
  investment: any
  equityData: any
}

/**
 * Calculate MOIC (Multiple on Invested Capital)
 * Formula: Market Value / Total Investment Amount
 */
const calculateMOIC = (
  marketValue: number | null | undefined,
  totalInvested: number | null | undefined
): number | null => {
  if (!marketValue || !totalInvested || totalInvested === 0) {
    return null
  }
  return marketValue / totalInvested
}

/**
 * Format MOIC value as a multiplier (e.g., "2.5x")
 */
const formatMOIC = (value: number | null): string => {
  if (value === null) {
    return getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')
  }
  return `${value.toFixed(2)}x`
}

/**
 * Format IRR value as a percentage (e.g., "18.5%")
 */
const formatIRR = (value: number | null): string => {
  if (value === null) {
    return getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')
  }
  return `${value.toFixed(1)}%`
}

export const EquityAnalyticsTab: React.FC<EquityAnalyticsTabProps> = ({ investment, equityData, ...props }) => {
  // Use database MOIC if available, otherwise calculate from market value
  const currentMOIC = investment?.moic
    ? Number(investment.moic)
    : calculateMOIC(investment?.investmentMarketValue, investment?.totalInvestmentAmount)

  // Read KPI forecasts from additionalProperties.kpis
  const equityInvestment = Array.isArray(equityData?.equityInvestment)
    ? equityData.equityInvestment[0]
    : equityData?.equityInvestment

  let additionalProps = equityInvestment?.additionalProperties || {}
  if (typeof additionalProps === 'string') {
    try {
      additionalProps = JSON.parse(additionalProps)
    } catch {
      additionalProps = {}
    }
  }

  const kpis = additionalProps?.kpis || {}
  const plannedMOIC = kpis.moic ? Number.parseFloat(kpis.moic) : null
  const plannedIRR = kpis.irr ? Number.parseFloat(kpis.irr) : null

  // Current IRR from real investment data
  const currentIRR = investment?.irr ? Number(investment.irr) : null

  return (
    <div data-testid="equity-analytics-tab">
      {/* Title and Description */}
      <div className="gba:mb-8">
        <h2 className="gba:text-2xl gba:font-semibold gba:mb-2" data-testid="analytics-title">
          {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.title', 'Investment Analytics')}
        </h2>
        <p className="gba:text-muted-foreground" data-testid="analytics-description">
          {getTranslationFromI18nKeyAndLabel(
            'crm.investments.analytics.description',
            'Key performance indicators for this equity investment'
          )}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mb-6">
        {/* MOIC Card */}
        <Card data-testid="moic-card" className="gba:border gba:shadow-sm">
          <CardHeader className="gba:pb-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:rounded-lg gba:bg-primary/10">
                  <TrendingUp className="gba:h-6 gba:w-6 gba:text-primary" />
                </div>
                <div>
                  <CardTitle className="gba:text-lg gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.moic', 'MOIC')}
                  </CardTitle>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'crm.investments.analytics.moic.subtitle',
                      'Multiple on Invested Capital'
                    )}
                  </p>
                </div>
              </div>

              {/* Edit Planned MOIC Button */}
              <AppAction
                contextsArray={[FlowContextName.investmentKpiForecastUpdate]}
                externalContextData={{
                  investmentId: investment?.id,
                  scope: 'kpiforecast',
                  key: 'moic'
                }}
                accessToken={props.accessToken}
                emptyStateBehavior="hide"
                data-testid="moic-edit-action"
              >
                <Button size="sm" variant="default" type="button" data-testid="moic-edit-button">
                  <Edit size={16} />
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.moic.edit', 'Edit Planned')}
                </Button>
              </AppAction>
            </div>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:gap-8 gba:mb-6">
              {/* Current MOIC */}
              <div className="gba:flex-1" data-testid="moic-current">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.current', 'Current')}
                </div>
                <div className="gba:text-4xl gba:font-bold gba:text-primary gba:mb-2" data-testid="moic-current-value">
                  {formatMOIC(currentMOIC)}
                </div>
                {currentMOIC !== null && (
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {investment?.moic
                      ? getTranslationFromI18nKeyAndLabel('crm.investments.analytics.moic.stored', 'From database')
                      : getTranslationFromI18nKeyAndLabel(
                          'crm.investments.analytics.moic.calculated',
                          'Calculated from market value'
                        )}
                  </div>
                )}
              </div>

              {/* Planned MOIC */}
              <div className="gba:flex-1" data-testid="moic-planned">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.planned', 'Planned')}
                </div>
                <div className="gba:text-4xl gba:font-bold gba:text-success gba:mb-2" data-testid="moic-planned-value">
                  {formatMOIC(plannedMOIC)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.moic.target', 'Target multiplier')}
                </div>
              </div>
            </div>

            {/* Formula explanation */}
            <div className="gba:pt-4 gba:border-t gba:border-border">
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'crm.investments.analytics.moic.description',
                  'Market Value / Total Investment Amount'
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* IRR Card */}
        <Card data-testid="irr-card" className="gba:border gba:shadow-sm">
          <CardHeader className="gba:pb-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:rounded-lg gba:bg-success/10">
                  <Target className="gba:h-6 gba:w-6 gba:text-success" />
                </div>
                <div>
                  <CardTitle className="gba:text-lg gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.irr', 'IRR')}
                  </CardTitle>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'crm.investments.analytics.irr.subtitle',
                      'Internal Rate of Return'
                    )}
                  </p>
                </div>
              </div>

              {/* Edit Planned IRR Button */}
              <AppAction
                contextsArray={[FlowContextName.investmentKpiForecastUpdate]}
                externalContextData={{
                  investmentId: investment?.id,
                  scope: 'kpiforecast',
                  key: 'irr'
                }}
                accessToken={props.accessToken}
                emptyStateBehavior="hide"
                data-testid="irr-edit-action"
              >
                <Button size="sm" variant="default" type="button" data-testid="irr-edit-button">
                  <Edit size={16} />
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.irr.edit', 'Edit Planned')}
                </Button>
              </AppAction>
            </div>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:gap-8 gba:mb-6">
              {/* Current IRR */}
              <div className="gba:flex-1" data-testid="irr-current">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.current', 'Current')}
                </div>
                <div className="gba:text-4xl gba:font-bold gba:text-primary gba:mb-2" data-testid="irr-current-value">
                  {formatIRR(currentIRR)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'crm.investments.analytics.irr.current.description',
                    'Actual return rate'
                  )}
                </div>
              </div>

              {/* Planned IRR */}
              <div className="gba:flex-1" data-testid="irr-planned">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.planned', 'Planned')}
                </div>
                <div className="gba:text-4xl gba:font-bold gba:text-success gba:mb-2" data-testid="irr-planned-value">
                  {formatIRR(plannedIRR)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.irr.target', 'Target return rate')}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="gba:pt-4 gba:border-t gba:border-border">
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'crm.investments.analytics.irr.description',
                  'Annualized rate of return considering timing of cash flows'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shareholder Structure and Liquidity Preference - Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mb-6">
        {/* Shareholder Structure Chart */}
        <ShareholderStructureChart investment={investment} {...props} />

        {/* Liquidity Preference Table */}
        <LiquidityPreferenceTable investment={investment} {...props} />
      </div>

      {/* Combined PPM Charts Container - Revenue Forecast + Plan vs Actual */}
      <div className="gba:mb-6">
        <CombinedPpmChartsContainer investment={investment} equityData={equityData} {...props} />
      </div>

      {/* TODO: KPIs at Entry vs Current - Temporarily hidden
          This chart needs to be updated to use real IRR/MOIC data from the database:
          - Current IRR/MOIC should come from investment.irr and investment.moic fields
          - Target/Planned IRR/MOIC should come from additionalProperties.kpis
          - "At Entry" data should come from the oldest investment report
          - Remove hardcoded values for Net Debt, Net Debt/EBITDA, Target MOIC, and Target IRR
          Re-enable by uncommenting the import and the component below
      */}
      {/* <div className="gba:mb-6">
        <KPIsAtEntryVsCurrentChart investment={investment} equityData={equityData} {...props} />
      </div> */}
    </div>
  )
}

export default EquityAnalyticsTab
