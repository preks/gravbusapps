import { getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils'

export const formatCurrency = (amount: number, currencyCode: string) => {
  const formattedAmount = formatNumberFunction(String(amount), '0.00[,]00')
  return `${formattedAmount} ${currencyCode || 'EUR'}`
}

export const getCatalogValue = (catalogEntry: any): string => {
  if (!catalogEntry) return ''

  try {
    const currentLocale = getCurrentActiveUserLocale().toLowerCase()
    if (Array.isArray(catalogEntry.translations)) {
      const translation = catalogEntry.translations.find((t: any) => t?.localeCode?.toLowerCase() === currentLocale)
      if (translation?.value) return translation.value
    }
    return catalogEntry.value || ''
  } catch {
    return catalogEntry?.value || ''
  }
}
