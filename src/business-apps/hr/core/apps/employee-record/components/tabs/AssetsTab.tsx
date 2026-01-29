import React, { useMemo, useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Table,
  TableBody,
  TableCell,
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
import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { SortableTableHead } from '../../../../apps/assets/components/SortableTableHead'
import { AssetTablePagination } from '../../../../apps/assets/components/AssetTablePagination'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

interface AssetsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  isSelfView: boolean
}

type EmployeeAsset = ReturnType<typeof useEmployeeAssets>['assets'][0]

const getTableColumns = () => [
  { field: 'category', labelKey: 'assets-category' },
  { field: 'brand', labelKey: 'assets-brand-model' },
  { field: 'serialNumber', labelKey: 'assets-serial-number' },
  { field: 'startDate', labelKey: 'assets-assignment-period' },
  { field: 'condition', labelKey: 'assets-condition' },
  { field: 'status', labelKey: 'assets-status' }
]

const getStatsConfig = () => [
  { labelKey: 'assets-total-assets', className: 'gba:text-foreground' },
  { labelKey: 'assets-in-use', className: 'gba:text-success' },
  { labelKey: 'assets-status-in-repair', className: 'gba:text-warning' },
  { labelKey: 'assets-handed-over', className: 'gba:text-muted-foreground' }
]

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'info'> = {
  [AssetStatus.AVAILABLE]: 'success',
  [AssetStatus.ALLOCATED]: 'info',
  [AssetStatus.UNDER_REPAIR]: 'warning',
  [AssetStatus.RETIRED]: 'destructive'
}

const AssetsTab: React.FC<AssetsTabProps> = ({ employee, accessToken, employeeId, isSelfView }) => {
  const { t } = useTranslation(translations)
  const effectiveEmployeeId = employeeId || employee.id
  const { assets, isLoading, error } = useEmployeeAssets(accessToken, effectiveEmployeeId)
  const [sortField, setSortField] = useState<string>('status')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { options: conditionOptions } = useAssetConditionCatalog({ accessToken })

  const tableColumns = getTableColumns()
  const statsConfig = getStatsConfig()

  const conditionLookup = useMemo(
    () => new Map(conditionOptions.map((opt: AssetConditionOption) => [opt.id, opt.value])),
    [conditionOptions]
  )

  const conditionVariantLookup = useMemo(() => {
    const lookup = new Map<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'>()
    conditionOptions.forEach((option: AssetConditionOption) => {
      const code = option.code?.toUpperCase()
      const id = option.id.toUpperCase()
      if (code === 'NEW' || id.includes(':NEW')) lookup.set(option.id, 'success')
      else if (code === 'LIKE_NEW' || id.includes(':LIKE_NEW')) lookup.set(option.id, 'info')
      else if (code === 'ACCEPTABLE' || id.includes(':ACCEPTABLE')) lookup.set(option.id, 'warning')
      else if (code === 'DEFEATED' || id.includes(':DEFEATED') || code === 'POOR' || id.includes(':POOR'))
        lookup.set(option.id, 'destructive')
      else lookup.set(option.id, 'default')
    })
    return lookup
  }, [conditionOptions])

  const getAssetStatusBadgeVariant = (status: string) => STATUS_VARIANTS[status] || 'default'

  const formatAssetStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      [AssetStatus.AVAILABLE]: t('assets-status-available'),
      [AssetStatus.ALLOCATED]: t('assets-status-allocated'),
      [AssetStatus.UNDER_REPAIR]: t('assets-status-in-repair-label'),
      [AssetStatus.RETIRED]: t('assets-status-retired')
    }
    return (
      statusMap[status] ||
      status
        .replace(/_ASSET$/, '')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
    )
  }

  const getDisplayStatus = (asset: EmployeeAsset) => {
    const today = dayjs().startOf('day')
    const startDate = dayjs(asset.startDate).startOf('day')
    const endDate = asset.endDate ? dayjs(asset.endDate).startOf('day') : null

    if (endDate?.isSameOrBefore(today)) {
      return {
        status: t('assets-status-handed-over'),
        variant: 'success' as const
      }
    }
    if (asset.asset.assetStatus === AssetStatus.ALLOCATED && startDate.isSameOrBefore(today)) {
      return {
        status: t('assets-status-in-use'),
        variant: 'info' as const
      }
    }
    return {
      status: formatAssetStatus(asset.asset.assetStatus),
      variant: getAssetStatusBadgeVariant(asset.asset.assetStatus)
    }
  }

  const getConditionDisplayValue = (conditionRef?: string, conditionValue?: string): string => {
    if (!conditionRef && !conditionValue) return t('assets-not-available')
    return conditionRef && conditionLookup.has(conditionRef)
      ? conditionLookup.get(conditionRef)!
      : conditionValue || t('assets-not-available')
  }

  const getConditionBadgeVariant = (conditionRef?: string) =>
    conditionRef && conditionVariantLookup.has(conditionRef) ? conditionVariantLookup.get(conditionRef)! : 'default'

  const isAssetActive = (asset: EmployeeAsset, status: AssetStatus) => {
    const today = dayjs().startOf('day')
    const startDate = dayjs(asset.startDate).startOf('day')
    const endDate = asset.endDate ? dayjs(asset.endDate).startOf('day') : null
    return !endDate?.isSameOrBefore(today) && asset.asset.assetStatus === status && startDate.isSameOrBefore(today)
  }

  const isCurrentlyInUse = (asset: EmployeeAsset) => isAssetActive(asset, AssetStatus.ALLOCATED)
  const isInRepair = (asset: EmployeeAsset) => isAssetActive(asset, AssetStatus.UNDER_REPAIR)

  const handleSortChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    setSortField(order === '' ? '' : field)
    setSortOrder(order === '' ? 'DESC' : order)
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), [])
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }, [])

  useEffect(() => setCurrentPage(1), [assets.length])

  const compareValues = (a: any, b: any): number => {
    const aStr = String(a).toLowerCase()
    const bStr = String(b).toLowerCase()
    if (aStr < bStr) return sortOrder === 'ASC' ? -1 : 1
    if (aStr > bStr) return sortOrder === 'ASC' ? 1 : -1
    return 0
  }

  const compareCondition = (a: string, b: string) => {
    if (a !== b) {
      if (!a && b) return sortOrder === 'ASC' ? 1 : -1
      if (a && !b) return sortOrder === 'ASC' ? -1 : 1
      return compareValues(a, b)
    }
    return null
  }

  const sortedAssets = useMemo(() => {
    if (!sortField) return assets
    const today = dayjs().startOf('day')
    return [...assets].sort((a, b) => {
      switch (sortField) {
        case 'category':
          return compareValues(
            getCatalogValue(a.asset.assetCategory) || '',
            getCatalogValue(b.asset.assetCategory) || ''
          )
        case 'brand': {
          const aBrand = getCatalogValue(a.asset.assetBrand) || ''
          const bBrand = getCatalogValue(b.asset.assetBrand) || ''
          return aBrand !== bBrand
            ? compareValues(aBrand, bBrand)
            : compareValues(a.asset.model || '', b.asset.model || '')
        }

        case 'serialNumber':
          return compareValues(a.asset.serialNumber || '', b.asset.serialNumber || '')
        case 'startDate':
          return compareValues(dayjs(a.startDate).valueOf(), dayjs(b.startDate).valueOf())
        case 'status': {
          const aEndDate = a.endDate ? dayjs(a.endDate).startOf('day') : null
          const bEndDate = b.endDate ? dayjs(b.endDate).startOf('day') : null
          const aIsHandedOver = !!aEndDate?.isSameOrBefore(today)
          const bIsHandedOver = !!bEndDate?.isSameOrBefore(today)
          const getStatusPriority = (asset: EmployeeAsset, isHandedOver: boolean): number => {
            if (isHandedOver) return 2
            const startDate = dayjs(asset.startDate).startOf('day')
            if (
              (asset.asset.assetStatus === AssetStatus.ALLOCATED ||
                asset.asset.assetStatus === AssetStatus.UNDER_REPAIR) &&
              startDate.isSameOrBefore(today)
            )
              return 1
            return 3
          }
          const aPriority = getStatusPriority(a, aIsHandedOver)
          const bPriority = getStatusPriority(b, bIsHandedOver)
          if (aPriority !== bPriority) return sortOrder === 'ASC' ? aPriority - bPriority : bPriority - aPriority
          return compareValues(getDisplayStatus(a).status, getDisplayStatus(b).status)
        }
        case 'condition': {
          const aStart = getConditionDisplayValue(a.startAssetConditionRef, a.startAssetCondition?.value) || ''
          const bStart = getConditionDisplayValue(b.startAssetConditionRef, b.startAssetCondition?.value) || ''
          const startCompare = compareCondition(aStart, bStart)
          if (startCompare !== null) return startCompare
          const aEnd = getConditionDisplayValue(a.endAssetConditionRef, a.endAssetCondition?.value) || ''
          const bEnd = getConditionDisplayValue(b.endAssetConditionRef, b.endAssetCondition?.value) || ''
          const endCompare = compareCondition(aEnd, bEnd)
          return endCompare !== null ? endCompare : 0
        }
        default:
          return 0
      }
    })
  }, [assets, sortField, sortOrder, conditionLookup])

  const paginatedAssets = useMemo(
    () => sortedAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedAssets, currentPage, pageSize]
  )

  const stats = useMemo(
    () => ({
      total: assets.length,
      inUse: assets.filter(isCurrentlyInUse).length,
      inRepair: assets.filter(isInRepair).length,
      handedOver: assets.filter(a => {
        const today = dayjs().startOf('day')
        const endDate = a.endDate ? dayjs(a.endDate).startOf('day') : null
        return endDate?.isSameOrBefore(today)
      }).length
    }),
    [assets]
  )

  if (isLoading)
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="assets-loading">
        <Spinner size="lg" />
      </div>
    )

  if (error)
    return (
      <Card data-testid="assets-error">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-start gba:gap-3 gba:text-destructive">
            <PiWarning className="gba:h-5 gba:w-5 gba:mt-0.5" />
            <div>
              <div className="gba:font-semibold gba:mb-1">{t('assets-error-loading-assets')}</div>
              <div className="gba:text-sm">{error}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )

  if (assets.length === 0)
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
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('assets-no-assets-assigned')}</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                {isSelfView ? t('assets-no-equipment-assigned-self') : t('assets-no-equipment-assigned-employee')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )

  return (
    <div className="gba:space-y-6" data-testid="assets-tab-content">
      <Card data-testid="assets-summary-card">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiPackage className="gba:h-5 gba:w-5" />
              {t('assets-assigned-equipment')}
            </CardTitle>
            <Button
              onClick={() =>
                navigateTo(
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/platform/sales-demo/service-launcher`
                )
              }
              data-testid="request-new-asset-button"
            >
              {t('assets-request-new-asset')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:gap-6 gba:text-sm">
            {statsConfig.map(({ labelKey, className }, idx) => (
              <div key={labelKey}>
                <div className="gba:text-muted-foreground">{t(labelKey)}</div>
                <div className={`gba:text-2xl gba:font-semibold ${className}`}>
                  {[stats.total, stats.inUse, stats.inRepair, stats.handedOver][idx]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="assets-table-card">
        <CardHeader>
          <CardTitle>{t('assets-asset-assignment-history')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:p-0">
          <div className="gba:border gba:rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableColumns.map(({ field, labelKey }) => (
                    <SortableTableHead
                      key={field}
                      field={field}
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortChange}
                    >
                      {t(labelKey)}
                    </SortableTableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssets.map(asset => {
                  const displayStatus = getDisplayStatus(asset)
                  return (
                    <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`}>
                      <TableCell>
                        <div className="gba:font-medium gba:text-foreground">
                          {asset.asset.assetCategory
                            ? getCatalogValue(asset.asset.assetCategory)
                            : t('assets-not-available')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:space-y-1">
                          <div className="gba:font-medium gba:text-foreground">
                            {asset.asset.assetBrand ? getCatalogValue(asset.asset.assetBrand) : t('assets-unknown')}
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
                            <span className="gba:text-foreground">
                              {formatDate(asset.startDate) || asset.startDate}
                            </span>
                          </div>
                          {asset.endDate ? (
                            <div className="gba:text-sm gba:text-muted-foreground">
                              {t('assets-to')} {formatDate(asset.endDate) || asset.endDate}
                            </div>
                          ) : asset.expectedEndDate ? (
                            <div className="gba:text-sm gba:text-warning">
                              {t('assets-expected')}: {formatDate(asset.expectedEndDate) || asset.expectedEndDate}
                            </div>
                          ) : (
                            <div className="gba:text-sm gba:text-success">{t('assets-currently-active')}</div>
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
                                {t('assets-start')}:{' '}
                                {getConditionDisplayValue(
                                  asset.startAssetConditionRef,
                                  asset.startAssetCondition?.value
                                )}
                              </Badge>
                            </div>
                          )}
                          {asset.endAssetConditionRef && (
                            <div className="gba:text-sm">
                              <Badge
                                variant={getConditionBadgeVariant(asset.endAssetConditionRef)}
                                className="gba:text-xs"
                              >
                                {t('assets-end')}:{' '}
                                {getConditionDisplayValue(asset.endAssetConditionRef, asset.endAssetCondition?.value)}
                              </Badge>
                            </div>
                          )}
                          {!asset.startAssetConditionRef && !asset.endAssetConditionRef && (
                            <span className="gba:text-sm gba:text-muted-foreground">{t('assets-not-available')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={displayStatus.variant}>{displayStatus.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <AssetTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedAssets.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {assets.some(a => a.notes) && (
        <Card data-testid="assets-notes-card">
          <CardHeader>
            <CardTitle>{t('assets-assignment-notes')}</CardTitle>
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
                    {asset.asset.assetBrand ? getCatalogValue(asset.asset.assetBrand) : t('assets-unknown')}{' '}
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
