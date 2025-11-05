/**
 * AssetDetailPanel Component
 * Displays detailed information about a selected asset in a side panel
 */

import React from 'react'
import { Asset, AssetAllocation } from '../types'
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
  Separator
} from '@newwork/nw-design-system'
import { CalendarIcon, MapPinIcon, TagIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface AssetDetailPanelProps {
  asset: Asset | null
  allocations: AssetAllocation[]
  isOpen: boolean
  onClose: () => void
  accessToken: string
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Available':
      return 'success'
    case 'Allocated':
      return 'info'
    case 'Under Repair':
      return 'warning'
    case 'Retired':
      return 'destructive'
    default:
      return 'default'
  }
}

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return dayjs(dateString).format('MMM D, YYYY')
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
  accessToken
}) => {
  if (!asset) return null

  // Calculate warranty expiry date from acquisition date + warranty period
  const acquisitionDate = dayjs(asset.acquisitionDate)
  const warrantyExpiryDate = acquisitionDate.add(asset.warrantyPeriodMonths, 'month')

  const warrantyExpired = isWarrantyExpired(warrantyExpiryDate.toISOString())
  const daysRemaining = getWarrantyDaysRemaining(warrantyExpiryDate.toISOString())
  const sortedAllocations = [...allocations].sort((a, b) => dayjs(b.startDate).diff(dayjs(a.startDate)))

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="gba:w-full sm:gba:max-w-xl gba:overflow-y-auto" data-testid="asset-detail-panel">
        <SheetHeader className="gba:pr-10">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div className="gba:flex-1">
              <SheetTitle data-testid="asset-detail-title">
                {asset.assetBrand?.value || 'Unknown'} {asset.model}
              </SheetTitle>
              <SheetDescription data-testid="asset-detail-category">
                {asset.assetCategory?.value || 'N/A'}
              </SheetDescription>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant={getStatusBadgeVariant(asset.assetStatus)} data-testid="asset-detail-status-badge">
                {asset.assetStatus}
              </Badge>
              <AppActionButton
                data-testid={`asset-actions-button-${asset.id}`}
                size="default"
                contextsArray={[FlowContextName.assetEntity]}
                externalContextData={{ assetId: asset.id }}
                prefixDataTestId={`asset-actions`}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                label="Actions"
              />
            </div>
          </div>
        </SheetHeader>

        <div className="gba:mt-6 gba:space-y-6">
          {/* Asset Information */}
          <Card data-testid="asset-info-card">
            <CardHeader>
              <CardTitle className="gba:text-base">Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:flex gba:items-start gba:gap-3">
                <TagIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">Serial Number</p>
                  <p className="gba:text-sm gba:text-muted-foreground gba:font-mono" data-testid="asset-serial-number">
                    {asset.serialNumber}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="gba:flex gba:items-start gba:gap-3">
                <MapPinIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">Location</p>
                  <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-location">
                    {asset.siteLocation?.name || 'N/A'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="gba:flex gba:items-start gba:gap-3">
                <CurrencyDollarIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">Inventory Value</p>
                  <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-value">
                    {formatCurrency(asset.inventoryValue, asset.currency?.code || 'EUR')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="gba:flex gba:items-start gba:gap-3">
                <CalendarIcon size={20} className="gba:text-muted-foreground gba:mt-0.5" />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">Acquisition Date</p>
                  <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-acquisition-date">
                    {formatDate(asset.acquisitionDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warranty Information */}
          <Card data-testid="asset-warranty-card">
            <CardHeader>
              <CardTitle className="gba:text-base">Warranty</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <p className="gba:text-sm gba:font-medium">Warranty Period</p>
                  <p className="gba:text-sm gba:text-muted-foreground">{asset.warrantyPeriodMonths} months</p>
                </div>
                {warrantyExpired ? (
                  <Badge variant="destructive" data-testid="warranty-status-expired">
                    Expired
                  </Badge>
                ) : daysRemaining < 90 ? (
                  <Badge variant="warning" data-testid="warranty-status-expiring">
                    {Math.ceil(daysRemaining / 30)} mo left
                  </Badge>
                ) : (
                  <Badge variant="success" data-testid="warranty-status-valid">
                    Valid
                  </Badge>
                )}
              </div>

              <Separator />

              <div>
                <p className="gba:text-sm gba:font-medium">Expiry Date</p>
                <p className="gba:text-sm gba:text-muted-foreground" data-testid="warranty-expiry-date">
                  {formatDate(warrantyExpiryDate.toISOString())}
                  {!warrantyExpired && <span className="gba:text-xs gba:ml-2">({warrantyExpiryDate.fromNow()})</span>}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {asset.notes && (
            <Card data-testid="asset-notes-card">
              <CardHeader>
                <CardTitle className="gba:text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="gba:text-sm gba:text-muted-foreground" data-testid="asset-notes">
                  {asset.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Allocation History */}
          <Card data-testid="asset-allocation-history-card">
            <CardHeader>
              <CardTitle className="gba:text-base">Allocation History</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedAllocations.length === 0 ? (
                <p
                  className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4"
                  data-testid="no-allocation-history"
                >
                  No allocation history available
                </p>
              ) : (
                <div className="gba:space-y-4">
                  {sortedAllocations.map((allocation, index) => (
                    <div key={allocation.id} data-testid={`allocation-history-item-${allocation.id}`}>
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <div className="gba:flex gba:flex-col gba:items-center gba:pt-1">
                          <div
                            className={`gba:w-3 gba:h-3 gba:rounded-full ${
                              allocation.endDate ? 'gba:bg-muted' : 'gba:bg-success'
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
                                allocation.employee?.firstName + ' ' + allocation.employee?.lastName ||
                                'Unknown Employee'}
                            </p>
                            {!allocation.endDate && (
                              <Badge variant="success" data-testid={`allocation-status-${allocation.id}`}>
                                Current
                              </Badge>
                            )}
                          </div>

                          <p
                            className="gba:text-xs gba:text-muted-foreground"
                            data-testid={`allocation-dates-${allocation.id}`}
                          >
                            {formatDate(allocation.startDate)}
                            {' → '}
                            {allocation.endDate ? formatDate(allocation.endDate) : 'Present'}
                          </p>

                          {allocation.startAssetCondition && (
                            <p
                              className="gba:text-xs gba:text-muted-foreground gba:mt-1"
                              data-testid={`allocation-condition-start-${allocation.id}`}
                            >
                              Condition at handover: {allocation.startAssetCondition.value}
                            </p>
                          )}

                          {allocation.endDate && allocation.endAssetCondition && (
                            <p
                              className="gba:text-xs gba:text-muted-foreground"
                              data-testid={`allocation-condition-end-${allocation.id}`}
                            >
                              Condition at return: {allocation.endAssetCondition.value}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
