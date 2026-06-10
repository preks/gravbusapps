import React, { useMemo } from 'react'
import { AssetAllocation } from '../types'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import { UserIcon, CalendarIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import {
  useAssetConditionCatalog,
  AssetConditionOption
} from '../../../forms/equipment-registration/hooks/useAssetConditionCatalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface AssetAllocationHistoryProps {
  allocations: AssetAllocation[]
  isLoading?: boolean
  accessToken: string
}

const calculateDuration = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    const daysLabel =
      diffDays === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_day', 'day')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_days', 'days')
    return `${diffDays} ${daysLabel}`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    const monthLabel =
      months === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_month', 'month')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_months', 'months')
    return `${months} ${monthLabel}`
  } else {
    const years = Math.floor(diffDays / 365)
    const remainingMonths = Math.floor((diffDays % 365) / 30)
    const yearLabel =
      years === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_year', 'year')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_years', 'years')
    const monthLabel =
      remainingMonths === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_month', 'month')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.duration_months', 'months')
    return `${years} ${yearLabel}${remainingMonths > 0 ? ` ${remainingMonths} ${monthLabel}` : ''}`
  }
}

export const AssetAllocationHistory: React.FC<AssetAllocationHistoryProps> = ({
  allocations,
  isLoading = false,
  accessToken
}) => {
  const { options: conditionOptions } = useAssetConditionCatalog({ accessToken } as BusinessAppContextProps)

  const conditionLookup = useMemo(() => {
    const lookup = new Map<string, string>()
    conditionOptions.forEach((option: AssetConditionOption) => {
      lookup.set(option.id, option.value)
    })
    return lookup
  }, [conditionOptions])

  const getConditionDisplayValue = (conditionRef?: string, conditionValue?: string): string => {
    if (!conditionRef && !conditionValue)
      return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
    if (conditionRef && conditionLookup.has(conditionRef)) {
      return conditionLookup.get(conditionRef)!
    }
    return conditionValue || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
  }

  if (isLoading) {
    return (
      <Card data-testid="asset-allocation-history-loading">
        <CardContent className="gba:py-8 gba:text-center">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.allocation_history_loading',
            'Loading allocation history...'
          )}
        </CardContent>
      </Card>
    )
  }

  if (allocations.length === 0) {
    return (
      <Card data-testid="asset-allocation-history-empty">
        <CardContent className="gba:py-8 gba:text-center gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.allocation_history_empty',
            'No allocation history available for this asset.'
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="asset-allocation-history">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocation_history_title', 'Allocation History')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {allocations.map(allocation => {
            const allocationTargetName =
              allocation.room?.name ||
              allocation.employee?.displayName ||
              `${allocation.employee?.firstName || ''} ${allocation.employee?.lastName || ''}`.trim() ||
              getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.unknown_employee', 'Unknown Employee')

            return (
              <div
                key={allocation.id}
                className="gba:border-l-2 gba:border-primary gba:pl-4 gba:pb-4"
                data-testid={`allocation-item-${allocation.id}`}
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <UserIcon size={20} className="gba:text-primary" />
                  <span className="gba:font-medium">{allocationTargetName}</span>
                  {!allocation.endDate && (
                    <Badge variant="success" data-testid={`allocation-active-${allocation.id}`}>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.current', 'Current')}
                    </Badge>
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-2">
                  <CalendarIcon size={16} />
                  <span>
                    {formatDate(allocation.startDate) || allocation.startDate}
                    {allocation.endDate ? (
                      <>
                        {' → '}
                        {formatDate(allocation.endDate) || allocation.endDate}
                      </>
                    ) : (
                      ` → ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.present', 'Present')}`
                    )}
                  </span>
                  <span className="gba:text-xs">({calculateDuration(allocation.startDate, allocation.endDate)})</span>
                </div>

                {allocation.startAssetCondition && (
                  <div className="gba:text-sm gba:mb-1">
                    <span className="gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.start_condition', 'Start Condition')}:{' '}
                    </span>
                    <span className="gba:text-muted-foreground">
                      {getConditionDisplayValue(
                        allocation.startAssetConditionRef,
                        allocation.startAssetCondition.value
                      )}
                    </span>
                  </div>
                )}

                {allocation.endAssetCondition && (
                  <div className="gba:text-sm gba:mb-1">
                    <span className="gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.return_condition', 'Return Condition')}
                      :{' '}
                    </span>
                    <span className="gba:text-muted-foreground">
                      {getConditionDisplayValue(allocation.endAssetConditionRef, allocation.endAssetCondition.value)}
                    </span>
                  </div>
                )}

                {!allocation.endDate && allocation.expectedEndDate && (
                  <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                    <CheckCircleIcon size={16} />
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.expected_return', 'Expected return')}:{' '}
                      {formatDate(allocation.expectedEndDate) || allocation.expectedEndDate}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
