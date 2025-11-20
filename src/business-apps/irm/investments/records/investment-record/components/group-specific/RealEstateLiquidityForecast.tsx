import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system'
import { TrendingUp } from 'lucide-react'
import { PencilIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'

// Liquidity Forecast Types
export interface LiquidityForecastData {
  years: number[]
  balancedCashflowDate: string
  amounts: (number | string)[]
  balancedAmount: number | string
}

// Helper function to parse liquidity forecast from JSON data
export const parseLiquidityForecast = (liquidityForecast: any): LiquidityForecastData | null => {
  if (!liquidityForecast) {
    return null
  }

  try {
    // Handle case where data is already parsed
    const data = typeof liquidityForecast === 'string' ? JSON.parse(liquidityForecast) : liquidityForecast

    // Extract years and amounts from the data structure
    if (data && typeof data === 'object') {
      const { years, balancedCashflowDate, amounts, balancedAmount } = data

      // Only return data if we have valid years and amounts
      if (
        Array.isArray(years) &&
        years.length > 0 &&
        Array.isArray(amounts) &&
        amounts.length > 0 &&
        balancedCashflowDate &&
        balancedAmount
      ) {
        return {
          years,
          balancedCashflowDate,
          amounts,
          balancedAmount
        }
      }
    }

    return null
  } catch {
    return null
  }
}

interface RealEstateLiquidityForecastProps {
  realEstateData?: {
    investment?: any
    realEstateInvestment?: any
    documents?: any[]
  } | null
  isLoading?: boolean
  accessToken: string
  'data-testid'?: string
}

const RealEstateLiquidityForecast: React.FC<RealEstateLiquidityForecastProps> = ({
  realEstateData,
  isLoading,
  accessToken,
  'data-testid': dataTestId = 'liquidity-forecast'
}) => {
  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <div className="gba:animate-pulse">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse">
            <div className="gba:space-y-3">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Parse liquidity forecast data from real estate investment
  const forecastData: LiquidityForecastData | null = parseLiquidityForecast(
    realEstateData?.realEstateInvestment?.liquidityForecast
  )

  // Check if we have real liquidity forecast data
  const hasRealData = forecastData && forecastData.amounts.length > 0

  // Get currency from investment data and extract the currency code
  const currencyCode = extractCurrencyCode(realEstateData?.investment?.currency?.code)

  // If no real data, show empty state message
  if (!hasRealData || !forecastData) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
              Liquidity Forecast
            </CardTitle>
            {realEstateData?.investment?.id && (
              <AppAction
                contexts={[
                  {
                    context: FlowContextName.investmentLiquidityForecastUpdate,
                    contextData: {
                      investmentId: realEstateData.investment.id,
                      scope: 'liquidityForecast'
                    }
                  }
                ]}
                accessToken={accessToken}
                emptyState="enable"
                data-testid="liquidity-forecast-edit-action"
              >
                <Button variant="default" size="default" data-testid="liquidity-forecast-edit-button">
                  <PencilIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Update Liquidity Forecast
                </Button>
              </AppAction>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <p>No liquidity forecast data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show real data in table format
  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
            <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
            Liquidity Forecast
          </CardTitle>
          {realEstateData?.investment?.id && (
            <AppAction
              contexts={[
                {
                  context: FlowContextName.investmentLiquidityForecastUpdate,
                  contextData: {
                    investmentId: realEstateData.investment.id,
                    scope: 'liquidityForecast'
                  }
                }
              ]}
              accessToken={accessToken}
              emptyState="enable"
              data-testid="liquidity-forecast-edit-action"
            >
              <Button variant="default" size="default" data-testid="liquidity-forecast-edit-button">
                <PencilIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                Update Liquidity Forecast
              </Button>
            </AppAction>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <table className="gba:w-full gba:border-collapse" data-testid={`${dataTestId}-table`}>
            <thead>
              <tr className="gba:border-b gba:border-gray-200">
                <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">Year</th>
                {forecastData.years.map(year => (
                  <th key={year} className="gba:text-center gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                    {year}
                  </th>
                ))}
                <th className="gba:text-center gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                  Balanced Cashflow
                  <br />
                  until {forecastData.balancedCashflowDate}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="gba:border-b gba:border-gray-100">
                <td className="gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">Amount</td>
                {forecastData.amounts.map((amount, index) => (
                  <td key={index} className="gba:text-center gba:py-3 gba:px-4 gba:text-gray-700">
                    {formatCurrency(Number(amount), currencyCode)}
                  </td>
                ))}
                <td className="gba:text-center gba:py-3 gba:px-4 gba:text-gray-700 gba:font-medium">
                  {formatCurrency(Number(forecastData.balancedAmount), currencyCode)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default RealEstateLiquidityForecast
