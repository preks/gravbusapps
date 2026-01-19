import { AssetStatus } from '../types'
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils'

export const getStatusBadgeVariant = (
  status: AssetStatus
): 'success' | 'info' | 'warning' | 'destructive' | 'default' => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'success'
    case AssetStatus.ALLOCATED:
      return 'info'
    case AssetStatus.UNDER_REPAIR:
      return 'warning'
    case AssetStatus.RETIRED:
      return 'destructive'
    default:
      return 'default'
  }
}

export const formatStatus = (status: AssetStatus | string): string => {
  if (status === AssetStatus.AVAILABLE) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_available', 'Available')
  }
  if (status === AssetStatus.ALLOCATED) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_allocated', 'Allocated')
  }
  if (status === AssetStatus.UNDER_REPAIR) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_in_repair', 'In Repair')
  }
  if (status === AssetStatus.RETIRED) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_retired', 'Retired')
  }
  const statusStr = status as string
  return statusStr
    .replace(/_ASSET$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

export const formatCurrency = (amount: number, currency?: string): string => {
  const formattedAmount = formatNumberFunction(amount)
  if (!currency) {
    return formattedAmount
  }
  return `${formattedAmount} ${currency}`
}
