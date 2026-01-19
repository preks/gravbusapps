import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button } from '@newwork/nw-design-system'
import { PencilIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { RevenueForecastChart } from './RevenueForecastChart'
import { EquityPerformanceChart } from './EquityPerformanceChart'

interface CombinedPpmChartsContainerProps extends BusinessAppContextProps {
  investment: any
  equityData: any
}

/**
 * Combined container for both PPM charts with shared data source
 * - Revenue Forecast Chart: Shows actual data + future forecasts (year > currentYear)
 * - Plan vs. Actual Chart: Shows actual data + past/current forecasts (year <= currentYear)
 * Both charts read from the same source: additionalProperties.forecasts
 */
export const CombinedPpmChartsContainer: React.FC<CombinedPpmChartsContainerProps> = ({
  investment,
  equityData,
  ...props
}) => {
  return (
    <Card data-testid="combined-ppm-charts-container" className="gba:border gba:shadow-sm">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <CardTitle className="gba:text-xl gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.ppm.title', 'PPM Analysis')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.ppm.description',
                '5-year rolling window of actual vs. planned performance, plus future forecasts. Charts automatically update as time progresses.'
              )}
            </CardDescription>
          </div>

          {/* Single Update Forecasts Button for both charts */}
          <AppAction
            contextsArray={[FlowContextName.investmentPpmForecastUpdate]}
            externalContextData={{
              investmentId: investment?.id,
              scope: 'ppmforecast'
            }}
            accessToken={props.accessToken}
            emptyStateBehavior="hide"
            data-testid="combined-update-forecasts-action"
          >
            <Button size="sm" variant="default" type="button" data-testid="combined-update-forecasts-button">
              <PencilIcon size={16} />
              {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.ppm.updateForecasts', 'Update Forecasts')}
            </Button>
          </AppAction>
        </div>
      </CardHeader>

      <CardContent>
        <div className="gba:space-y-6">
          {/* Future-Focused Chart: Actual + Future Forecasts */}
          <div data-testid="future-forecast-section">
            <RevenueForecastChart investment={investment} equityData={equityData} hideUpdateButton {...props} />
          </div>

          {/* Past-Focused Chart: Actual + Past/Current Plans */}
          <div data-testid="past-plan-section">
            <EquityPerformanceChart equityData={equityData} {...props} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CombinedPpmChartsContainer
