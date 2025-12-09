import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Spinner
} from '@newwork/nw-design-system'

export interface TopAccountItem {
  id: string
  name: string
  industry: string
  opportunityCount?: number
  wonOpportunities?: number
  totalValue: number
}

interface TopAccountsByRevenueProps {
  topAccounts: TopAccountItem[]
  isLoading?: boolean
  moduleColor?: string
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
}

export const TopAccountsByRevenue: React.FC<TopAccountsByRevenueProps> = ({
  topAccounts,
  isLoading = false,
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
    <Card data-testid="top-accounts-section">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:inline-block">{/* icon space parity with source */}</span>
            Top Accounts by Revenue
          </CardTitle>
          {/* Currency Filter */}
          {availableCurrencies && availableCurrencies.length > 1 && onCurrencyChange && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto" data-testid="top-accounts-currency-filter">
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="top-accounts-loading">
            <Spinner size="lg" />
          </div>
        )}
        {!isLoading && topAccounts.length > 0 && (
          <div className="gba:space-y-3">
            {topAccounts.map((account, index) => (
              <div
                key={account.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                data-testid={`top-account-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="gba:font-medium">{account.name}</div>
                    <div className="gba:text-sm gba:text-gray-600">
                      {account.industry} • {account.wonOpportunities || account.opportunityCount} won opportunities
                    </div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold">{formatCurrency(account.totalValue)}</div>
                  <div className="gba:text-sm gba:text-gray-600">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && topAccounts.length === 0 && (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">No accounts with revenue available</div>
        )}
      </CardContent>
    </Card>
  )
}

export default TopAccountsByRevenue
