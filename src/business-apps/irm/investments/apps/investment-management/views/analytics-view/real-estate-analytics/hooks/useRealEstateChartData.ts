import { useMemo } from 'react'
import dayjs from 'dayjs'
import { RealEstateInvestmentSummary } from '../../shared/types'

// Chart data interfaces
interface TypeDistributionItem {
  type: string
  count: number
  totalvalue: number
}

interface StatusDistributionItem {
  status: string
  count: number
  totalvalue: number
}

interface CurrencyDistributionItem {
  currency: string
  count: number
  totalvalue: number
}

interface TimelineDataItem {
  period: string
  investmentCount: number
  totalInvestmentAmount: number
  cumulativeInvestments: number
  year: number
}

interface PerformanceDataItem {
  period: string
  averageOccupancyRate: number
  totalPropertyValue: number
}

interface BuildingYearDataItem {
  yearRange: string
  propertyCount: number
  totalValue: number
  averageValue: number
}

interface GeoDataItem {
  location: string
  city: string
  country: string
  count: number
  totalvalue: number
  averagevalue: number
}

export const useRealEstateChartData = (realEstateInvestments: RealEstateInvestmentSummary[]) => {
  const chartData = useMemo(() => {
    // Type Distribution Data (based on investment type)
    const typeData = realEstateInvestments.reduce((acc, property) => {
      const type = property.investment?.investmentType?.value || 'Unknown Type'
      const existing = acc.find((item: TypeDistributionItem) => item.type === type)
      if (existing) {
        existing.count += 1
        existing.totalvalue += property.investment?.totalInvestmentAmount || 0
      } else {
        acc.push({
          type: type,
          count: 1,
          totalvalue: property.investment?.totalInvestmentAmount || 0
        })
      }
      return acc
    }, [] as TypeDistributionItem[])

    // Status Distribution
    const statusData = realEstateInvestments.reduce((acc, property) => {
      const status = property.investment?.investmentStatus?.value || 'Unknown'
      const existing = acc.find((item: StatusDistributionItem) => item.status === status)
      if (existing) {
        existing.count += 1
        existing.totalvalue += property.investment?.totalInvestmentAmount || 0
      } else {
        acc.push({
          status: status,
          count: 1,
          totalvalue: property.investment?.totalInvestmentAmount || 0
        })
      }
      return acc
    }, [] as StatusDistributionItem[])

    // Currency Distribution
    const currencyData = realEstateInvestments.reduce((acc, property) => {
      const currency = property.currencyCode || 'EUR'
      const existing = acc.find((item: CurrencyDistributionItem) => item.currency === currency)
      if (existing) {
        existing.count += 1
        existing.totalvalue += property.investment?.totalInvestmentAmount || 0
      } else {
        acc.push({
          currency: currency,
          count: 1,
          totalvalue: property.investment?.totalInvestmentAmount || 0
        })
      }
      return acc
    }, [] as CurrencyDistributionItem[])

    // Investment Timeline Data (acquisitions over time)
    const timelineData = realEstateInvestments
      .filter(property => property.investment.acquisitionDate)
      .reduce((acc, property) => {
        const date = dayjs(property.investment.acquisitionDate).format('YYYY-MM')
        const existing = acc.find((item: TimelineDataItem) => item.period === date)
        if (existing) {
          existing.investmentCount += 1
          existing.totalInvestmentAmount += property.investment.totalInvestmentAmount || 0
          existing.cumulativeInvestments = 0 // Will be calculated after
        } else {
          acc.push({
            period: date,
            investmentCount: 1,
            totalInvestmentAmount: property.investment.totalInvestmentAmount || 0,
            cumulativeInvestments: 0, // Will be calculated after
            year: dayjs(property.investment.acquisitionDate).year()
          })
        }
        return acc
      }, [] as TimelineDataItem[])
      .sort((a: TimelineDataItem, b: TimelineDataItem) => a.period.localeCompare(b.period))

    // Calculate cumulative count
    let runningCount = 0
    for (const item of timelineData) {
      runningCount += item.investmentCount
      item.cumulativeInvestments = runningCount
    }

    // Performance Timeline Data (for performance over time chart)
    const performanceData = realEstateInvestments
      .filter(property => property.investment.acquisitionDate)
      .reduce((acc, property) => {
        const date = dayjs(property.investment.acquisitionDate).format('YYYY-MM')
        const existing = acc.find((item: PerformanceDataItem) => item.period === date)
        const occupancyRate = property.occupancyRate || 0
        const marketValue = property.investment.investmentMarketValue || 0

        if (existing) {
          existing.averageOccupancyRate = (existing.averageOccupancyRate + occupancyRate) / 2
          existing.totalPropertyValue += marketValue
        } else {
          acc.push({
            period: date,
            averageOccupancyRate: occupancyRate,
            totalPropertyValue: marketValue
          })
        }
        return acc
      }, [] as PerformanceDataItem[])
      .sort((a: PerformanceDataItem, b: PerformanceDataItem) => a.period.localeCompare(b.period))

    // Building Year Data for timeline analysis
    const buildingYearData = realEstateInvestments
      .filter(property => property.realEstateInvestment?.buildingYear)
      .reduce((acc, property) => {
        const year = property.realEstateInvestment?.buildingYear || ''
        const decade = Math.floor(Number.parseInt(year) / 10) * 10
        const yearRange = `${decade}s`
        const existing = acc.find((item: BuildingYearDataItem) => item.yearRange === yearRange)
        const propertyValue = property.investment.investmentMarketValue || 0

        if (existing) {
          existing.propertyCount += 1
          existing.totalValue += propertyValue
          existing.averageValue = existing.totalValue / existing.propertyCount
        } else {
          acc.push({
            yearRange: yearRange,
            propertyCount: 1,
            totalValue: propertyValue,
            averageValue: propertyValue
          })
        }
        return acc
      }, [] as BuildingYearDataItem[])
      .sort((a: BuildingYearDataItem, b: BuildingYearDataItem) => a.yearRange.localeCompare(b.yearRange))

    // Leverage Analysis Data (for leverage vs ROI scatter plot)
    const leverageData = realEstateInvestments
      .filter(
        property =>
          property.investment.debtFinancingAmount !== null &&
          property.investment.totalInvestmentAmount !== null &&
          property.investment.totalInvestmentAmount !== undefined &&
          property.investment.totalInvestmentAmount > 0 &&
          property.investment.investmentMarketValue !== null
      )
      .map(property => {
        const totalInvestment = property.investment.totalInvestmentAmount || 0
        const debtFinancing = property.investment.debtFinancingAmount || 0
        const marketValue = property.investment.investmentMarketValue || 0
        const leverageRatio = totalInvestment > 0 ? (debtFinancing / totalInvestment) * 100 : 0
        const roi = totalInvestment > 0 ? ((marketValue - totalInvestment) / totalInvestment) * 100 : 0

        return {
          name: property.displayName || 'Unknown Property',
          leverage: Math.max(0, Math.min(100, leverageRatio)), // Cap at 0-100%
          roi: Math.max(-100, Math.min(200, roi)), // Cap ROI
          investmentAmount: totalInvestment,
          debtFinancing: debtFinancing,
          country: property.realEstateInvestment?.country?.value || 'Unknown'
        }
      })

    // ROI vs Size Data (if we had size data - for now simulate with investment amount)
    const roiSizeData = realEstateInvestments
      .filter(
        property =>
          property.investment.totalInvestmentAmount !== null &&
          property.investment.totalInvestmentAmount !== undefined &&
          property.investment.investmentMarketValue !== null &&
          property.investment.totalInvestmentAmount > 0
      )
      .map(property => {
        const totalInvestment = property.investment.totalInvestmentAmount || 0
        const marketValue = property.investment.investmentMarketValue || 0
        const roi = totalInvestment > 0 ? ((marketValue - totalInvestment) / totalInvestment) * 100 : 0
        // Use investment amount as proxy for property size since size field doesn't exist
        const propertySize = totalInvestment / 1000 // Convert to thousands for better scatter plot

        return {
          name: property.displayName || 'Unknown Property',
          propertySize: propertySize,
          roi: Math.max(-100, Math.min(200, roi)), // Cap ROI
          investmentAmount: totalInvestment,
          country: property.realEstateInvestment?.country?.value || 'Unknown'
        }
      })

    // Occupancy Data (grouped by occupancy rate ranges)
    const occupancyRanges = ['0-25%', '26-50%', '51-75%', '76-100%']
    const occupancyData = occupancyRanges.map(range => {
      const [min, max] = range.split('-').map(r => Number.parseInt(r.replace('%', '')))
      const propertiesInRange = realEstateInvestments.filter(property => {
        const occupancy = property.occupancyRate || 0
        return occupancy >= min && occupancy <= max
      })

      return {
        range: range,
        count: propertiesInRange.length,
        totalValue: propertiesInRange.reduce((sum, p) => sum + (p.investment.investmentMarketValue || 0), 0),
        averageOccupancy:
          propertiesInRange.length > 0
            ? propertiesInRange.reduce((sum, p) => sum + (p.occupancyRate || 0), 0) / propertiesInRange.length
            : 0
      }
    })

    // Expenses vs Value Data (based on available fields)
    const expensesValueData = realEstateInvestments
      .filter(property => {
        // Try primary fields first
        const primaryExpenses = property.realEstateInvestment?.annualNetColdRent
        const primaryValue = property.investment.totalInvestmentAmount

        const hasExpenses = primaryExpenses !== null && primaryExpenses !== undefined && primaryExpenses > 0
        const hasValue = primaryValue !== null && primaryValue > 0

        return hasExpenses && hasValue
      })
      .map(property => {
        // Use primary fields
        const annualExpenses = property.realEstateInvestment?.annualNetColdRent || 0
        const propertyValue = property.investment.totalInvestmentAmount || 0

        return {
          name: property.displayName || 'Unknown Property',
          annualExpenses: annualExpenses,
          propertyValue: propertyValue,
          expenseRatio: propertyValue > 0 ? (annualExpenses / propertyValue) * 100 : 0,
          country: property.realEstateInvestment?.country?.value || 'Unknown'
        }
      })

    // Geographic Analysis Data
    const geoData = realEstateInvestments.reduce((acc, property) => {
      const country = property.realEstateInvestment?.country?.value || 'Unknown'
      const locality = property.realEstateInvestment?.locality || 'Unknown City'
      const location = `${locality}, ${country}`

      const existing = acc.find((item: GeoDataItem) => item.location === location)
      if (existing) {
        existing.count += 1
        existing.totalvalue += property.investment?.totalInvestmentAmount || 0
        existing.averagevalue = existing.totalvalue / existing.count
      } else {
        acc.push({
          location: location,
          city: locality,
          country: country,
          count: 1,
          totalvalue: property.investment?.totalInvestmentAmount || 0,
          averagevalue: property.investment?.totalInvestmentAmount || 0
        })
      }
      return acc
    }, [] as GeoDataItem[])

    return {
      typeData,
      statusData,
      currencyData,
      timelineData,
      performanceData,
      buildingYearData,
      leverageData,
      roiSizeData,
      occupancyData,
      expensesValueData,
      geoData
    }
  }, [realEstateInvestments])

  return chartData
}
