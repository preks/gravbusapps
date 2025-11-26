import React, { useMemo, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Spinner,
  Alert,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  IconAvatar
} from '@newwork/nw-design-system'
import { ScatterChart, Scatter, XAxis, YAxis, Bar, ComposedChart } from 'recharts'
import { ChartBarIcon, PercentIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useRealEstateOccupancyDistribution, useRealEstatePropertyValueVsRent } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Occupancy distribution bar chart tooltip
interface OccupancyDistributionTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const OccupancyDistributionTooltip: React.FC<OccupancyDistributionTooltipProps> = ({
  active,
  payload,
  label,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
        {payload.map(entry => {
          let properLabel = ''
          let formattedValue = ''
          let dotColor = ''

          if (entry.dataKey === 'count') {
            properLabel = 'Property Count'
            formattedValue = `${entry.value}`
            dotColor = 'var(--color-count)'
          } else if (entry.dataKey === 'totalValue') {
            properLabel = 'Total Property Value'
            formattedValue = formatCurrency(entry.value as number, currency)
            dotColor = 'var(--color-totalValue)'
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: dotColor }} />
              <span className="gba:font-medium">{properLabel}:</span>
              <span className="gba:font-semibold">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

// Property value vs rent scatter chart tooltip
interface PropertyValueVsRentTooltipProps {
  active?: boolean
  payload?: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const PropertyValueVsRentTooltip: React.FC<PropertyValueVsRentTooltipProps> = ({
  active,
  payload,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{data.propertyName || 'Property'}</div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: 'var(--color-propertyValue)' }} />
          <span className="gba:font-medium">Property Value:</span>
          <span className="gba:font-semibold">{formatCurrency(data.propertyValue, currency)}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: 'var(--color-annualExpenses)' }}
          />
          <span className="gba:font-medium">Annual Net Cold Rent:</span>
          <span className="gba:font-semibold">{formatCurrency(data.annualExpenses, currency)}</span>
        </div>
      </div>
    )
  }
  return null
}

interface RealEstateAnalyticsChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const RealEstateAnalyticsCharts: React.FC<RealEstateAnalyticsChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency sync hooks - initialize with master currency from parent
  const [occupancyCurrencyFilter, setOccupancyCurrencyFilter] = useCurrencySync(masterCurrency)
  const [expensesCurrencyFilter, setExpensesCurrencyFilter] = useCurrencySync(masterCurrency)

  // Fetch occupancy distribution data using server-side queries
  const {
    data: occupancyData,
    isLoading: isLoadingOccupancy,
    error: occupancyError,
    refetch: refetchOccupancy
  } = useRealEstateOccupancyDistribution(props, occupancyCurrencyFilter)

  // Fetch property value vs rent data using server-side queries
  const {
    data: propertyValueVsRentData,
    isLoading: isLoadingPropertyValue,
    error: propertyValueError,
    refetch: refetchPropertyValue
  } = useRealEstatePropertyValueVsRent(props, expensesCurrencyFilter)

  // Occupancy Analysis Config
  const occupancyConfig = useMemo(
    () => ({
      count: { label: 'Count' },
      totalValue: { label: 'Total Value' }
    }),
    []
  )

  // Property Value vs Annual Net Cold Rent Config
  const expensesValueConfig = useMemo(
    () => ({
      annualExpenses: { label: 'Annual Net Cold Rent' },
      propertyValue: { label: 'Property Value' },
      expenseEfficiency: { label: 'Rent Efficiency' }
    }),
    []
  )

  // Memoized tooltip render functions
  const renderOccupancyTooltip = useCallback(
    (props: any) => (
      <OccupancyDistributionTooltip
        {...props}
        formatCurrency={formatCurrencyCompact}
        currency={occupancyCurrencyFilter}
      />
    ),
    [occupancyCurrencyFilter]
  )

  const renderPropertyValueTooltip = useCallback(
    (props: any) => (
      <PropertyValueVsRentTooltip {...props} formatCurrency={formatCurrencyCompact} currency={expensesCurrencyFilter} />
    ),
    [expensesCurrencyFilter]
  )

  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
      {/* Occupancy Rate Distribution */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={PercentIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Occupancy Rate Distribution</CardTitle>
                <CardDescription>
                  Properties grouped by occupancy rate ranges ({occupancyCurrencyFilter})
                </CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={occupancyCurrencyFilter}
                onChange={setOccupancyCurrencyFilter}
                dataTestId="occupancy-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingOccupancy) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (occupancyError) {
              return (
                <Alert variant="destructive" className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span>Error loading occupancy data: {occupancyError}</span>
                    <button
                      onClick={refetchOccupancy}
                      className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                    >
                      Retry
                    </button>
                  </div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={occupancyConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={occupancyData}>
                  <XAxis dataKey="range" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={renderOccupancyTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" />
                  <Bar yAxisId="right" dataKey="totalValue" fill="var(--color-totalValue)" opacity={0.8} />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Expenses vs Property Value */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartBarIcon} variant="warning" size="md" decorative />
              <div>
                <CardTitle>Property Value vs Annual Net Cold Rent</CardTitle>
                <CardDescription>
                  Property values correlation with annual net cold rent ({expensesCurrencyFilter})
                </CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={expensesCurrencyFilter}
                onChange={setExpensesCurrencyFilter}
                dataTestId="expenses-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingPropertyValue) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (propertyValueError) {
              return (
                <Alert variant="destructive" className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span>Error loading property value data: {propertyValueError}</span>
                    <button
                      onClick={refetchPropertyValue}
                      className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                    >
                      Retry
                    </button>
                  </div>
                </Alert>
              )
            }
            if (propertyValueVsRentData && propertyValueVsRentData.length > 0) {
              return (
                <ChartContainer config={expensesValueConfig} className="gba:h-[400px] gba:w-full">
                  <ScatterChart data={propertyValueVsRentData}>
                    <XAxis dataKey="propertyValue" name="Property Value" type="number" />
                    <YAxis dataKey="annualExpenses" name="Annual Net Cold Rent" type="number" />
                    <ChartTooltip content={renderPropertyValueTooltip} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Scatter dataKey="annualExpenses" fill="var(--color-annualExpenses)" />
                  </ScatterChart>
                </ChartContainer>
              )
            }
            return (
              <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:text-center">
                  <p className="gba:text-gray-500 gba:text-lg gba:mb-2">No Data Available</p>
                  <p className="gba:text-gray-400 gba:text-sm">
                    No properties with both annual net cold rent and value data found
                  </p>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
