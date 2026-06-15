import React, { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Spinner
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelines, type CurrencyOption } from '../../hooks'
import { OverviewContent } from './OverviewContent'

interface OverviewViewProps extends BusinessAppContextProps {
  currencies: CurrencyOption[]
  currenciesLoading: boolean
}

const DATA_TEST_ID_PREFIX = 'sales-performance-overview'
const DEFAULT_CURRENCY = 'EUR'

/**
 * Currency filter component
 */
interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string; id: string }>
  onCurrencyChange: (currencyCode: string) => void
  isLoading?: boolean
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  selectedCurrency,
  currencies,
  onCurrencyChange,
  isLoading = false
}) => {
  if (currencies.length === 0 && !isLoading) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange} disabled={isLoading}>
        <SelectTrigger className="gba:w-32" data-testid={`${DATA_TEST_ID_PREFIX}-currency-selector`}>
          <SelectValue placeholder="Select currency">{selectedCurrency}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Overview View for Sales Performance
 *
 * Owns the currency selector and fetches the currency/pipeline lists. The data-heavy
 * content is rendered via OverviewContent only after currencies have resolved, so the
 * selected currency is known on the first fetch and each currency-scoped query runs once.
 */
export const OverviewView: React.FC<OverviewViewProps> = ({ accessToken, currencies, currenciesLoading }) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)

  // Fetch pipelines for the selectors
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)

  // Convert currency code to full ID for filtering
  // Always returns a currency ID (defaults to finding EUR or first available)
  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(c => c.code === selectedCurrencyCode)
    if (currency) return currency.id

    // If selected currency not found, try EUR
    const eurCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    // Fallback to first available currency
    return currencies[0]?.id
  }, [selectedCurrencyCode, currencies])

  return (
    <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
      {/* Currency Filter */}
      <section className="gba:flex gba:justify-end" data-testid={`${DATA_TEST_ID_PREFIX}-filters-section`}>
        <CurrencyFilter
          selectedCurrency={selectedCurrencyCode}
          currencies={currencies}
          onCurrencyChange={setSelectedCurrencyCode}
          isLoading={currenciesLoading}
        />
      </section>

      {currenciesLoading ? (
        <section
          className="gba:flex gba:items-center gba:justify-center gba:h-[250px]"
          data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
        >
          <Spinner size="lg" />
        </section>
      ) : (
        <OverviewContent
          accessToken={accessToken}
          selectedCurrencyId={selectedCurrencyId}
          selectedCurrencyCode={selectedCurrencyCode}
          pipelines={pipelines}
          pipelinesLoading={pipelinesLoading}
        />
      )}
    </div>
  )
}

export default OverviewView
