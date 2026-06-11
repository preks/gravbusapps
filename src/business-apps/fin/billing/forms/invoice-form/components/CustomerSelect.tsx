import React, { useMemo, useState } from 'react'
import { Combobox, type ComboboxOption, useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'
import type { BillingCustomer } from '../../../common/types'

interface CustomerSelectProps {
  customers: BillingCustomer[]
  value: string
  onChange: (value: string) => void
  loading?: boolean
}

/** Secondary detail used to disambiguate duplicate company names in the list. */
function customerDetail(customer: BillingCustomer): string {
  return [customer.billingAddressLines[0], customer.countryCode].filter(Boolean).join(' · ')
}

function matchesQuery(customer: BillingCustomer, query: string): boolean {
  const haystack = [customer.name, ...customer.billingAddressLines, customer.countryCode].join(' ').toLowerCase()
  return haystack.includes(query)
}

/**
 * Searchable billing-customer picker backed by the CRM account list. Filtering
 * is done client-side (the full list is already loaded), so we drive the
 * Combobox with `onSearch` and feed it pre-filtered options.
 */
export function CustomerSelect({ customers, value, onChange, loading = false }: CustomerSelectProps) {
  const { t } = useTranslation(billingTranslations)
  const [query, setQuery] = useState('')

  const options: ComboboxOption[] = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = normalized ? customers.filter(customer => matchesQuery(customer, normalized)) : customers
    return filtered.map(customer => {
      const detail = customerDetail(customer)
      return {
        value: customer.id,
        label: customer.name,
        optionLabel: detail ? `${customer.name} — ${detail}` : customer.name
      }
    })
  }, [customers, query])

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onChange}
      onSearch={setQuery}
      loading={loading}
      placeholder={t('billing-form-customer-placeholder')}
      searchPlaceholder={t('billing-form-customer-search')}
      emptyText={t('billing-form-customer-empty')}
      loadingText={t('billing-form-customer-loading')}
      data-testid="form-customer"
    />
  )
}
