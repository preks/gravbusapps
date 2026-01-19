import { useMemo } from 'react'
import dayjs from 'dayjs'
import { LiquidFundInvestmentSummary } from '../../shared/types'

export const useLiquidFundChartData = (liquidFundInvestments: LiquidFundInvestmentSummary[]) => {
  return useMemo(() => {
    // Interest rate distribution data
    const interestRateData = liquidFundInvestments.map(fund => ({
      name: fund.displayName,
      value: fund.liquidFundInvestment?.interestRate || 0,
      color: fund.fundTypeColor
    }))

    // Maturity timeline data
    const maturityTimelineData = liquidFundInvestments
      .filter(fund => fund.liquidFundInvestment?.maturityDate)
      .map(fund => ({
        name: fund.displayName,
        maturityYear: dayjs(fund.liquidFundInvestment?.maturityDate || new Date()).year(),
        value: fund.investment.investmentMarketValue || fund.investment.bookValue || 0,
        isNearMaturity: fund.isNearMaturity
      }))
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.maturityYear === curr.maturityYear)
        if (existing) {
          existing.value += curr.value
          existing.count += 1
        } else {
          acc.push({
            maturityYear: curr.maturityYear,
            value: curr.value,
            count: 1
          })
        }
        return acc
      }, [] as any[])

    // Payment frequency distribution data
    const paymentFrequencyData = liquidFundInvestments.reduce((acc, fund) => {
      const frequency = fund.fundTypeName || 'Unknown'
      const existing = acc.find(item => item.type === frequency)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          type: frequency,
          value: 1
        })
      }
      return acc
    }, [] as any[])

    // Early termination status data
    const earlyTerminationData = [
      {
        type: 'Allowed',
        value: liquidFundInvestments.filter(fund => fund.earlyTerminationAllowed).length
      },
      {
        type: 'Not Allowed',
        value: liquidFundInvestments.filter(fund => !fund.earlyTerminationAllowed).length
      }
    ]

    // Investment status distribution data
    const statusData = liquidFundInvestments.reduce((acc, fund) => {
      const status = fund.investment.investmentStatus?.value || 'Unknown'
      const existing = acc.find(item => item.type === status)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          type: status,
          value: 1
        })
      }
      return acc
    }, [] as any[])

    // Investment phase distribution data
    const phaseData = liquidFundInvestments.reduce((acc, fund) => {
      const phase = fund.investment.investmentPhase?.value || 'Unknown'
      const existing = acc.find(item => item.type === phase)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          type: phase,
          value: 1
        })
      }
      return acc
    }, [] as any[])

    // Risk level distribution data
    const riskLevelData = liquidFundInvestments.reduce((acc, fund) => {
      const risk = fund.investment.investmentRiskLevel?.value || 'Unknown'
      const existing = acc.find(item => item.type === risk)
      if (existing) {
        existing.value += 1
      } else {
        acc.push({
          type: risk,
          value: 1
        })
      }
      return acc
    }, [] as any[])

    // Currency distribution data
    const currencyData = liquidFundInvestments.reduce((acc, fund) => {
      const currency = fund.currencyCode || 'EUR'
      const existing = acc.find(item => item.type === currency)
      if (existing) {
        existing.value += fund.investment.marketValue || fund.investment.bookValue || 0
      } else {
        acc.push({
          type: currency,
          value: fund.investment.marketValue || fund.investment.bookValue || 0
        })
      }
      return acc
    }, [] as any[])

    // Investment Performance Timeline Analysis
    const performanceTimelineData = liquidFundInvestments
      .filter(fund => fund.investment.acquisitionDate)
      .reduce((acc, fund) => {
        const date = dayjs(fund.investment.acquisitionDate).format('YYYY-MM')
        const existing = acc.find(item => item.month === date)
        if (existing) {
          existing.count += 1
          existing.totalValue += fund.investment.marketValue || fund.investment.bookValue || 0
          existing.avgInterestRate =
            (existing.avgInterestRate * (existing.count - 1) + (fund.interestRate || 0)) / existing.count
        } else {
          acc.push({
            month: date,
            count: 1,
            totalValue: fund.investment.marketValue || fund.investment.bookValue || 0,
            avgInterestRate: fund.interestRate || 0,
            year: dayjs(fund.investment.acquisitionDate).year()
          })
        }
        return acc
      }, [] as any[])
      .sort((a, b) => a.month.localeCompare(b.month))

    // Interest Rate vs Market Value Analysis
    const yieldValueData = liquidFundInvestments
      .filter(fund => fund.interestRate && fund.investment.marketValue)
      .map(fund => ({
        name: fund.displayName,
        interestRate: fund.interestRate || 0,
        marketValue: fund.investment.marketValue || 0,
        daysToMaturity: fund.daysToMaturity || 0,
        risk: fund.investment.investmentRiskLevel?.value || 'Unknown',
        status: fund.investment.investmentStatus?.value || 'Unknown'
      }))

    // Maturity vs Interest Rate Correlation
    const maturityYieldData = liquidFundInvestments
      .filter(fund => fund.maturityDate && fund.interestRate)
      .map(fund => ({
        name: fund.displayName,
        daysToMaturity: fund.daysToMaturity || 0,
        interestRate: fund.interestRate || 0,
        value: fund.investment.marketValue || fund.investment.bookValue || 0,
        earlyTermination: fund.earlyTerminationAllowed ? 'Allowed' : 'Not Allowed'
      }))

    // Portfolio Concentration by Account
    const accountConcentrationData = liquidFundInvestments
      .reduce((acc, fund) => {
        const accountName = fund.investment.account?.name || 'Unknown Account'
        const existing = acc.find(item => item.name === accountName)
        if (existing) {
          existing.count += 1
          existing.totalValue += fund.investment.marketValue || fund.investment.bookValue || 0
          existing.avgInterestRate =
            (existing.avgInterestRate * (existing.count - 1) + (fund.interestRate || 0)) / existing.count
        } else {
          acc.push({
            name: accountName,
            count: 1,
            totalValue: fund.investment.marketValue || fund.investment.bookValue || 0,
            avgInterestRate: fund.interestRate || 0
          })
        }
        return acc
      }, [] as any[])
      .sort((a, b) => b.totalValue - a.totalValue)

    // Risk vs Return Analysis
    const riskReturnData = liquidFundInvestments
      .filter(fund => fund.investment.investmentRiskLevel?.value && fund.interestRate)
      .reduce((acc, fund) => {
        const risk = fund.investment.investmentRiskLevel?.value || 'Unknown'
        const existing = acc.find(item => item.risk === risk)
        if (existing) {
          existing.count += 1
          existing.avgYield = (existing.avgYield * (existing.count - 1) + (fund.interestRate || 0)) / existing.count
          existing.totalValue += fund.investment.marketValue || fund.investment.bookValue || 0
        } else {
          acc.push({
            risk: risk,
            count: 1,
            avgYield: fund.interestRate || 0,
            totalValue: fund.investment.marketValue || fund.investment.bookValue || 0
          })
        }
        return acc
      }, [] as any[])

    // Active Period Analysis
    const activePeriodsData = liquidFundInvestments.reduce((acc, fund) => {
      const hasActivePeriod = fund.activeFrom && fund.activeTo ? 'Has Active Period' : 'No Active Period'
      const existing = acc.find(item => item.name === hasActivePeriod)
      if (existing) {
        existing.value += 1
        existing.totalValue += fund.investment.marketValue || fund.investment.bookValue || 0
      } else {
        acc.push({
          name: hasActivePeriod,
          value: 1,
          totalValue: fund.investment.marketValue || fund.investment.bookValue || 0
        })
      }
      return acc
    }, [] as any[])

    // Interest Rate Distribution Analysis
    const interestRateDistributionData = liquidFundInvestments
      .map(fund => ({
        name: fund.displayName,
        interestRate: fund.interestRate || 0,
        value: fund.investment.marketValue || fund.investment.bookValue || 0,
        maturityYear: fund.maturityDate ? dayjs(fund.maturityDate).year() : null,
        risk: fund.investment.investmentRiskLevel?.value || 'Unknown'
      }))
      .sort((a, b) => b.interestRate - a.interestRate)

    // Enhanced Currency Analysis with Performance
    const enhancedCurrencyData = liquidFundInvestments.reduce((acc, fund) => {
      const currency = fund.currencyCode || 'EUR'
      const existing = acc.find(item => item.name === currency)
      if (existing) {
        existing.value += fund.investment.marketValue || fund.investment.bookValue || 0
        existing.count += 1
        existing.avgInterestRate =
          (existing.avgInterestRate * (existing.count - 1) + (fund.interestRate || 0)) / existing.count
      } else {
        acc.push({
          name: currency,
          value: fund.investment.marketValue || fund.investment.bookValue || 0,
          count: 1,
          avgInterestRate: fund.interestRate || 0
        })
      }
      return acc
    }, [] as any[])

    return {
      // Enhanced data for new chart types
      performanceTimelineData,
      yieldValueData,
      maturityYieldData,
      accountConcentrationData,
      riskReturnData,
      activePeriodsData,
      interestRateDistributionData,
      enhancedCurrencyData,
      // Legacy data for backwards compatibility
      interestRateData,
      maturityTimelineData,
      paymentFrequencyData,
      earlyTerminationData,
      statusData,
      phaseData,
      riskLevelData,
      currencyData
    }
  }, [liquidFundInvestments])
}
