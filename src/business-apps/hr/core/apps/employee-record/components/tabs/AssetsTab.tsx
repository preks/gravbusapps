import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { Employee } from '../../hooks/useEmployeeData'
import { useEmployeeAssets } from '../../hooks/useEmployeeAssets'
import {
  useAssetConditionCatalog,
  AssetConditionOption
} from '../../../../forms/equipment-registration/hooks/useAssetConditionCatalog'
import { AssetStatus } from '../../../../apps/assets/types'
import { PiPackage, PiCalendar, PiWarning } from 'react-icons/pi'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'

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
      // Use the value field from the catalog query
      lookup.set(option.id, option.value)
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
        status: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_handed_over', 'Handed Over'),
        variant: 'success'
      }
    }

    if (asset.asset.assetStatus === AssetStatus.ALLOCATED && startDate.isSameOrBefore(today)) {
      return {
        status: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_in_use', 'In Use'),
        variant: 'info'
      }
    }

    return {
      status: formatAssetStatus(asset.asset.assetStatus),
      variant: getAssetStatusBadgeVariant(asset.asset.assetStatus)
    }
  }

  const getConditionDisplayValue = (conditionRef?: string, conditionValue?: string): string => {
    if (!conditionRef && !conditionValue)
      return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
    if (conditionRef && conditionLookup.has(conditionRef)) {
      return conditionLookup.get(conditionRef)!
    }
    return conditionValue || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')
  }

  const getConditionBadgeVariant = (
    conditionRef?: string
  ): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
    if (!conditionRef) return 'default'

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
              <div className="gba:font-semibold gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.error_loading_assets', 'Error Loading Assets')}
              </div>
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
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.no_assets_assigned', 'No Assets Assigned')}
              </h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                {isSelfView
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_assets.no_equipment_assigned_self',
                      "You don't have any equipment assigned to you at the moment."
                    )
                  : getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_assets.no_equipment_assigned_employee',
                      "This employee doesn't have any equipment assigned at the moment."
                    )}
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
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assigned_equipment', 'Assigned Equipment')}
            </CardTitle>
            <Button onClick={handleRequestNewAsset} data-testid="request-new-asset-button">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.request_new_asset', 'Request New Asset')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:gap-6 gba:text-sm">
            <div>
              <div className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.total_assets', 'Total Assets')}
              </div>
              <div className="gba:text-2xl gba:font-semibold gba:text-foreground">{assets.length}</div>
            </div>
            <div>
              <div className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.in_use', 'In Use')}
              </div>
              <div className="gba:text-2xl gba:font-semibold gba:text-success">
                {assets.filter(a => isCurrentlyInUse(a)).length}
              </div>
            </div>
            <div>
              <div className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.handed_over', 'Handed Over')}
              </div>
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
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.asset_assignment_history',
              'Asset Assignment History'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category')}</TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.brand_model', 'Brand & Model')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assignment_period', 'Assignment Period')}
                </TableHead>
                <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.condition', 'Condition')}</TableHead>
                <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => (
                <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`}>
                  <TableCell>
                    <div className="gba:font-medium gba:text-foreground">
                      {asset.asset.assetCategory
                        ? getCatalogValue(asset.asset.assetCategory)
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:space-y-1">
                      <div className="gba:font-medium gba:text-foreground">
                        {asset.asset.assetBrand
                          ? getCatalogValue(asset.asset.assetBrand)
                          : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.unknown', 'Unknown')}
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
                        <span className="gba:text-foreground">{formatDate(asset.startDate) || asset.startDate}</span>
                      </div>
                      {asset.endDate ? (
                        <div className="gba:text-sm gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.to', 'to')}{' '}
                          {formatDate(asset.endDate) || asset.endDate}
                        </div>
                      ) : asset.expectedEndDate ? (
                        <div className="gba:text-sm gba:text-warning">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.expected', 'Expected')}:{' '}
                          {formatDate(asset.expectedEndDate) || asset.expectedEndDate}
                        </div>
                      ) : (
                        <div className="gba:text-sm gba:text-success">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.currently_active', 'Currently Active')}
                        </div>
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
                            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.start', 'Start')}:{' '}
                            {getConditionDisplayValue(asset.startAssetConditionRef, asset.startAssetCondition?.value)}
                          </Badge>
                        </div>
                      )}
                      {asset.endAssetConditionRef && (
                        <div className="gba:text-sm">
                          <Badge variant={getConditionBadgeVariant(asset.endAssetConditionRef)} className="gba:text-xs">
                            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.end', 'End')}:{' '}
                            {getConditionDisplayValue(asset.endAssetConditionRef, asset.endAssetCondition?.value)}
                          </Badge>
                        </div>
                      )}
                      {!asset.startAssetConditionRef && !asset.endAssetConditionRef && (
                        <span className="gba:text-sm gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                        </span>
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
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assignment_notes', 'Assignment Notes')}
            </CardTitle>
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
                    {asset.asset.assetBrand
                      ? getCatalogValue(asset.asset.assetBrand)
                      : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.unknown', 'Unknown')}{' '}
                    {asset.asset.model}
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
