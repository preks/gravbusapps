import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar, Badge, Spinner } from '@newwork/nw-design-system'
import { TrendUpIcon, TrendDownIcon, MinusIcon, type Icon } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { useCurrencySync } from '../../analytics-view/shared/hooks'
import { CurrencyFilter } from '../../analytics-view/shared/components'
import { useInvestmentGroupAggregates, type GroupTypeInfo, type TrendData } from '../hooks/useInvestmentGroupAggregates'

export interface InvestmentGroup {
  name: string
  icon: Icon
  types: GroupTypeInfo[]
}

interface InvestmentBreakdownCardProps {
  group: InvestmentGroup
  accessToken: string
  moduleColor?: 'ext1' | 'ext2' | 'ext3' | 'ext4' | 'ext5' | 'ext6' | 'ext7' | 'ext8'
  onNavigateToInvestmentType: (investmentType: string) => void
  masterCurrency: string
  availableCurrencies: string[]
}

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
  const TrendIcon = trend.trend === 'up' ? TrendUpIcon : TrendDownIcon
  const sign = trend.trend === 'up' ? '+' : '-'
  return (
    <Badge variant={variant} className="gba:flex gba:items-center gba:gap-1">
      <TrendIcon className="gba:w-3 gba:h-3" />
      <span className="gba:text-xs">
        {sign}
        {trend.percentage.toFixed(1)}%
      </span>
    </Badge>
  )
}

/**
 * Generic investment breakdown card component.
 * Fetches aggregated data (count, total, type breakdown, trend) server-side
 * for the selected currency — no raw investment records needed.
 */
const InvestmentBreakdownCard: React.FC<InvestmentBreakdownCardProps> = ({
  group,
  accessToken,
  moduleColor,
  onNavigateToInvestmentType,
  masterCurrency,
  availableCurrencies
}) => {
  const [selectedCurrency, setSelectedCurrency] = useCurrencySync(masterCurrency)

  const { data, isLoading, error } = useInvestmentGroupAggregates(
    accessToken,
    group.name,
    group.types,
    selectedCurrency
  )

  const handleNavigateClick = () => {
    const subtabMap: Record<string, string> = {
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

  const renderCardContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-6">
          <Spinner size="sm" />
        </div>
      )
    }

    if (error) {
      return <p className="gba:text-sm gba:text-destructive gba:text-center gba:py-4">{error}</p>
    }

    if (!data || data.totalCount === 0) {
      return (
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">Overview</p>
          <p className="gba:text-sm gba:text-gray-400 gba:text-center gba:py-4">No investments in {selectedCurrency}</p>
        </div>
      )
    }

    if (data.typeBreakdown.length > 0) {
      return (
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">Investment Types</p>
          {data.typeBreakdown.map(subType => (
            <div key={subType.value} className="gba:flex gba:justify-between gba:items-center">
              <p className="gba:text-sm gba:text-gray-600">{subType.value}</p>
              <div className="gba:text-right">
                <p className="gba:text-sm gba:font-medium">
                  {formatCurrencyCompact(subType.totalAmount, selectedCurrency, undefined, 1, true)}
                </p>
                <p className="gba:text-xs gba:text-gray-500">{subType.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium gba:text-gray-700">Overview</p>
        <div className="gba:flex gba:justify-between gba:items-center">
          <p className="gba:text-sm gba:text-gray-600">Total Investments</p>
          <p className="gba:text-sm gba:font-medium">{data.totalCount}</p>
        </div>
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
                {isLoading ? '...' : (data?.totalCount ?? 0)} investments in {selectedCurrency}
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
        {/* Trend indicator vs 91 days ago (by acquisitionDate) */}
        <div className="gba:mb-4 gba:pb-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-2">
            <p className="gba:text-xs gba:text-gray-500">Last quarter activity</p>
            {!isLoading && data && renderTrendBadge(data.trendData)}
          </div>
        </div>

        {/* Total Invested */}
        <div className="gba:mb-4">
          <p className="gba:text-sm gba:text-gray-600 gba:mb-1">Total Invested</p>
          <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
            {isLoading ? '...' : formatCurrencyCompact(data?.totalAmount ?? 0, selectedCurrency, undefined, 1, true)}
          </p>
        </div>

        {/* Investment Types or Overview */}
        {renderCardContent()}
      </CardContent>
    </Card>
  )
}

export default InvestmentBreakdownCard
