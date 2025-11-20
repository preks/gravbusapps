import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  ChartContainer,
  ChartTooltip,
  ChartLegend
} from '@newwork/nw-design-system'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'

interface KPIsAtEntryVsCurrentChartProps extends BusinessAppContextProps {
  investment: any
  equityData: any
}

interface KPIData {
  stakePercentage: number
  totalInvestmentAmount: number
  investmentMarketValue: number
  netDebt: number // Hardcoded
  entityValuation: number
  turnover: number
  ebitda: number
  evTurnover: number | null // Calculated
  evEbitda: number | null // Calculated
  netDebtEbitda: number // Hardcoded
  targetMOIC: number // Hardcoded
  targetIRR: number // Hardcoded
}

/**
 * Hardcoded values for fields not in data model
 * TODO: Replace with real data from backend
 */
const HARDCODED_VALUES = {
  atEntry: {
    netDebt: 50, // EUR 50 Mio.
    netDebtEbitda: 3,
    targetMOIC: 3,
    targetIRR: 15
  },
  current: {
    netDebt: 150, // EUR 150 Mio.
    netDebtEbitda: 3.5,
    targetMOIC: 3.5,
    targetIRR: 17
  }
}

/**
 * Get KPI data from the oldest (first) report
 */
const getAtEntryData = (investment: any, equityData: any): KPIData => {
  const reports = equityData?.equityInvestment?.equityInvestmentReport || []

  if (reports.length === 0) {
    // No reports exist - return zeros/nulls (no fallback to main investment table)
    return {
      stakePercentage: 0,
      totalInvestmentAmount: 0,
      investmentMarketValue: 0,
      netDebt: HARDCODED_VALUES.atEntry.netDebt,
      entityValuation: 0,
      turnover: 0,
      ebitda: 0,
      evTurnover: null,
      evEbitda: null,
      netDebtEbitda: HARDCODED_VALUES.atEntry.netDebtEbitda,
      targetMOIC: HARDCODED_VALUES.atEntry.targetMOIC,
      targetIRR: HARDCODED_VALUES.atEntry.targetIRR
    }
  }

  // Find the oldest report (earliest date)
  const oldestReport = reports.reduce((oldest: any, current: any) => {
    if (!oldest.date) return current
    if (!current.date) return oldest
    return new Date(current.date) < new Date(oldest.date) ? current : oldest
  }, reports[0])

  // Extract values from the oldest EquityInvestmentReport (equity-specific fields)
  const turnover = oldestReport.turnoverAmount || 0
  const ebitda = oldestReport.ebitdaAmount || 0
  const marketValue = oldestReport.marketValue || 0

  // Extract values from the parent InvestmentReport (general investment fields)
  const parentReport = oldestReport.investmentReport || {}
  const stakePercentage = parentReport.stakePercentage || 0
  const totalInvestmentAmount = parentReport.totalInvestmentAmount || 0

  return {
    stakePercentage,
    totalInvestmentAmount,
    investmentMarketValue: marketValue,
    netDebt: HARDCODED_VALUES.atEntry.netDebt,
    entityValuation: marketValue,
    turnover,
    ebitda,
    evTurnover: turnover > 0 ? marketValue / turnover : null,
    evEbitda: ebitda > 0 ? marketValue / ebitda : null,
    netDebtEbitda: HARDCODED_VALUES.atEntry.netDebtEbitda,
    targetMOIC: HARDCODED_VALUES.atEntry.targetMOIC,
    targetIRR: HARDCODED_VALUES.atEntry.targetIRR
  }
}

/**
 * Get current KPI data from main investment table
 */
const getCurrentData = (investment: any, equityData: any): KPIData => {
  const turnover = equityData?.equityInvestment?.turnoverAmount || 0
  const ebitda = equityData?.equityInvestment?.ebitdaAmount || 0
  const marketValue = equityData?.equityInvestment?.marketValue || 0

  return {
    stakePercentage: investment?.stakePercentage || 0,
    totalInvestmentAmount: investment?.totalInvestmentAmount || 0,
    investmentMarketValue: investment?.investmentMarketValue || 0,
    netDebt: HARDCODED_VALUES.current.netDebt,
    entityValuation: marketValue,
    turnover,
    ebitda,
    evTurnover: turnover > 0 ? marketValue / turnover : null,
    evEbitda: ebitda > 0 ? marketValue / ebitda : null,
    netDebtEbitda: HARDCODED_VALUES.current.netDebtEbitda,
    targetMOIC: HARDCODED_VALUES.current.targetMOIC,
    targetIRR: HARDCODED_VALUES.current.targetIRR
  }
}

/**
 * Format currency values using compact notation (e.g., €1.5M, €150K)
 */
const formatCurrency = (value: number, currencyCode?: string): string => {
  const currency = currencyCode ? extractCurrencyCode(currencyCode) : 'EUR'
  return formatCompactCurrency(value, currency, 1)
}

/**
 * Format percentage values
 */
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

/**
 * Format multiplier values
 */
const formatMultiplier = (value: number | null): string => {
  if (value === null) return 'N/A'
  return `${value.toFixed(1)}x`
}

/**
 * Custom tooltip component for KPIs Chart
 */
const KpisTooltip: React.FC<{
  active?: boolean
  payload?: any[]
  label?: string
}> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    // Get unit from the first valid payload item
    const validPayload = payload.filter((entry: any) => entry.value != null)
    if (validPayload.length === 0) return null

    const firstEntry = validPayload[0].payload
    const unit = firstEntry.unit
    const currencyCode = firstEntry.currencyCode

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-foreground">{label}</div>
        {validPayload.map((entry: any) => {
          // Determine the label based on dataKey
          const isAtEntry = entry.dataKey.includes('atEntry')
          const displayLabel = isAtEntry ? 'At Entry' : 'Current'

          let formattedValue = ''
          if (unit === 'x') {
            formattedValue = `${entry.value.toFixed(1)}x`
          } else if (unit === '%') {
            formattedValue = `${entry.value.toFixed(1)}%`
          } else {
            formattedValue = formatCurrency(entry.value, currencyCode)
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="gba:font-medium gba:text-sm">{displayLabel}:</span>
              <span className="gba:font-semibold gba:text-sm">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

/**
 * Custom legend component for KPIs Chart
 */
const KpisLegend: React.FC<{
  payload?: any[]
}> = ({ payload }) => {
  if (!payload) return null

  // Only show unique entries (At Entry and Current)
  const uniqueEntries = payload.reduce((acc: any[], item: any) => {
    if (!acc.some(entry => entry.value === item.value)) {
      acc.push(item)
    }
    return acc
  }, [])

  return (
    <div className="gba:flex gba:items-center gba:justify-center gba:gap-6 gba:mt-4">
      {uniqueEntries.map((entry: any) => (
        <div key={entry.value} className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-3 gba:h-3 gba:rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="gba:text-sm gba:text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export const KPIsAtEntryVsCurrentChart: React.FC<KPIsAtEntryVsCurrentChartProps> = ({ investment, equityData }) => {
  const atEntryData = useMemo(() => getAtEntryData(investment, equityData), [investment, equityData])
  const currentData = useMemo(() => getCurrentData(investment, equityData), [investment, equityData])

  // Get currency code from investment
  const currencyCode = investment?.currency?.code || investment?.currency?.value || 'EUR'

  // Prepare chart data with separate properties for left and right Y-axes
  // This allows ComposedChart to properly render bars on different axes
  const chartData = useMemo(() => {
    return [
      {
        name: 'Total Investment Amount',
        atEntryLeft: atEntryData.totalInvestmentAmount,
        currentLeft: currentData.totalInvestmentAmount,
        atEntryRight: null,
        currentRight: null,
        unit: 'Mio.'
      },
      {
        name: 'Investment Market Value',
        atEntryLeft: atEntryData.investmentMarketValue,
        currentLeft: currentData.investmentMarketValue,
        atEntryRight: null,
        currentRight: null,
        unit: 'Mio.'
      },
      {
        name: 'Net Debt',
        atEntryLeft: atEntryData.netDebt,
        currentLeft: currentData.netDebt,
        atEntryRight: null,
        currentRight: null,
        unit: 'Mio.'
      },
      {
        name: 'Entity Valuation',
        atEntryLeft: atEntryData.entityValuation,
        currentLeft: currentData.entityValuation,
        atEntryRight: null,
        currentRight: null,
        unit: 'Mio.'
      },
      {
        name: 'Turnover',
        atEntryLeft: atEntryData.turnover,
        currentLeft: currentData.turnover,
        atEntryRight: null,
        currentRight: null,
        unit: 'Mio.'
      },
      {
        name: 'EBITDA',
        atEntryLeft: atEntryData.ebitda,
        currentLeft: currentData.ebitda,
        atEntryRight: null,
        currentRight: null,
        unit: 'Mio.'
      },
      {
        name: 'EV/Turnover',
        atEntryLeft: null,
        currentLeft: null,
        atEntryRight: atEntryData.evTurnover || 0,
        currentRight: currentData.evTurnover || 0,
        unit: 'x'
      },
      {
        name: 'EV/EBITDA',
        atEntryLeft: null,
        currentLeft: null,
        atEntryRight: atEntryData.evEbitda || 0,
        currentRight: currentData.evEbitda || 0,
        unit: 'x'
      },
      {
        name: 'Net Debt/EBITDA',
        atEntryLeft: null,
        currentLeft: null,
        atEntryRight: atEntryData.netDebtEbitda,
        currentRight: currentData.netDebtEbitda,
        unit: 'x'
      }
    ]
  }, [atEntryData, currentData])

  const chartConfig = useMemo(
    () => ({
      atEntryLeft: {
        label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.kpiComparison.atEntry', 'At Entry'),
        theme: {
          light: 'hsl(221.2 83.2% 53.3%)',
          dark: 'hsl(217.2 91.2% 59.8%)'
        }
      },
      currentLeft: {
        label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.kpiComparison.current', 'Current/At Exit'),
        theme: {
          light: 'hsl(142.1 76.2% 56.3%)',
          dark: 'hsl(142.1 70.6% 65.3%)'
        }
      },
      atEntryRight: {
        label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.kpiComparison.atEntry', 'At Entry'),
        theme: {
          light: 'hsl(221.2 83.2% 53.3%)',
          dark: 'hsl(217.2 91.2% 59.8%)'
        }
      },
      currentRight: {
        label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.kpiComparison.current', 'Current/At Exit'),
        theme: {
          light: 'hsl(142.1 76.2% 56.3%)',
          dark: 'hsl(142.1 70.6% 65.3%)'
        }
      }
    }),
    []
  )

  return (
    <Card data-testid="kpis-at-entry-vs-current-chart" className="gba:border gba:shadow-sm">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            'crm.investments.analytics.kpiComparison.title',
            'KPIs at entry vs. current/at exit'
          )}
        </CardTitle>
        <CardDescription>
          {getTranslationFromI18nKeyAndLabel(
            'crm.investments.analytics.kpiComparison.description',
            'Comparison of key performance indicators from entry to current status'
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Table Section */}
        <div className="gba:mb-6">
          <Table data-testid="kpis-comparison-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:font-semibold">Stake Percentage</TableHead>
                <TableHead className="gba:font-semibold">Total Investment Amount</TableHead>
                <TableHead className="gba:font-semibold">Investment Market Value</TableHead>
                <TableHead className="gba:font-semibold">Net Debt</TableHead>
                <TableHead className="gba:font-semibold">Entity Valuation</TableHead>
                <TableHead className="gba:font-semibold">Turnover</TableHead>
                <TableHead className="gba:font-semibold">EBITDA</TableHead>
                <TableHead className="gba:font-semibold">EV/Turnover</TableHead>
                <TableHead className="gba:font-semibold">EV/EBITDA</TableHead>
                <TableHead className="gba:font-semibold">Net Debt/EBITDA</TableHead>
                <TableHead className="gba:font-semibold">Target MOIC</TableHead>
                <TableHead className="gba:font-semibold">Target IRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* At Entry Row */}
              <TableRow data-testid="kpis-at-entry-row">
                <TableCell className="gba:font-medium">{formatPercentage(atEntryData.stakePercentage)}</TableCell>
                <TableCell>{formatCurrency(atEntryData.totalInvestmentAmount, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(atEntryData.investmentMarketValue, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(atEntryData.netDebt, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(atEntryData.entityValuation, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(atEntryData.turnover, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(atEntryData.ebitda, currencyCode)}</TableCell>
                <TableCell>{formatMultiplier(atEntryData.evTurnover)}</TableCell>
                <TableCell>{formatMultiplier(atEntryData.evEbitda)}</TableCell>
                <TableCell>{formatMultiplier(atEntryData.netDebtEbitda)}</TableCell>
                <TableCell>{formatMultiplier(atEntryData.targetMOIC)}</TableCell>
                <TableCell>{formatPercentage(atEntryData.targetIRR)}</TableCell>
              </TableRow>

              {/* Current/At Exit Row */}
              <TableRow data-testid="kpis-current-row">
                <TableCell className="gba:font-medium">{formatPercentage(currentData.stakePercentage)}</TableCell>
                <TableCell>{formatCurrency(currentData.totalInvestmentAmount, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(currentData.investmentMarketValue, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(currentData.netDebt, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(currentData.entityValuation, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(currentData.turnover, currencyCode)}</TableCell>
                <TableCell>{formatCurrency(currentData.ebitda, currencyCode)}</TableCell>
                <TableCell>{formatMultiplier(currentData.evTurnover)}</TableCell>
                <TableCell>{formatMultiplier(currentData.evEbitda)}</TableCell>
                <TableCell>{formatMultiplier(currentData.netDebtEbitda)}</TableCell>
                <TableCell>{formatMultiplier(currentData.targetMOIC)}</TableCell>
                <TableCell>{formatPercentage(currentData.targetIRR)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Chart Section */}
        <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full" data-testid="kpis-comparison-chart">
          <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ strokeWidth: 1 }}
            />

            {/* Left Y-Axis for Currency Values */}
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ strokeWidth: 1 }} />

            {/* Right Y-Axis for Multipliers */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ strokeWidth: 1 }}
            />

            <ChartTooltip content={KpisTooltip} />
            <ChartLegend content={KpisLegend} />

            {/* Bars for Left Y-Axis (Currency Values) */}
            <Bar
              yAxisId="left"
              dataKey="atEntryLeft"
              name="At Entry"
              fill="var(--color-atEntryLeft)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              yAxisId="left"
              dataKey="currentLeft"
              name="Current/At Exit"
              fill="var(--color-currentLeft)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />

            {/* Bars for Right Y-Axis (Multipliers) - Use same legend names */}
            <Bar
              yAxisId="right"
              dataKey="atEntryRight"
              name="At Entry"
              fill="var(--color-atEntryRight)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              yAxisId="right"
              dataKey="currentRight"
              name="Current/At Exit"
              fill="var(--color-currentRight)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </ComposedChart>
        </ChartContainer>

        {/* Information Note */}
        <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'crm.investments.analytics.kpiComparison.note',
              'Note: At Entry data from oldest report. Current data from main investment table. Net Debt, Net Debt/EBITDA, Target MOIC, and Target IRR are hardcoded and will be replaced with backend data.'
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default KPIsAtEntryVsCurrentChart
