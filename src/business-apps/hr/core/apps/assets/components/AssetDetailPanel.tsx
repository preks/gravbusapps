import React, { useMemo } from 'react'
import { Asset, AssetAllocation, AssetStatus } from '../types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarIcon, MapPinIcon, TagIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDate,
  formatNumberFunction,
  getCurrentActiveUserLocale,
  getCatalogValue
} from '@/common/utils/windowUtils'
import {
  useAssetConditionCatalog,
  AssetConditionOption
} from '../../../forms/equipment-registration/hooks/useAssetConditionCatalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/en'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import assetsTranslations from '../_i18n'

dayjs.extend(relativeTime)

interface AssetDetailPanelProps {
  asset: Asset | null
  allocations: AssetAllocation[]
  isOpen: boolean
  onClose: () => void
  accessToken: string
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
  onGenerateDocument?: (assetId: string) => void
}

const getStatusBadgeVariant = (status: AssetStatus): 'success' | 'info' | 'warning' | 'destructive' | 'default' => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'success'
    case AssetStatus.PENDING:
      return 'default'
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

const formatStatus = (status: AssetStatus | string): string => {
  if (status === AssetStatus.AVAILABLE) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_available', 'Available')
  }
  if (status === AssetStatus.PENDING) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.pending', 'Pending')
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
  // Fallback: format by removing _ASSET and replacing underscores with spaces, then capitalize
  const statusStr = status as string
  return statusStr
    .replace(/_ASSET$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
}

const formatCurrency = (amount: number, currency?: string): string => {
  const formattedAmount = formatNumberFunction(amount)
  if (!currency) {
    return formattedAmount
  }
  return `${formattedAmount} ${currency}`
}

const isWarrantyExpired = (expiryDate: string): boolean => {
  return dayjs(expiryDate).isBefore(dayjs())
}

const getWarrantyDaysRemaining = (expiryDate: string): number => {
  return Math.ceil(dayjs(expiryDate).diff(dayjs(), 'day'))
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  allocations,
  isOpen,
  onClose,
  accessToken,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset,
  onGenerateDocument
}) => {
  if (!asset) return null

  const { t } = useTranslation(assetsTranslations)
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

  const getResponsiblePersonDisplay = (): string => {
    const r = asset.responsibleEmployee
    if (!r) return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
    if (r.displayName?.trim()) return r.displayName.trim()
    const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()
    return name || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
  }

  const isAllocated = asset.assetStatus === AssetStatus.ALLOCATED
  const isRetired = asset.assetStatus === AssetStatus.RETIRED

  const staticFlowData = useMemo(() => {
    const actions: any[] = []

    if (!isRetired && onUpdateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'update-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_asset', 'Update Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onUpdateAsset(asset.id)
        }
      })
    }

    if (!isAllocated && !isRetired && onAllocateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'allocate-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset', 'Allocate Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onAllocateAsset(asset.id)
        }
      })
    }

    if (isAllocated && !isRetired && onRetrieveAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'retrieve-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retrieve_asset', 'Retrieve Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetrieveAsset(asset.id)
        }
      })
    }

    if (!isRetired && onRetireAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'retire-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retire_asset', 'Retire Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetireAsset(asset.id)
        }
      })
    }

    if (isRetired && onGenerateDocument) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'generate-document',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.export_certificate', 'Export certificate'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onGenerateDocument(asset.id)
        }
      })
    }

    return actions
  }, [
    asset.id,
    isAllocated,
    isRetired,
    onAllocateAsset,
    onUpdateAsset,
    onRetireAsset,
    onRetrieveAsset,
    onGenerateDocument
  ])

  const userLocale = getCurrentActiveUserLocale()
  const localeCode = userLocale.split('-')[0].toLowerCase()
  const dayjsLocale = localeCode === 'ro' ? 'ro' : localeCode === 'de' ? 'de' : 'en'
  dayjs.locale(dayjsLocale)

  const hasValidWarrantyData =
    asset.acquisitionDate != null &&
    asset.acquisitionDate !== '' &&
    typeof asset.warrantyPeriodMonths === 'number' &&
    !Number.isNaN(asset.warrantyPeriodMonths)

  const warrantyExpiryDate = hasValidWarrantyData
    ? dayjs(asset.acquisitionDate).add(asset.warrantyPeriodMonths ?? 0, 'month')
    : null

  const warrantyExpired = warrantyExpiryDate != null && isWarrantyExpired(warrantyExpiryDate.toISOString())
  const daysRemaining = warrantyExpiryDate != null ? getWarrantyDaysRemaining(warrantyExpiryDate.toISOString()) : 0
  const sortedAllocations = [...allocations].sort((a, b) => dayjs(b.startDate).diff(dayjs(a.startDate)))

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="gba:w-full sm:gba:max-w-xl gba:flex gba:flex-col gba:p-0 gba:h-full"
        data-testid="asset-detail-panel"
      >
        <SheetHeader className="gba:pr-12 gba:px-6 gba:pt-6 gba:shrink-0">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div className="gba:flex-1 gba:min-w-0">
              <SheetTitle data-testid="asset-detail-title">
                {asset.assetBrand?.value || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.unknown', 'Unknown')}{' '}
                {asset.model}
              </SheetTitle>
              <SheetDescription data-testid="asset-detail-category">
                {asset.assetCategory
                  ? getCatalogValue(asset.assetCategory)
                  : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
              </SheetDescription>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0 gba:mr-8">
              <Badge variant={getStatusBadgeVariant(asset.assetStatus)} data-testid="asset-detail-status-badge">
                {formatStatus(asset.assetStatus)}
              </Badge>
              <AppActionButton
                data-testid={`asset-actions-button-${asset.id}`}
                size="default"
                staticFlowData={staticFlowData}
                prefixDataTestId={`asset-actions-${asset.id}`}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
              </AppActionButton>
            </div>
          </div>
        </SheetHeader>

        <div
          className="gba:flex-1 gba:overflow-y-auto gba:overflow-x-hidden gba:px-6"
          onWheel={e => {
            // Ensure wheel scroll works in the content area
            const target = e.currentTarget
            if (target.scrollHeight > target.clientHeight) {
              target.scrollTop += e.deltaY
              e.preventDefault()
            }
          }}
        >
          <div className="gba:mt-6 gba:space-y-6 gba:pb-6">
            <Card className="gba:border" data-testid="asset-info-card">
              <CardHeader>
                <CardTitle className="gba:text-base">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.asset_information', 'Asset Information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <TagIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                  <div className="gba:flex-1">
                    <p className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}
                    </p>
                    <p
                      className="gba:text-sm gba:text-muted-foreground gba:font-mono"
                      data-testid="asset-serial-number"
                    >
                      {asset.serialNumber ??
                        getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="gba:flex gba:items-start gba:gap-3">
                  <MapPinIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                  <div className="gba:flex-1">
                    <p className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location')}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-location">
                      {asset.siteLocation?.name ||
                        getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="gba:flex gba:items-start gba:gap-3">
                  <CurrencyDollarIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                  <div className="gba:flex-1">
                    <p className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.inventory_value', 'Inventory Value')}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-value">
                      {formatCurrency(asset.inventoryValue, asset.currency?.code)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="gba:flex gba:items-start gba:gap-3">
                  <CalendarIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                  <div className="gba:flex-1">
                    <p className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.acquisition_date', 'Acquisition Date')}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-acquisition-date">
                      {asset.acquisitionDate
                        ? formatDate(asset.acquisitionDate) || asset.acquisitionDate
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gba:border" data-testid="asset-warranty-card">
              <CardHeader>
                <CardTitle className="gba:text-base">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.warranty', 'Warranty')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <p className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.warranty_period', 'Warranty Period')}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {typeof asset.warrantyPeriodMonths === 'number'
                        ? `${asset.warrantyPeriodMonths} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.months', 'months')}`
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </p>
                  </div>
                  {hasValidWarrantyData ? (
                    warrantyExpired ? (
                      <Badge variant="destructive" data-testid="warranty-status-expired">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.expired', 'Expired')}
                      </Badge>
                    ) : daysRemaining < 90 ? (
                      <Badge variant="warning" data-testid="warranty-status-expiring">
                        {Math.ceil(daysRemaining / 30)}{' '}
                        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.mo_left', 'mo left')}
                      </Badge>
                    ) : (
                      <Badge variant="success" data-testid="warranty-status-valid">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.valid', 'Valid')}
                      </Badge>
                    )
                  ) : null}
                </div>

                <Separator />

                <div>
                  <p className="gba:text-sm gba:font-medium">{t('end-of-warranty-period')}</p>
                  <p className="gba:text-sm gba:text-muted-foreground" data-testid="warranty-expiry-date">
                    {warrantyExpiryDate != null ? (
                      <>
                        {formatDate(warrantyExpiryDate.toISOString()) || warrantyExpiryDate.toISOString()}
                        {!warrantyExpired && (
                          <span className="gba:text-xs gba:ml-2">({warrantyExpiryDate.fromNow()})</span>
                        )}
                      </>
                    ) : (
                      getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {asset.notes && (
              <Card className="gba:border" data-testid="asset-notes-card">
                <CardHeader>
                  <CardTitle className="gba:text-base">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.notes', 'Notes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-notes">
                    {asset.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="gba:border" data-testid="asset-allocation-history-card">
              <CardHeader>
                <CardTitle className="gba:text-base">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:hr_assets.allocation_history_title',
                    'Allocation History'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedAllocations.length === 0 ? (
                  <div className="gba:space-y-2">
                    <p
                      className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4"
                      data-testid="no-allocation-history"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:hr_assets.allocation_history_empty',
                        'No allocation history available for this asset.'
                      )}
                    </p>
                    {isRetired && (
                      <p
                        className="gba:text-xs gba:text-muted-foreground gba:text-center"
                        data-testid="asset-retired-at-by"
                      >
                        {t('retired-at-by', {
                          disposalDate:
                            asset.disposalDate != null && asset.disposalDate !== ''
                              ? formatDate(asset.disposalDate) || asset.disposalDate
                              : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A'),
                          responsiblePerson: getResponsiblePersonDisplay()
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="gba:space-y-4">
                    {sortedAllocations.map((allocation, index) => {
                      const effectivelyEnded = !!allocation.endDate || (isRetired && !allocation.endDate)
                      const isActiveAllocation = !allocation.endDate && !isRetired
                      const showCurrentBadge = isActiveAllocation && asset.assetStatus !== AssetStatus.PENDING
                      const showPendingBadge = isActiveAllocation && asset.assetStatus === AssetStatus.PENDING
                      const endLabel = allocation.endDate
                        ? formatDate(allocation.endDate) || allocation.endDate
                        : isRetired
                          ? t('asset-retired')
                          : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.present', 'Present')
                      return (
                        <div key={allocation.id} data-testid={`allocation-history-item-${allocation.id}`}>
                          <div className="gba:flex gba:items-start gba:gap-3">
                            <div className="gba:flex gba:flex-col gba:items-center gba:pt-1">
                              <div
                                className={`gba:w-3 gba:h-3 gba:rounded-full ${
                                  effectivelyEnded
                                    ? 'gba:bg-muted'
                                    : showPendingBadge
                                      ? 'gba:bg-muted'
                                      : 'gba:bg-success'
                                }`}
                              />
                              {index < sortedAllocations.length - 1 && (
                                <div className="gba:w-0.5 gba:h-16 gba:bg-border gba:my-1" />
                              )}
                            </div>

                            <div className="gba:flex-1 gba:pb-4">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                <p
                                  className="gba:text-sm gba:font-medium"
                                  data-testid={`allocation-employee-${allocation.id}`}
                                >
                                  {allocation.employee?.displayName ||
                                    `${allocation.employee?.firstName || ''} ${allocation.employee?.lastName || ''}`.trim() ||
                                    getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:hr_assets.unknown_employee',
                                      'Unknown Employee'
                                    )}
                                </p>
                                {showCurrentBadge && (
                                  <Badge variant="success" data-testid={`allocation-status-${allocation.id}`}>
                                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.current', 'Current')}
                                  </Badge>
                                )}
                                {showPendingBadge && (
                                  <Badge variant="default" data-testid={`allocation-status-pending-${allocation.id}`}>
                                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.pending', 'Pending')}
                                  </Badge>
                                )}
                                {isRetired && !allocation.endDate && (
                                  <Badge variant="default" data-testid={`allocation-status-ended-${allocation.id}`}>
                                    {t('ended-asset-retired')}
                                  </Badge>
                                )}
                              </div>

                              <p
                                className="gba:text-xs gba:text-muted-foreground"
                                data-testid={`allocation-dates-${allocation.id}`}
                              >
                                {formatDate(allocation.startDate) || allocation.startDate}
                                {' → '}
                                {endLabel}
                              </p>

                              {allocation.startAssetCondition && (
                                <p
                                  className="gba:text-xs gba:text-muted-foreground gba:mt-1"
                                  data-testid={`allocation-condition-start-${allocation.id}`}
                                >
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:hr_assets.condition_at_handover',
                                    'Condition at handover'
                                  )}
                                  :{' '}
                                  {getConditionDisplayValue(
                                    allocation.startAssetConditionRef,
                                    allocation.startAssetCondition.value
                                  )}
                                </p>
                              )}

                              {allocation.endDate && allocation.endAssetCondition && (
                                <p
                                  className="gba:text-xs gba:text-muted-foreground"
                                  data-testid={`allocation-condition-end-${allocation.id}`}
                                >
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:hr_assets.condition_at_return',
                                    'Condition at return'
                                  )}
                                  :{' '}
                                  {getConditionDisplayValue(
                                    allocation.endAssetConditionRef,
                                    allocation.endAssetCondition.value
                                  )}
                                </p>
                              )}

                              {isRetired && index === 0 && (
                                <p
                                  className="gba:text-xs gba:text-muted-foreground gba:mt-1"
                                  data-testid="asset-retired-at-by"
                                >
                                  {t('retired-at-by', {
                                    disposalDate:
                                      asset.disposalDate != null && asset.disposalDate !== ''
                                        ? formatDate(asset.disposalDate) || asset.disposalDate
                                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A'),
                                    responsiblePerson: getResponsiblePersonDisplay()
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
