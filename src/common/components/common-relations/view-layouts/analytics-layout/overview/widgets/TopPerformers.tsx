import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label
} from '@newwork/nw-design-system'
import { TrophyIcon } from '@phosphor-icons/react'

export interface TopPerformerItem {
  employeeId: string
  employeeName: string
  dealsWon: number
  totalValue: number
}

export interface TopPerformersProps {
  performers: TopPerformerItem[]
  moduleColor?: string
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
}

export const TopPerformers: React.FC<TopPerformersProps> = ({
  performers,
  moduleColor = 'default',
  selectedCurrency = 'EUR',
  onCurrencyChange,
  availableCurrencies = ['EUR', 'USD']
}) => {
  // Currency formatter
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      notation: 'standard',
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <Card data-testid="top-performers-section">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrophyIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div className="gba:flex-1">
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>Best performing team members</CardDescription>
        </div>
        {/* Currency Filter */}
        {availableCurrencies && availableCurrencies.length > 1 && onCurrencyChange && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto" data-testid="top-performers-currency-filter">
            <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency</Label>
            <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="gba:w-32">
                <SelectValue />
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
        )}
      </CardHeader>
      <CardContent>
        {performers.length > 0 ? (
          <div className="gba:space-y-3">
            {performers.map((performer, index) => (
              <div
                key={performer.employeeId}
                className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-lg gba:hover:bg-gray-50 gba:transition-colors"
                data-testid={`top-performer-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-blue-100 gba:text-blue-600 gba:rounded-full gba:font-bold gba:text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="gba:font-medium">{performer.employeeName}</div>
                    <div className="gba:text-sm gba:text-gray-600">{performer.dealsWon} deals won</div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold gba:text-lg">{formatCurrency(performer.totalValue)}</div>
                  <div className="gba:text-sm gba:text-gray-600">Total Value</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:text-gray-500 gba:py-12">
            <TrophyIcon className="gba:text-4xl gba:mb-4 gba:opacity-50" />
            <p>No performance data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TopPerformers
