import { useMemo } from 'react'
import dayjs from 'dayjs'
import { EquityInvestmentSummary } from '../../shared/types'

// Helper function to calculate YoY change
function calculateYoyChange(currentTotal: number, previousTotal: number): { yoyChange: number; yoyLabel: string } {
  if (previousTotal === 0) {
    // Avoid division by zero
    return {
      yoyChange: currentTotal > 0 ? 100 : 0,
      yoyLabel: currentTotal > 0 ? '+100%' : '0%'
    }
  }
  const change = ((currentTotal - previousTotal) / previousTotal) * 100
  const sign = change > 0 ? '+' : ''
  return {
    yoyChange: change,
    yoyLabel: `${sign}${change.toFixed(1)}%`
  }
}

// Helper function to calculate equity timeline data
function calculateEquityTimelineData(equityInvestments: EquityInvestmentSummary[]) {
  // Calculate the last 5 years (current year + 4 previous years)
  const currentYear = dayjs().year()
  const startYear = currentYear - 4
  const years = Array.from({ length: 5 }, (_, i) => (startYear + i).toString())

  // First, collect all unique investment types
  const investmentTypes = new Set<string>()
  for (const equity of equityInvestments) {
    const type = equity.investment.investmentType?.value || 'Unknown'
    investmentTypes.add(type)
  }

  // Initialize data structure with all years
  const yearlyData = years.map(year => {
    const entry: any = { year, total: 0 }
    // Initialize all types to 0 for this year
    for (const type of investmentTypes) {
      entry[type] = 0
    }
    return entry
  })

  // Group investments by year and type
  for (const equity of equityInvestments.filter(equity => equity.investment.acquisitionDate)) {
    const year = dayjs(equity.investment.acquisitionDate).format('YYYY')
    const type = equity.investment.investmentType?.value || 'Unknown'
    const amount = equity.investment.totalInvestmentAmount || 0

    // Only include data from the last 5 years
    if (Number.parseInt(year) >= startYear && Number.parseInt(year) <= currentYear) {
      const yearEntry = yearlyData.find(item => item.year === year)
      if (yearEntry) {
        // Add amount to the specific type
        yearEntry[type] = (yearEntry[type] || 0) + amount
        // Update total for trendline
        yearEntry.total = (yearEntry.total || 0) + amount
      }
    }
  }

  // Calculate YoY change for each year
  for (let index = 0; index < yearlyData.length; index++) {
    const entry = yearlyData[index]
    if (index === 0) {
      // First year has no previous year
      entry.yoyChange = null
      entry.yoyLabel = ''
    } else {
      const { yoyChange, yoyLabel } = calculateYoyChange(entry.total, yearlyData[index - 1].total)
      entry.yoyChange = yoyChange
      entry.yoyLabel = yoyLabel
    }
  }

  return {
    data: yearlyData,
    types: Array.from(investmentTypes)
  }
}

export const useEquityChartData = (equityInvestments: EquityInvestmentSummary[]) => {
  return useMemo(() => {
    // Investment role distribution data (using GraphQL investmentRole field)
    const roleData = equityInvestments.reduce((acc, equity) => {
      // Try both array and direct field approaches
      let role = 'Unknown'

      if (Array.isArray(equity.investment.investmentRole) && equity.investment.investmentRole.length > 0) {
        // Array approach - get the first role
        role = equity.investment.investmentRole[0]?.investmentRole?.value || 'Unknown'
      } else if (equity.investment.investmentRole && typeof equity.investment.investmentRole === 'object') {
        // Direct field approach
        role = equity.investment.investmentRole.value || 'Unknown'
      }

      const existing = acc.find(item => item.type === role)
      if (existing) {
        existing.count += 1
        existing.totalAmount += equity.investment.investmentMarketValue || 0
      } else {
        acc.push({
          type: role,
          count: 1,
          totalAmount: equity.investment.investmentMarketValue || 0
        })
      }
      return acc
    }, [] as any[])

    // Company valuation vs EBITDA scatter plot data
    const valuationEbitdaData = equityInvestments
      .filter(equity => equity.investment.investmentMarketValue && equity.equityInvestment?.ebitdaAmount)
      .map(equity => ({
        valuation: equity.investment.investmentMarketValue || 0,
        ebitda: equity.equityInvestment?.ebitdaAmount || 0,
        name: equity.displayName || 'Unknown Company',
        currency: equity.currencyCode || 'EUR'
      }))

    // EBITDA margin distribution data
    const ebitdaMarginData = equityInvestments
      .filter(equity => equity.ebitdaMargin)
      .map(equity => ({
        name: equity.displayName || 'Unknown Company',
        margin: equity.ebitdaMargin || 0,
        color: equity.ebitdaMargin >= 0 ? '#52c41a' : '#ff4d4f'
      }))

    // Investment status distribution data
    const statusData = equityInvestments.reduce((acc, equity) => {
      const status = equity.investment.investmentStatus?.value || 'Unknown'
      const existing = acc.find(item => item.type === status)
      if (existing) {
        existing.count += 1
        existing.totalAmount += equity.investment.investmentMarketValue || 0
      } else {
        acc.push({
          type: status,
          count: 1,
          totalAmount: equity.investment.investmentMarketValue || 0
        })
      }
      return acc
    }, [] as any[])

    // Currency distribution data
    const currencyData = equityInvestments.reduce((acc, equity) => {
      const currency = equity.currencyCode || 'EUR'
      const existing = acc.find(item => item.type === currency)
      if (existing) {
        existing.value += equity.investment.investmentMarketValue || 0
      } else {
        acc.push({
          type: currency,
          value: equity.investment.investmentMarketValue || 0
        })
      }
      return acc
    }, [] as any[])

    // ROI distribution data
    const roiData = equityInvestments.map(equity => ({
      name: equity.displayName || 'Unknown Company',
      roi: equity.roi || 0,
      color: equity.roi >= 0 ? '#52c41a' : '#ff4d4f'
    }))

    // Investment stake type distribution data (using GraphQL investmentStakeType field)
    const stakeTypeData = equityInvestments.reduce((acc, equity) => {
      const stakeType = equity.investment.investmentStakeType?.value || 'Unknown'
      const existing = acc.find(item => item.type === stakeType)
      if (existing) {
        existing.count += 1
        existing.totalAmount += equity.investment.investmentMarketValue || 0
      } else {
        acc.push({
          type: stakeType,
          count: 1,
          totalAmount: equity.investment.investmentMarketValue || 0
        })
      }
      return acc
    }, [] as any[])

    // Investment type distribution data (using GraphQL investmentType field)
    const investmentTypeData = equityInvestments.reduce((acc, equity) => {
      const investmentType = equity.investment.investmentType?.value || 'Unknown'
      const existing = acc.find(item => item.type === investmentType)
      if (existing) {
        existing.count += 1
        existing.totalAmount += equity.investment.investmentMarketValue || 0
      } else {
        acc.push({
          type: investmentType,
          count: 1,
          totalAmount: equity.investment.investmentMarketValue || 0
        })
      }
      return acc
    }, [] as any[])

    // NEW: Equity Investment Performance Timeline - showing total investment amounts by type over time (yearly)
    const equityTimelineData = calculateEquityTimelineData(equityInvestments)

    // NEW: Stake vs Investment Amount Correlation (Scatter Plot)
    const stakeVsInvestmentAmountData = equityInvestments
      .filter(equity => {
        const hasStake = equity.investment.stakePercentage
        const hasAmount = equity.investment.totalInvestmentAmount
        return hasStake && hasAmount
      })
      .map(equity => ({
        stake: equity.investment.stakePercentage,
        investmentAmount: equity.investment.totalInvestmentAmount,
        name: equity.displayName || 'Unknown',
        role: 'Lead Investor', // Default role since it's not in centralized structure
        color: '#1890ff' // Default color for lead investor
      }))

    // NEW: Investment Role vs Investment Amount Analysis (Scatter Plot)
    const roleInvestmentAmountData = equityInvestments
      .filter(equity => {
        const hasAmount = equity.investment.totalInvestmentAmount
        return hasAmount
      })
      .map(equity => {
        const roleScore = 3 // Default to Lead Investor score
        return {
          role: roleScore,
          investmentAmount: equity.investment.totalInvestmentAmount,
          name: equity.displayName || 'Unknown',
          valuation: equity.investment.investmentMarketValue || 0,
          stake: equity.investment.stakePercentage || 0
        }
      })

    // NEW: Portfolio Concentration by Investment Role (Bar Chart)
    const concentrationByRoleData = equityInvestments.reduce((acc, equity) => {
      const role = 'Lead Investor' // Default role since it's not in centralized structure
      const existing = acc.find(item => item.role === role)
      const value = equity.investment.investmentMarketValue || 0
      if (existing) {
        existing.totalValuation += value
        existing.count += 1
        existing.averageValuation = existing.totalValuation / existing.count
      } else {
        acc.push({
          role,
          totalValuation: value,
          count: 1,
          averageValuation: value
        })
      }
      return acc
    }, [] as any[])

    // NEW: Top Companies by Valuation (Bar Chart)
    const topCompaniesByValuationData = equityInvestments
      .filter(equity => equity.investment.investmentMarketValue)
      .map(equity => ({
        company: equity.displayName || 'Unknown Company',
        valuation: equity.investment.investmentMarketValue,
        ebitda: equity.equityInvestment?.ebitdaAmount || 0,
        stake: equity.investment.stakePercentage || 0,
        role: 'Lead Investor' // Default role since it's not in centralized structure
      }))
      .sort((a, b) => (b.valuation || 0) - (a.valuation || 0))
      .slice(0, 10) // Top 10 companies

    return {
      roleData,
      valuationEbitdaData,
      ebitdaMarginData,
      statusData,
      currencyData,
      roiData,
      stakeTypeData,
      investmentTypeData,
      // New enhanced chart data
      equityTimelineData,
      stakeVsInvestmentAmountData,
      roleInvestmentAmountData,
      concentrationByRoleData,
      topCompaniesByValuationData
      // Distribution analysis data (investmentSizeData and investmentDurationData computed dynamically in component)
    }
  }, [equityInvestments])
}
