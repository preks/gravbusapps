import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar, Badge } from '@newwork/nw-design-system'
import { TrendUpIcon, TrendDownIcon, MinusIcon, type Icon } from '@phosphor-icons/react'
import { Investment } from '@/common/data/investment/types/investmentTypes'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { useCurrencySync } from '../../analytics-view/shared/hooks'
import { CurrencyFilter } from '../../analytics-view/shared/components'

// Type definitions
export interface SubType {
  name: string
  amount: string
  percentage: string
}

export interface InvestmentGroup {
  name: string
  icon: Icon
  investments: number
  groupInvestments: Investment[]
}

export interface TrendData {
  percentage: number
  trend: 'up' | 'down' | 'neutral'
}

interface InvestmentBreakdownCardProps {
  group: InvestmentGroup
  moduleColor?: 'ext1' | 'ext2' | 'ext3' | 'ext4' | 'ext5' | 'ext6' | 'ext7' | 'ext8'
  onNavigateToInvestmentType: (investmentType: string) => void
  calculateTrendData: (investments: Investment[], groupName: string) => TrendData
  masterCurrency: string // Currency code like "EUR", "USD", etc.
  availableCurrencies: string[] // Array of currency codes
}

/**
 * Generic investment breakdown card component
 * Displays investment group information with metrics and subtypes
 */
const InvestmentBreakdownCard: React.FC<InvestmentBreakdownCardProps> = ({
  group,
  moduleColor,
  onNavigateToInvestmentType,
  calculateTrendData,
  masterCurrency,
  availableCurrencies
}) => {
  // Use currency sync hook to sync with master currency
  const [selectedCurrency, setSelectedCurrency] = useCurrencySync(masterCurrency)

  // Helper to get investment currency code
  const getInvestmentCurrencyCode = React.useCallback((investment: Investment): string | null => {
    if (!investment.currency) return null
    const currency = investment.currency as any
    if (typeof currency === 'string') {
      // Extract code from "Currency:v1:EUR" format
      return currency.split(':').pop() || null
    }
    if (typeof currency === 'object' && currency !== null) {
      return currency.code || null
    }
    return null
  }, [])

  // Filter investments by selected currency
  const currencyFilteredInvestments = useMemo(() => {
    return group.groupInvestments.filter(inv => {
      const currencyCode = getInvestmentCurrencyCode(inv)
      return currencyCode === selectedCurrency
    })
  }, [group.groupInvestments, selectedCurrency, getInvestmentCurrencyCode])

  // Calculate totals from filtered investments
  const totalInvested = useMemo(() => {
    return currencyFilteredInvestments.reduce((sum, inv) => {
      return sum + (inv.totalInvestmentAmount || 0)
    }, 0)
  }, [currencyFilteredInvestments])

  // Calculate subTypes from filtered investments
  const subTypes = useMemo(() => {
    const typeGroups: Record<string, Investment[]> = {}

    currencyFilteredInvestments.forEach(inv => {
      const type = inv.investmentType?.value || 'Unknown'
      if (!typeGroups[type]) {
        typeGroups[type] = []
      }
      typeGroups[type].push(inv)
    })

    return Object.entries(typeGroups).map(([typeName, investments]) => {
      const total = investments.reduce((sum, inv) => {
        return sum + (inv.totalInvestmentAmount || 0)
      }, 0)

      const percentage = totalInvested > 0 ? (total / totalInvested) * 100 : 0

      return {
        name: typeName,
        amount: formatCurrencyCompact(total, selectedCurrency, undefined, 1, true),
        percentage: `${percentage.toFixed(1)}%`
      }
    })
  }, [currencyFilteredInvestments, totalInvested, selectedCurrency])
  const handleNavigateClick = () => {
    // Only map the specialized groups that have custom configurations
    // All other groups (including Private Equity) will use the dynamic fallback
    const subtabMap: { [key: string]: string } = {
      Equity: 'equity',
      'Real Estate': 'real-estate',
      RealEstate: 'real-estate',
      'Liquid Fund': 'liquid-funds',
      'Liquid Funds': 'liquid-funds',
      LiquidFund: 'liquid-funds',
      LiquidFunds: 'liquid-funds'
    }

    const subtab = subtabMap[group.name] || group.name.toLowerCase().replace(/\s+/g, '-')

    onNavigateToInvestmentType(subtab)
  }

  // Calculate trend data based on acquisition dates (using filtered investments)
  const trendData = calculateTrendData(currencyFilteredInvestments)

  // Helper to render trend badge
  const renderTrendBadge = (trend: TrendData) => {
    if (trend.trend === 'neutral') {
      return (
        <Badge variant="outline" className="gba:flex gba:items-center gba:gap-1">
          <MinusIcon className="gba:w-3 gba:h-3" />
          <span className="gba:text-xs">No change</span>
        </Badge>
      )
    }

    const variant = trend.trend === 'up' ? 'success' : 'destructive'
    const Icon = trend.trend === 'up' ? TrendUpIcon : TrendDownIcon
    const sign = trend.trend === 'up' ? '+' : '-'

    return (
      <Badge variant={variant} className="gba:flex gba:items-center gba:gap-1">
        <Icon className="gba:w-3 gba:h-3" />
        <span className="gba:text-xs">
          {sign}
          {trend.percentage.toFixed(1)}%
        </span>
      </Badge>
    )
  }

  // Render card content based on investment types availability
  const renderCardContent = () => {
    const hasValidTypes = subTypes.length > 0 && subTypes[0].name !== 'Unknown'
    const hasInvestments = subTypes.length > 0

    if (hasValidTypes) {
      // Show investment types list
      return (
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">Investment Types</p>
          {subTypes.map(subType => (
            <div key={subType.name} className="gba:flex gba:justify-between gba:items-center">
              <p className="gba:text-sm gba:text-gray-600">{subType.name}</p>
              <div className="gba:text-right">
                <p className="gba:text-sm gba:font-medium">{subType.amount}</p>
                <p className="gba:text-xs gba:text-gray-500">{subType.percentage}</p>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (hasInvestments) {
      // Show overview with total count
      return (
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">Overview</p>
          <div className="gba:flex gba:justify-between gba:items-center">
            <p className="gba:text-sm gba:text-gray-600">Total Investments</p>
            <p className="gba:text-sm gba:font-medium">{currencyFilteredInvestments.length}</p>
          </div>
        </div>
      )
    }

    // Show empty state
    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium gba:text-gray-700">Overview</p>
        <p className="gba:text-sm gba:text-gray-400 gba:text-center gba:py-4">No investments in {selectedCurrency}</p>
      </div>
    )
  }

  return (
    <Card
      className="gba:h-full"
      data-testid={`investment-breakdown-card-${group.name.toLowerCase().replace(' ', '-')}`}
    >
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div
              className="gba:cursor-pointer gba:transition-transform gba:hover:scale-105"
              onClick={handleNavigateClick}
              data-testid={`investment-group-icon-${group.name.toLowerCase().replace(' ', '-')}`}
            >
              <IconAvatar icon={group.icon} variant={moduleColor || 'ext3'} size="md" />
            </div>
            <div className="gba:flex-1">
              <CardTitle>
                <span>{group.name}</span>
              </CardTitle>
              <p className="gba:text-sm gba:text-gray-600">
                {currencyFilteredInvestments.length} investments in {selectedCurrency}
              </p>
            </div>
          </div>
          <div className="gba:ml-auto">
            <CurrencyFilter
              value={selectedCurrency}
              onChange={setSelectedCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId={`investment-breakdown-currency-filter-${group.name.toLowerCase().replace(' ', '-')}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:p-6">
        {/* Trend indicator for last quarter */}
        <div className="gba:mb-4 gba:pb-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-2">
            <p className="gba:text-xs gba:text-gray-500">Last quarter activity</p>
            {renderTrendBadge(trendData)}
          </div>
        </div>

        {/* Total Invested */}
        <div className="gba:mb-4">
          <p className="gba:text-sm gba:text-gray-600 gba:mb-1">Total Invested</p>
          <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
            {formatCurrencyCompact(totalInvested, selectedCurrency, undefined, 1, true)}
          </p>
        </div>

        {/* Investment Types or Overview */}
        {renderCardContent()}
      </CardContent>
    </Card>
  )
}

export default InvestmentBreakdownCard
