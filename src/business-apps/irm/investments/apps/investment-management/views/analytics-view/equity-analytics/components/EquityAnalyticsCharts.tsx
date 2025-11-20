import React, { useMemo, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { ComposedChart, ScatterChart, Scatter, Bar, Line, XAxis, YAxis } from 'recharts'
import { ChartScatterIcon, ChartBarIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useEquityStakeVsAmount, useEquityRoleVsAmount, useEquityConcentrationByRole } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Stake vs Investment scatter chart tooltip component
interface StakeVsInvestmentTooltipContentProps {
  active?: boolean
  payload?: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const StakeVsInvestmentTooltipContent: React.FC<StakeVsInvestmentTooltipContentProps> = ({
  active,
  payload,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    const data = payload[0].payload // Get the actual data point

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
          Company: {data.company || data.name || 'Unknown'}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: 'var(--color-stakevsinvestment)' }}
          />
          <span className="gba:font-medium">Stake Percentage:</span>
          <span className="gba:font-semibold">{data.stake}%</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: 'var(--color-stakevsinvestment)' }}
          />
          <span className="gba:font-medium">Investment Amount:</span>
          <span className="gba:font-semibold">{formatCurrency(data.investmentAmount, currency)}</span>
        </div>
      </div>
    )
  }
  return null
}

// Role vs Investment scatter chart tooltip component
interface RoleVsInvestmentTooltipContentProps {
  active?: boolean
  payload?: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const RoleVsInvestmentTooltipContent: React.FC<RoleVsInvestmentTooltipContentProps> = ({
  active,
  payload,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    const data = payload[0].payload // Get the actual data point
    const roleScore = data.roleScore
    let roleLabel
    if (roleScore === 1) {
      roleLabel = 'Follow-on'
    } else if (roleScore === 2) {
      roleLabel = 'Co-Investor'
    } else if (roleScore === 3) {
      roleLabel = 'Lead'
    } else {
      roleLabel = data.role
    }

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
          Company: {data.company || data.name || 'Unknown'}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: 'var(--color-rolevsinvestment)' }}
          />
          <span className="gba:font-medium">Investment Role:</span>
          <span className="gba:font-semibold">{roleLabel}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: 'var(--color-rolevsinvestment)' }}
          />
          <span className="gba:font-medium">Investment Amount:</span>
          <span className="gba:font-semibold">{formatCurrency(data.investmentAmount, currency)}</span>
        </div>
      </div>
    )
  }
  return null
}

// Investment concentration bar/line chart tooltip component
interface ConcentrationTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const ConcentrationTooltipContent: React.FC<ConcentrationTooltipContentProps> = ({
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
          let formattedValue = ''
          let properLabel = ''
          let dotColor = ''

          if (entry.dataKey === 'count') {
            formattedValue = `${entry.value}`
            properLabel = 'Investment Count'
            dotColor = 'var(--color-investmentcount)'
          } else if (entry.dataKey === 'totalValuation') {
            formattedValue = formatCurrency(entry.value as number, currency)
            properLabel = 'Total Valuation'
            dotColor = 'var(--color-totalvaluation)'
          } else if (entry.dataKey === 'averageValuation') {
            formattedValue = formatCurrency(entry.value as number, currency)
            properLabel = 'Average Valuation'
            dotColor = 'var(--color-averagevaluation)'
          }

          return (
            <div key={entry.dataKey as string} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
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

interface EquityAnalyticsChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityAnalyticsCharts: React.FC<EquityAnalyticsChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Separate currency for each performance chart for independent filtering
  const [stakeAmountCurrency, setStakeAmountCurrency] = useCurrencySync(masterCurrency)
  const [roleAmountCurrency, setRoleAmountCurrency] = useCurrencySync(masterCurrency)
  const [concentrationCurrency, setConcentrationCurrency] = useCurrencySync(masterCurrency)

  // Fetch optimized performance data from server - each chart independently
  const {
    stakeVsAmountData: stakeVsInvestmentAmountData,
    isLoading: stakeLoading,
    error: stakeError
  } = useEquityStakeVsAmount(props, stakeAmountCurrency)

  const {
    roleVsAmountData: roleInvestmentAmountData,
    isLoading: roleLoading,
    error: roleError
  } = useEquityRoleVsAmount(props, roleAmountCurrency)

  const {
    concentrationData: concentrationByRoleData,
    isLoading: concentrationLoading,
    error: concentrationError
  } = useEquityConcentrationByRole(props, concentrationCurrency)

  // Chart configs - must be at top level
  const stakeVsAmountChartConfig = useMemo(
    () => ({
      stakevsinvestment: { label: 'Stake vs Investment' }
    }),
    []
  )

  const roleVsAmountChartConfig = useMemo(
    () => ({
      rolevsinvestment: { label: 'Role vs Investment' }
    }),
    []
  )

  const concentrationChartConfig = useMemo(
    () => ({
      investmentcount: { label: 'Investment Count' },
      totalvaluation: { label: 'Total Valuation' },
      averagevaluation: { label: 'Average Valuation' }
    }),
    []
  )

  // Memoized tooltip render functions
  const renderStakeTooltip = useCallback(
    (props: any) => (
      <StakeVsInvestmentTooltipContent
        {...props}
        formatCurrency={formatCurrencyCompact}
        currency={stakeAmountCurrency}
      />
    ),
    [stakeAmountCurrency]
  )

  const renderRoleTooltip = useCallback(
    (props: any) => (
      <RoleVsInvestmentTooltipContent {...props} formatCurrency={formatCurrencyCompact} currency={roleAmountCurrency} />
    ),
    [roleAmountCurrency]
  )

  const renderConcentrationTooltip = useCallback(
    (props: any) => (
      <ConcentrationTooltipContent {...props} formatCurrency={formatCurrencyCompact} currency={concentrationCurrency} />
    ),
    [concentrationCurrency]
  )

  return (
    <>
      {/* Stake vs Investment Amount Correlation - Scatter Plot (Full Width) */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Stake vs Amount Correlation ({stakeAmountCurrency})</CardTitle>
                <CardDescription>Relationship between stake percentage and total investment amount</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={stakeAmountCurrency}
              onChange={setStakeAmountCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="stake-amount-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (stakeLoading) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading stake correlation data...</div>
                </div>
              )
            }
            if (stakeError) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{stakeError}</div>
                </div>
              )
            }
            if (stakeVsInvestmentAmountData.length === 0) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No stake vs amount data available for {stakeAmountCurrency}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={stakeVsAmountChartConfig} className="gba:h-[350px] gba:w-full">
                <ScatterChart data={stakeVsInvestmentAmountData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis
                    type="number"
                    dataKey="stake"
                    name="Stake %"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => `${value}%`}
                  />
                  <YAxis
                    type="number"
                    dataKey="investmentAmount"
                    name="Investment Amount"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(value, extractCurrencyCode(stakeAmountCurrency), undefined, 1, true)
                    }
                  />
                  <ChartTooltip content={renderStakeTooltip} />
                  <Scatter
                    name="stakevsinvestment"
                    data={stakeVsInvestmentAmountData}
                    fill="var(--color-stakevsinvestment)"
                  />
                </ScatterChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Investment Role vs Investment Amount - Scatter Plot */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Role vs Amount ({roleAmountCurrency})</CardTitle>
                <CardDescription>Comparison of investment amounts across different investment roles</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={roleAmountCurrency}
              onChange={setRoleAmountCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="role-amount-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (roleLoading) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading role correlation data...</div>
                </div>
              )
            }
            if (roleError) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{roleError}</div>
                </div>
              )
            }
            if (roleInvestmentAmountData.length === 0) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No role vs amount data available for {roleAmountCurrency}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={roleVsAmountChartConfig} className="gba:h-[350px] gba:w-full">
                <ScatterChart data={roleInvestmentAmountData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis
                    type="number"
                    dataKey="roleScore"
                    name="Investment Role"
                    domain={[0, 4]}
                    ticks={[1, 2, 3]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => {
                      if (value === 1) return 'Follow-on'
                      if (value === 2) return 'Co-Investor'
                      return 'Lead'
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="investmentAmount"
                    name="Investment Amount"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(value, extractCurrencyCode(roleAmountCurrency), undefined, 1, true)
                    }
                  />
                  <ChartTooltip content={renderRoleTooltip} />
                  <Scatter
                    name="rolevsinvestment"
                    data={roleInvestmentAmountData}
                    fill="var(--color-rolevsinvestment)"
                  />
                </ScatterChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Portfolio Concentration by Role - Bar Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Portfolio Concentration by Role ({concentrationCurrency})</CardTitle>
                <CardDescription>Investment distribution and valuation metrics by role</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={concentrationCurrency}
              onChange={setConcentrationCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="concentration-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (concentrationLoading) {
              return (
                <div className="gba:h-[300px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading concentration data...</div>
                </div>
              )
            }
            if (concentrationError) {
              return (
                <div className="gba:h-[300px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                    {concentrationError}
                  </div>
                </div>
              )
            }
            if (concentrationByRoleData.length === 0) {
              return (
                <div className="gba:h-[300px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No concentration data available for {concentrationCurrency}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={concentrationChartConfig} className="gba:h-[300px] gba:w-full">
                <ComposedChart data={concentrationByRoleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="role" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <ChartTooltip content={renderConcentrationTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="investmentcount"
                    fill="var(--color-investmentcount)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="totalValuation"
                    name="totalvaluation"
                    fill="var(--color-totalvaluation)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageValuation"
                    name="averagevaluation"
                    stroke="var(--color-averagevaluation)"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>
    </>
  )
}
