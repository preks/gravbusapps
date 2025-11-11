import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import { Spinner } from '@newwork/nw-design-system'
import { Button } from '@newwork/nw-design-system'
import { Employee } from '../../hooks/useEmployeeData'
import { useEmployeeAssets } from '../../hooks/useEmployeeAssets'
import {
  useAssetConditionCatalog,
  AssetConditionOption
} from '../../../../forms/equipment-registration/hooks/useAssetConditionCatalog'
import { AssetStatus } from '../../../../apps/assets/types'
import { PiPackage, PiCalendar, PiWarning } from 'react-icons/pi'
import { navigateTo } from '@/common/utils/navigationUtils'

interface AssetsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  isSelfView: boolean
}

const AssetsTab: React.FC<AssetsTabProps> = ({ employee, accessToken, employeeId, isSelfView }) => {
  const effectiveEmployeeId = employeeId || employee.id
  const { assets, isLoading, error } = useEmployeeAssets(accessToken, effectiveEmployeeId)

  const { options: conditionOptions } = useAssetConditionCatalog({ accessToken })

  const conditionLookup = useMemo(() => {
    const lookup = new Map<string, string>()
    conditionOptions.forEach((option: AssetConditionOption) => {
      lookup.set(option.id, option.label)
    })
    return lookup
  }, [conditionOptions])

  const conditionVariantLookup = useMemo(() => {
    const lookup = new Map<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'>()
    conditionOptions.forEach((option: AssetConditionOption) => {
      const code = option.code?.toUpperCase()
      const id = option.id.toUpperCase()

      if (code === 'NEW' || id.includes(':NEW')) {
        lookup.set(option.id, 'success')
      } else if (code === 'LIKE_NEW' || id.includes(':LIKE_NEW')) {
        lookup.set(option.id, 'info')
      } else if (code === 'ACCEPTABLE' || id.includes(':ACCEPTABLE')) {
        lookup.set(option.id, 'warning')
      } else if (code === 'DEFEATED' || id.includes(':DEFEATED') || code === 'POOR' || id.includes(':POOR')) {
        lookup.set(option.id, 'destructive')
      } else {
        lookup.set(option.id, 'default')
      }
    })
    return lookup
  }, [conditionOptions])

  const getAssetStatusBadgeVariant = (status: string): 'default' | 'success' | 'destructive' | 'warning' | 'info' => {
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

  const formatAssetStatus = (status: string): string => {
    if (status === AssetStatus.AVAILABLE) {
      return 'Available'
    }
    if (status === AssetStatus.ALLOCATED) {
      return 'Allocated'
    }
    if (status === AssetStatus.UNDER_REPAIR) {
      return 'In Repair'
    }
    if (status === AssetStatus.RETIRED) {
      return 'Retired'
    }
    // Fallback: format by removing _ASSET and replacing underscores with spaces, then capitalize
    return status
      .replace(/_ASSET$/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const getDisplayStatus = (asset: {
    asset: { assetStatus: string }
    startDate: string
    endDate?: string
  }): {
    status: string
    variant: 'default' | 'success' | 'destructive' | 'warning' | 'info'
  } => {
    const today = dayjs().startOf('day')
    const startDate = dayjs(asset.startDate).startOf('day')
    const endDate = asset.endDate ? dayjs(asset.endDate).startOf('day') : null

    if (endDate && endDate.isSameOrBefore(today)) {
      return {
        status: 'Handed Over',
        variant: 'success'
      }
    }

    if (asset.asset.assetStatus === AssetStatus.ALLOCATED && startDate.isSameOrBefore(today)) {
      return {
        status: 'In Use',
        variant: 'info'
      }
    }

    return {
      status: formatAssetStatus(asset.asset.assetStatus),
      variant: getAssetStatusBadgeVariant(asset.asset.assetStatus)
    }
  }

  const getConditionDisplayValue = (conditionRef?: string, conditionValue?: string): string => {
    if (!conditionRef && !conditionValue) return 'N/A'
    if (conditionRef && conditionLookup.has(conditionRef)) {
      return conditionLookup.get(conditionRef)!
    }
    return conditionValue || 'N/A'
  }

  const getConditionBadgeVariant = (
    conditionRef?: string
  ): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
    if (!conditionRef) return 'default'

    // Use the variant lookup map based on condition reference ID
    if (conditionVariantLookup.has(conditionRef)) {
      return conditionVariantLookup.get(conditionRef)!
    }

    return 'default'
  }

  const isCurrentlyInUse = (asset: { asset: { assetStatus: string }; startDate: string; endDate?: string }) => {
    const today = dayjs().startOf('day')
    const startDate = dayjs(asset.startDate).startOf('day')
    const endDate = asset.endDate ? dayjs(asset.endDate).startOf('day') : null

    if (endDate && endDate.isSameOrBefore(today)) {
      return false
    }

    return asset.asset.assetStatus === AssetStatus.ALLOCATED && startDate.isSameOrBefore(today)
  }

  const handleRequestNewAsset = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}/platform/sales-demo/service-launcher`
    navigateTo(url)
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="assets-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card data-testid="assets-error">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-start gba:gap-3 gba:text-destructive">
            <PiWarning className="gba:h-5 gba:w-5 gba:mt-0.5" />
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Assets</div>
              <div className="gba:text-sm">{error}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (assets.length === 0) {
    return (
      <Card data-testid="assets-empty-state">
        <CardContent className="gba:py-12">
          <div className="gba:text-center gba:space-y-4">
            <div className="gba:flex gba:justify-center">
              <div className="gba:rounded-full gba:bg-muted gba:p-4">
                <PiPackage className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
              </div>
            </div>
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">No Assets Assigned</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                {isSelfView
                  ? "You don't have any equipment assigned to you at the moment."
                  : "This employee doesn't have any equipment assigned at the moment."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="assets-tab-content">
      {/* Assets Summary Card */}
      <Card data-testid="assets-summary-card">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiPackage className="gba:h-5 gba:w-5" />
              Assigned Equipment
            </CardTitle>
            <Button onClick={handleRequestNewAsset} data-testid="request-new-asset-button">
              Request New Asset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:gap-6 gba:text-sm">
            <div>
              <div className="gba:text-muted-foreground">Total Assets</div>
              <div className="gba:text-2xl gba:font-semibold gba:text-foreground">{assets.length}</div>
            </div>
            <div>
              <div className="gba:text-muted-foreground">In Use</div>
              <div className="gba:text-2xl gba:font-semibold gba:text-success">
                {assets.filter(a => isCurrentlyInUse(a)).length}
              </div>
            </div>
            <div>
              <div className="gba:text-muted-foreground">Handed Over</div>
              <div className="gba:text-2xl gba:font-semibold gba:text-muted-foreground">
                {
                  assets.filter(a => {
                    const today = dayjs().startOf('day')
                    const endDate = a.endDate ? dayjs(a.endDate).startOf('day') : null
                    return endDate && endDate.isSameOrBefore(today)
                  }).length
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="assets-table-card">
        <CardHeader>
          <CardTitle>Asset Assignment History</CardTitle>
        </CardHeader>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Brand & Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Assignment Period</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => (
                <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`}>
                  <TableCell>
                    <div className="gba:font-medium gba:text-foreground">
                      {asset.asset.assetCategory?.value || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      <div className="gba:font-medium gba:text-foreground">
                        {asset.asset.assetBrand?.value || 'Unknown'}
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground">{asset.asset.model}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="gba:font-mono gba:text-sm gba:text-muted-foreground">
                      {asset.asset.serialNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm">
                        <PiCalendar className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                        <span className="gba:text-foreground">{dayjs(asset.startDate).format('MMM D, YYYY')}</span>
                      </div>
                      {asset.endDate ? (
                        <div className="gba:text-sm gba:text-muted-foreground">
                          to {dayjs(asset.endDate).format('MMM D, YYYY')}
                        </div>
                      ) : asset.expectedEndDate ? (
                        <div className="gba:text-sm gba:text-warning">
                          Expected: {dayjs(asset.expectedEndDate).format('MMM D, YYYY')}
                        </div>
                      ) : (
                        <div className="gba:text-sm gba:text-success">Currently Active</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      {asset.startAssetConditionRef && (
                        <div className="gba:text-sm">
                          <Badge
                            variant={getConditionBadgeVariant(asset.startAssetConditionRef)}
                            className="gba:text-xs"
                          >
                            Start:{' '}
                            {getConditionDisplayValue(asset.startAssetConditionRef, asset.startAssetCondition?.value)}
                          </Badge>
                        </div>
                      )}
                      {asset.endAssetConditionRef && (
                        <div className="gba:text-sm">
                          <Badge variant={getConditionBadgeVariant(asset.endAssetConditionRef)} className="gba:text-xs">
                            End: {getConditionDisplayValue(asset.endAssetConditionRef, asset.endAssetCondition?.value)}
                          </Badge>
                        </div>
                      )}
                      {!asset.startAssetConditionRef && !asset.endAssetConditionRef && (
                        <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const displayStatus = getDisplayStatus(asset)
                      return <Badge variant={displayStatus.variant}>{displayStatus.status}</Badge>
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {assets.some(a => a.notes) && (
        <Card data-testid="assets-notes-card">
          <CardHeader>
            <CardTitle>Assignment Notes</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {assets
              .filter(asset => asset.notes)
              .map(asset => (
                <div
                  key={asset.id}
                  className="gba:border-l-4 gba:border-primary gba:pl-4 gba:py-2"
                  data-testid={`asset-note-${asset.id}`}
                >
                  <div className="gba:font-medium gba:text-sm gba:text-foreground gba:mb-1">
                    {asset.asset.assetBrand?.value} {asset.asset.model}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground">{asset.notes}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AssetsTab
