import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconAvatar,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'
import { Investment } from '@/common/data/investment/types/investmentTypes'

// Type definitions
export interface SubType {
  name: string
  amount: string
  percentage: string
}

export interface InvestmentGroup {
  name: string
  icon: LucideIcon
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
  formatGroupName: (groupName: string) => string
  calculateTrendData: (investments: Investment[]) => TrendData
  masterCurrency: string
  availableCurrencies: string[]
  formatCurrency: (amount: number, currency: string) => string
}

/**
 * Generic investment breakdown card component
 * Displays investment group information with metrics and subtypes
 */
const InvestmentBreakdownCard: React.FC<InvestmentBreakdownCardProps> = ({
  group,
  moduleColor,
  onNavigateToInvestmentType,
  formatGroupName,
  calculateTrendData,
  masterCurrency,
  availableCurrencies,
  formatCurrency
}) => {
  // Individual currency state for this card (starts with master currency)
  const [selectedCurrency, setSelectedCurrency] = useState(masterCurrency)

  // Reset to master currency when it changes
  useEffect(() => {
    setSelectedCurrency(masterCurrency)
  }, [masterCurrency])

  // Helper to extract currency from investment
  const getInvestmentCurrency = React.useCallback((investment: Investment): string | null => {
    if (!investment.currency) return null
    const currency = investment.currency as any
    if (typeof currency === 'string') {
      const parts = currency.split(':')
      return parts[parts.length - 1] || null
    }
    if (typeof currency === 'object' && currency !== null) {
      const currencyStr = currency.code || currency.value
      const parts = currencyStr?.split(':') || []
      return parts[parts.length - 1] || null
    }
    return null
  }, [])

  // Filter investments by selected currency
  const currencyFilteredInvestments = useMemo(() => {
    return group.groupInvestments.filter(inv => {
      const currency = getInvestmentCurrency(inv)
      return currency === selectedCurrency
    })
  }, [group.groupInvestments, selectedCurrency])

  // Calculate totals from filtered investments
  const totalInvested = useMemo(() => {
    return currencyFilteredInvestments.reduce((sum, inv) => sum + (inv.totalInvestmentAmount || 0), 0)
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
      const total = investments.reduce((sum, inv) => sum + (inv.totalInvestmentAmount || 0), 0)
      const percentage = totalInvested > 0 ? (total / totalInvested) * 100 : 0

      return {
        name: typeName,
        amount: formatCurrency(total, selectedCurrency),
        percentage: `${percentage.toFixed(1)}%`
      }
    })
  }, [currencyFilteredInvestments, totalInvested, selectedCurrency, formatCurrency])
  const handleNavigateClick = () => {
    const subtabMap: { [key: string]: string } = {
      Equity: 'equity',
      'Real Estate': 'real-estate',
      RealEstate: 'real-estate',
      'Liquid Fund': 'liquid-funds',
      'Liquid Funds': 'liquid-funds',
      LiquidFund: 'liquid-funds',
      LiquidFunds: 'liquid-funds'
    }

    const subtab = subtabMap[group.name] || formatGroupName(group.name).toLowerCase().replace(' ', '-')

    onNavigateToInvestmentType(subtab)
  }

  // Calculate trend data based on acquisition dates (using filtered investments)
  const trendData = calculateTrendData(currencyFilteredInvestments)

  // Helper to render trend badge
  const renderTrendBadge = (trend: TrendData) => {
    if (trend.trend === 'neutral') {
      return (
        <Badge variant="outline" className="gba:flex gba:items-center gba:gap-1">
          <Minus className="gba:w-3 gba:h-3" />
          <span className="gba:text-xs">No change</span>
        </Badge>
      )
    }

    const variant = trend.trend === 'up' ? 'success' : 'destructive'
    const Icon = trend.trend === 'up' ? TrendingUp : TrendingDown
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
                <span>{formatGroupName(group.name)}</span>
              </CardTitle>
              <p className="gba:text-sm gba:text-gray-600">
                {currencyFilteredInvestments.length} investments in {selectedCurrency}
              </p>
            </div>
          </div>
          <div className="gba:ml-auto">
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="gba:w-[100px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:p-6">
        {/* Trend indicator for last 30 days */}
        <div className="gba:mb-4 gba:pb-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-2">
            <p className="gba:text-xs gba:text-gray-500">Last 30 days activity</p>
            {renderTrendBadge(trendData)}
          </div>
        </div>

        {/* Total Invested */}
        <div className="gba:mb-4">
          <p className="gba:text-sm gba:text-gray-600 gba:mb-1">Total Invested</p>
          <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
            {formatCurrency(totalInvested, selectedCurrency)}
          </p>
        </div>

        {/* Investment Types */}
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">Investment Types</p>
          {subTypes.length > 0 ? (
            subTypes.map(subType => (
              <div key={subType.name} className="gba:flex gba:justify-between gba:items-center">
                <p className="gba:text-sm gba:text-gray-600">{subType.name}</p>
                <div className="gba:text-right">
                  <p className="gba:text-sm gba:font-medium">{subType.amount}</p>
                  <p className="gba:text-xs gba:text-gray-500">{subType.percentage}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="gba:text-sm gba:text-gray-400 gba:text-center gba:py-4">
              No investments in {selectedCurrency}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default InvestmentBreakdownCard
