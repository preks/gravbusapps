import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar, Badge, Spinner } from '@newwork/nw-design-system'
import { TrendUpIcon, TrendDownIcon, MinusIcon, type Icon } from '@phosphor-icons/react'
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
 * Fetches aggregated count data server-side — no raw investment records needed.
 */
const InvestmentBreakdownCard: React.FC<InvestmentBreakdownCardProps> = ({
  group,
  accessToken,
  moduleColor,
  onNavigateToInvestmentType
}) => {
  const { data, isLoading, error } = useInvestmentGroupAggregates(accessToken, group.name, group.types)

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
          <p className="gba:text-sm gba:text-gray-400 gba:text-center gba:py-4">No investments</p>
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
                <p className="gba:text-sm gba:font-medium">{subType.count}</p>
                <p className="gba:text-xs gba:text-gray-500">{subType.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium gba:text-gray-700">Investment Types</p>
        <div className="gba:flex gba:justify-between gba:items-center">
          <p className="gba:text-sm gba:text-gray-600">All investments</p>
          <div className="gba:text-right">
            <p className="gba:text-sm gba:font-medium">{data.totalCount}</p>
            <p className="gba:text-xs gba:text-gray-500">100.0%</p>
          </div>
        </div>
        <p className="gba:text-xs gba:text-gray-500">No investment types configured for this group.</p>
      </div>
    )
  }

  return (
    <Card
      className="gba:h-full"
      data-testid={`investment-breakdown-card-${group.name.toLowerCase().replace(' ', '-')}`}
    >
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:justify-between gba:items-start">
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
              <p className="gba:text-sm gba:text-gray-600">{isLoading ? '...' : (data?.totalCount ?? 0)} investments</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:px-6 gba:pt-0 gba:pb-6">
        {/* Trend indicator vs 91 days ago (by acquisitionDate) */}
        <div className="gba:mb-4 gba:pb-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-2">
            <p className="gba:text-xs gba:text-gray-500">Last quarter activity</p>
            {!isLoading && data && renderTrendBadge(data.trendData)}
          </div>
        </div>

        {/* Investment Types or Overview */}
        {renderCardContent()}
      </CardContent>
    </Card>
  )
}

export default InvestmentBreakdownCard
