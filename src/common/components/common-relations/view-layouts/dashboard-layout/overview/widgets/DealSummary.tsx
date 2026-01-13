import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { TrendingUp } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DealItem {
  id: string
  name: string
  stage: string
  value: string // already formatted value in original
  owner?: string
  closeDate?: string
}

export interface DealSummaryProps {
  deals: DealItem[]
  moduleColor?: string
  onDealClick?: (dealId: string) => void
  availableCurrencies?: string[]
  selectedDealCurrency?: string
  onDealCurrencyChange?: (currency: string) => void
}

export const DealSummary: React.FC<DealSummaryProps> = ({
  deals,
  onDealClick,
  availableCurrencies = [],
  selectedDealCurrency = 'EUR',
  onDealCurrencyChange
}) => {
  const handleDealClick = (dealId: string) => {
    onDealClick?.(dealId)
  }

  return (
    <Card className="gba:h-full" data-testid="overview-deal-summary-container">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-indigo-100 gba:rounded-lg">
              <TrendingUp className="gba:text-indigo-600 gba:h-6 gba:w-6" />
            </div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('dealSummary.keyDealsTitle', 'Key Deals - Current Year')}
            </CardTitle>
          </div>

          {/* Currency Filter */}
          {availableCurrencies.length > 0 && onDealCurrencyChange && (
            <Select value={selectedDealCurrency} onValueChange={onDealCurrencyChange}>
              <SelectTrigger className="gba:w-32">
                <SelectValue placeholder="EUR" />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
          data-testid="key-deals-grid"
        >
          {deals.slice(0, 5).map(deal => (
            <div
              key={deal.id}
              data-testid={`key-deal-item-${deal.id}`}
              className="gba:p-4 gba:rounded-lg gba:border gba:border-border gba:transition-all gba:duration-200 gba:hover:shadow-md gba:cursor-pointer gba:hover:bg-accent"
              onClick={() => handleDealClick(deal.id)}
            >
              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{deal.name}</div>
                <Badge variant="secondary">{deal.stage}</Badge>
              </div>
              <div className="gba:text-lg gba:font-bold gba:text-blue-600 gba:mb-1">{deal.value}</div>
              <div className="gba:text-xs gba:text-gray-500">
                {deal.owner} • {deal.closeDate}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default DealSummary
