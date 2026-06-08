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

export interface OpportunitySummaryItem {
  id: string
  name: string
  stage: string
  value: string // already formatted value in original
  owner?: string
  closeDate?: string
}

export interface OpportunitySummaryProps {
  opportunities: OpportunitySummaryItem[]
  onOpportunityClick?: (opportunityId: string) => void
  availableCurrencies?: string[]
  selectedOpportunityCurrency?: string
  onOpportunityCurrencyChange?: (currency: string) => void
}

export const OpportunitySummary: React.FC<OpportunitySummaryProps> = ({
  opportunities,
  onOpportunityClick,
  availableCurrencies = [],
  selectedOpportunityCurrency = 'EUR',
  onOpportunityCurrencyChange
}) => {
  const handleOpportunityClick = (opportunityId: string) => {
    onOpportunityClick?.(opportunityId)
  }

  return (
    <Card className="gba:h-full" data-testid="overview-opportunity-summary-container">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-indigo-100 gba:rounded-lg">
              <TrendingUp className="gba:text-indigo-600 gba:h-6 gba:w-6" />
            </div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'opportunitySummary.keyOpportunitiesTitle',
                'Key Opportunities - Current Year'
              )}
            </CardTitle>
          </div>

          {/* Currency Filter */}
          {availableCurrencies.length > 0 && onOpportunityCurrencyChange && (
            <Select value={selectedOpportunityCurrency} onValueChange={onOpportunityCurrencyChange}>
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
          data-testid="key-opportunities-grid"
        >
          {opportunities.slice(0, 5).map(opportunity => (
            <button
              key={opportunity.id}
              type="button"
              data-testid={`key-opportunity-item-${opportunity.id}`}
              className="gba:p-4 gba:rounded-lg gba:border gba:border-border gba:text-left gba:w-full gba:transition-all gba:duration-200 gba:hover:shadow-md gba:cursor-pointer gba:hover:bg-accent"
              onClick={() => handleOpportunityClick(opportunity.id)}
            >
              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{opportunity.name}</div>
                <Badge variant="secondary">{opportunity.stage}</Badge>
              </div>
              <div className="gba:text-lg gba:font-bold gba:text-blue-600 gba:mb-1">{opportunity.value}</div>
              <div className="gba:text-xs gba:text-gray-500">
                {opportunity.owner} • {opportunity.closeDate}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default OpportunitySummary
