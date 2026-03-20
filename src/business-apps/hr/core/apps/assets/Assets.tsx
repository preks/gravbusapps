import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, Dialog, DialogContent, DialogTitle, Button } from '@newwork/nw-design-system'
import { DesktopIcon, PlusIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { useAssets } from './hooks/useAssets'
import { useAssetDialogs } from './hooks/useAssetDialogs'
import { useEmployeeFilterBackendSearch } from './hooks/useEmployeeFilterBackendSearch'
import { useAssetProcessEvents } from './hooks/useAssetProcessEvents'
import { useSiteLocationsForFilter } from './hooks/useSiteLocationsForFilter'
import { AssetStatistics } from './components/AssetStatistics'
import { AssetTable } from './components/AssetTable'
import { AssetTableFilters } from './components/AssetTableFilters'
import { AssetDetailPanel } from './components/AssetDetailPanel'
import { EquipmentRegistration } from '../../forms/equipment-registration/EquipmentRegistration'
import { AllocateAsset } from '../../forms/allocate-asset/AllocateAsset'
import { ReturnAsset } from '../../forms/return-asset/ReturnAsset'
import { RetireAsset } from '../../forms/retire-asset/RetireAsset'
import { Asset, AssetStatus } from './types'
import { useAssetService } from './services/useAssetService'
import { useAssetsCatalog } from '../../forms/equipment-registration/hooks/useAssetsCatalog'
import { DataFilter, DataFilterGroup } from '@/components/data-filter/DataFilter'
import { formatStatus } from './components/AssetTableUtils'
import { generateAssetDocumentPdf } from './utils/assetDocumentPdf'
import {
  ACQUISITION_FROM_PREFIX,
  ACQUISITION_TO_PREFIX,
  DISPOSAL_FROM_PREFIX,
  DISPOSAL_TO_PREFIX,
  ACQUISITION_RANGE_PILL_ID,
  DISPOSAL_RANGE_PILL_ID,
  isAssetDateFilterPillId,
  pickDateFilter,
  replaceDateRangeFilters
} from './utils/assetFilterDateIds'
import { AssetDateRangeFilter } from './components/AssetDateRangeFilter'

const moduleColor = MODULE_COLORS.HR

export const Assets: React.FC<BusinessAppContextProps> = props => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([])
  const [employeeFilterSearch, setEmployeeFilterSearch] = useState('')
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [showDataFilter, setShowDataFilter] = useState(false)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()
    const interval = setInterval(checkLocale, 500)
    return () => clearInterval(interval)
  }, [currentLocale])

  const dialogs = useAssetDialogs()

  const { options: categoryOptions } = useAssetsCatalog(props)
  const { locations: locationOptions } = useSiteLocationsForFilter(props.accessToken)
  const { backendSearch: employeeBackendSearch, getEmployeeLabel } = useEmployeeFilterBackendSearch(
    props.accessToken ?? '',
    selectedFilterIds,
    employeeFilterSearch
  )

  const categoryFilter = useMemo(
    () => selectedFilterIds.filter(id => id.startsWith('category:')).map(id => id.slice('category:'.length)),
    [selectedFilterIds]
  )
  const locationFilter = useMemo(
    () => selectedFilterIds.filter(id => id.startsWith('location:')).map(id => id.slice('location:'.length)),
    [selectedFilterIds]
  )
  const statusFilter = useMemo(
    () => selectedFilterIds.filter(id => id.startsWith('status:')).map(id => id.slice('status:'.length)),
    [selectedFilterIds]
  )
  const employeeFilter = useMemo(
    () => selectedFilterIds.filter(id => id.startsWith('employee:')).map(id => id.slice('employee:'.length)),
    [selectedFilterIds]
  )
  const acquisitionDateFrom = useMemo(
    () => pickDateFilter(selectedFilterIds, ACQUISITION_FROM_PREFIX) || undefined,
    [selectedFilterIds]
  )
  const acquisitionDateTo = useMemo(
    () => pickDateFilter(selectedFilterIds, ACQUISITION_TO_PREFIX) || undefined,
    [selectedFilterIds]
  )
  const disposalDateFrom = useMemo(
    () => pickDateFilter(selectedFilterIds, DISPOSAL_FROM_PREFIX) || undefined,
    [selectedFilterIds]
  )
  const disposalDateTo = useMemo(
    () => pickDateFilter(selectedFilterIds, DISPOSAL_TO_PREFIX) || undefined,
    [selectedFilterIds]
  )
  const acquisitionRangeValue = useMemo((): [string | null, string | null] | null => {
    const from = pickDateFilter(selectedFilterIds, ACQUISITION_FROM_PREFIX)
    const to = pickDateFilter(selectedFilterIds, ACQUISITION_TO_PREFIX)
    if (!from && !to) return null
    return [from || null, to || null]
  }, [selectedFilterIds])
  const disposalRangeValue = useMemo((): [string | null, string | null] | null => {
    const from = pickDateFilter(selectedFilterIds, DISPOSAL_FROM_PREFIX)
    const to = pickDateFilter(selectedFilterIds, DISPOSAL_TO_PREFIX)
    if (!from && !to) return null
    return [from || null, to || null]
  }, [selectedFilterIds])

  /** Pills shown above the table (one chip per acquisition/disposal range when both dates set). */
  const filterPillIds = useMemo(() => {
    const af = pickDateFilter(selectedFilterIds, ACQUISITION_FROM_PREFIX)
    const at = pickDateFilter(selectedFilterIds, ACQUISITION_TO_PREFIX)
    const df = pickDateFilter(selectedFilterIds, DISPOSAL_FROM_PREFIX)
    const dt = pickDateFilter(selectedFilterIds, DISPOSAL_TO_PREFIX)

    const withoutDate = selectedFilterIds.filter(id => !isAssetDateFilterPillId(id))
    const out = [...withoutDate]

    if (af && at) {
      out.push(ACQUISITION_RANGE_PILL_ID)
    } else {
      if (af) out.push(`${ACQUISITION_FROM_PREFIX}${af}`)
      if (at) out.push(`${ACQUISITION_TO_PREFIX}${at}`)
    }

    if (df && dt) {
      out.push(DISPOSAL_RANGE_PILL_ID)
    } else {
      if (df) out.push(`${DISPOSAL_FROM_PREFIX}${df}`)
      if (dt) out.push(`${DISPOSAL_TO_PREFIX}${dt}`)
    }

    return out
  }, [selectedFilterIds])

  const activeStatusFilter = useMemo(() => {
    const statusIds = statusFilter
    if (statusIds.length === 0) return 'all'
    if (statusIds.length === 1) return statusIds[0]
    return 'all'
  }, [statusFilter])

  const assetsOptions = useMemo(
    () => ({
      page: currentPage,
      pageSize,
      search: searchQuery,
      statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
      categoryFilter: categoryFilter.length > 0 ? categoryFilter : undefined,
      locationFilter: locationFilter.length > 0 ? locationFilter : undefined,
      employeeFilter: employeeFilter.length > 0 ? employeeFilter : undefined,
      acquisitionDateFrom,
      acquisitionDateTo,
      disposalDateFrom,
      disposalDateTo,
      sortField: sortField || undefined,
      sortOrder: sortField ? sortOrder : undefined
    }),
    [
      currentPage,
      pageSize,
      searchQuery,
      statusFilter,
      categoryFilter,
      locationFilter,
      employeeFilter,
      acquisitionDateFrom,
      acquisitionDateTo,
      disposalDateFrom,
      disposalDateTo,
      sortField,
      sortOrder
    ]
  )

  const {
    assets,
    totalCount,
    isLoading: assetsLoading,
    statistics,
    statisticsLoading,
    statisticsError,
    refetch: refetchAssets,
    refetchStatistics
  } = useAssets(props, assetsOptions)

  const memoizedStatistics = useMemo(
    () => statistics,
    [
      statistics.totalAssets,
      statistics.allocatedAssets,
      statistics.availableAssets,
      statistics.underRepairAssets,
      statistics.retiredAssets
    ]
  )

  const { getAllocationsForAsset, getAssetById } = useAssetService(props)

  const handleGenerateDocument = useCallback(
    async (assetId: string) => {
      try {
        const asset = assets.find(a => a.id === assetId) ?? (await getAssetById(assetId))
        if (!asset) return
        const allocations = await getAllocationsForAsset(assetId)
        await generateAssetDocumentPdf(asset, allocations)
      } catch (error) {
        console.error('Error generating asset document:', error)
      }
    },
    [assets, getAssetById, getAllocationsForAsset]
  )
  const [selectedAssetAllocations, setSelectedAssetAllocations] = useState<any[]>([])

  const getAssetIdFromUrl = useCallback((): string | null => {
    if (typeof window === 'undefined') {
      return null
    }

    const params = new URLSearchParams(window.location.search)
    const assetId = params.get('assetId')
    return assetId && assetId.trim() ? assetId : null
  }, [])

  const updateAssetIdInUrl = useCallback((assetId: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (assetId) {
      params.set('assetId', assetId)
    } else {
      params.delete('assetId')
    }

    const search = params.toString()
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash || ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [])

  useEffect(() => {
    const assetId = getAssetIdFromUrl()
    if (assetId) {
      setPendingAssetId(assetId)
    }
  }, [getAssetIdFromUrl])

  useEffect(() => {
    if (!selectedAsset) {
      setSelectedAssetAllocations([])
      return
    }

    const loadAllocations = async () => {
      try {
        const allocations = await getAllocationsForAsset(selectedAsset.id)
        setSelectedAssetAllocations(allocations)
      } catch (error) {
        console.error('Error loading allocations:', error)
        setSelectedAssetAllocations([])
      }
    }

    loadAllocations()
  }, [selectedAsset, getAllocationsForAsset])

  useEffect(() => {
    if (!pendingAssetId) {
      return
    }

    const existing = assets.find(asset => asset.id === pendingAssetId)
    if (existing) {
      setSelectedAsset(existing)
      setIsPanelOpen(true)
      setPendingAssetId(null)
      return
    }

    if (assetsLoading) {
      return
    }

    let isActive = true

    const loadAssetFromUrl = async () => {
      try {
        const asset = await getAssetById(pendingAssetId)
        if (!isActive) {
          return
        }
        if (asset) {
          setSelectedAsset(asset)
          setIsPanelOpen(true)
        }
      } catch (error) {
        console.error('Error loading asset from URL:', error)
      } finally {
        if (isActive) {
          setPendingAssetId(null)
        }
      }
    }

    loadAssetFromUrl()
    return () => {
      isActive = false
    }
  }, [pendingAssetId, assets, assetsLoading, getAssetById])

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsPanelOpen(true)
  }

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false)
    setTimeout(() => setSelectedAsset(null), 300)
  }, [])

  useEffect(() => {
    if (pendingAssetId) {
      return
    }

    if (isPanelOpen && selectedAsset?.id) {
      updateAssetIdInUrl(selectedAsset.id)
      return
    }

    if (!isPanelOpen) {
      updateAssetIdInUrl(null)
    }
  }, [isPanelOpen, selectedAsset?.id, pendingAssetId, updateAssetIdInUrl])

  useEffect(() => {
    const handlePopState = () => {
      const assetId = getAssetIdFromUrl()
      if (assetId) {
        setPendingAssetId(assetId)
      } else {
        handlePanelClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getAssetIdFromUrl, handlePanelClose])

  const handleStatusFilterChange = useCallback((status: string) => {
    setSelectedFilterIds(prev => {
      const withoutStatus = prev.filter(id => !id.startsWith('status:'))
      if (status === 'all') return withoutStatus
      return [...withoutStatus, `status:${status}`]
    })
    setCurrentPage(1)
  }, [])

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilterIds(prev => (selected ? [...prev, filterId] : prev.filter(id => id !== filterId)))
    setCurrentPage(1)
  }, [])

  const handleAcquisitionRangeChange = useCallback((value: string | [string | null, string | null] | null) => {
    setSelectedFilterIds(prev => {
      if (value && typeof value === 'string') return prev
      if (!value || !Array.isArray(value)) {
        return replaceDateRangeFilters(prev, ACQUISITION_FROM_PREFIX, ACQUISITION_TO_PREFIX, '', '')
      }
      const [from, to] = value
      return replaceDateRangeFilters(prev, ACQUISITION_FROM_PREFIX, ACQUISITION_TO_PREFIX, from ?? '', to ?? '')
    })
    setCurrentPage(1)
  }, [])

  const handleDisposalRangeChange = useCallback((value: string | [string | null, string | null] | null) => {
    setSelectedFilterIds(prev => {
      if (value && typeof value === 'string') return prev
      if (!value || !Array.isArray(value)) {
        return replaceDateRangeFilters(prev, DISPOSAL_FROM_PREFIX, DISPOSAL_TO_PREFIX, '', '')
      }
      const [from, to] = value
      return replaceDateRangeFilters(prev, DISPOSAL_FROM_PREFIX, DISPOSAL_TO_PREFIX, from ?? '', to ?? '')
    })
    setCurrentPage(1)
  }, [])

  const handleSetFilterPills = useCallback((newPillIds: string[]) => {
    setSelectedFilterIds(prev => {
      const paf = pickDateFilter(prev, ACQUISITION_FROM_PREFIX)
      const pat = pickDateFilter(prev, ACQUISITION_TO_PREFIX)
      const pdf = pickDateFilter(prev, DISPOSAL_FROM_PREFIX)
      const pdt = pickDateFilter(prev, DISPOSAL_TO_PREFIX)

      const base = newPillIds.filter(id => !isAssetDateFilterPillId(id))
      const merged = [...base]

      if (newPillIds.includes(ACQUISITION_RANGE_PILL_ID)) {
        if (paf) merged.push(`${ACQUISITION_FROM_PREFIX}${paf}`)
        if (pat) merged.push(`${ACQUISITION_TO_PREFIX}${pat}`)
      } else {
        newPillIds.forEach(id => {
          if (id.startsWith(ACQUISITION_FROM_PREFIX) || id.startsWith(ACQUISITION_TO_PREFIX)) {
            merged.push(id)
          }
        })
      }

      if (newPillIds.includes(DISPOSAL_RANGE_PILL_ID)) {
        if (pdf) merged.push(`${DISPOSAL_FROM_PREFIX}${pdf}`)
        if (pdt) merged.push(`${DISPOSAL_TO_PREFIX}${pdt}`)
      } else {
        newPillIds.forEach(id => {
          if (id.startsWith(DISPOSAL_FROM_PREFIX) || id.startsWith(DISPOSAL_TO_PREFIX)) {
            merged.push(id)
          }
        })
      }

      return merged
    })
    setCurrentPage(1)
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search)
    setCurrentPage(1)
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    if (order === '') {
      // Clear sorting - reset to default
      setSortField('')
      setSortOrder('DESC')
    } else {
      setSortField(field)
      setSortOrder(order)
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when page size changes
  }, [])

  const handleUpdateAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) {
        setSelectedAsset(asset)
        dialogs.openRegister(assetId)
      }
    },
    [assets, dialogs]
  )

  const handleAllocateAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) setSelectedAsset(asset)
      dialogs.openAllocate(assetId)
    },
    [assets, dialogs]
  )

  const handleRetrieveAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) setSelectedAsset(asset)
      dialogs.openReturn(assetId)
    },
    [assets, dialogs]
  )

  const handleRetireAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) setSelectedAsset(asset)
      dialogs.openRetire(assetId)
    },
    [assets, dialogs]
  )

  useAssetProcessEvents({
    onAssetProcessComplete: () => {
      dialogs.closeRegister()
      setSelectedAsset(null)
      refetchAssets()
    },
    onAllocationProcessComplete: () => {
      dialogs.closeAllocate()
      refetchAssets()
    },
    onReturnProcessComplete: () => {
      dialogs.closeReturn()
      refetchAssets()
    },
    onRetireProcessComplete: () => {
      dialogs.closeRetire()
      refetchAssets()
    },
    onUpdateAsset: handleUpdateAsset,
    onAllocateAsset: handleAllocateAsset,
    onCloseDialogs: dialogs.closeAll
  })

  const allocateDialogTitle = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset', 'Allocate Asset'),
    [currentLocale]
  )

  const registerDialogTitle = useMemo(
    () =>
      dialogs.editingAssetId
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_equipment', 'Update Equipment')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment', 'Register Equipment'),
    [currentLocale, dialogs.editingAssetId]
  )

  const returnDialogTitle = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.return_asset_form', 'Return Asset'),
    [currentLocale]
  )

  const retireDialogTitle = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retire_asset', 'Retire Asset'),
    [currentLocale]
  )

  const equipmentRegistrationAdditionalData = useMemo(
    () => ({
      ...props.additionalData,
      assetId: dialogs.editingAssetId || undefined,
      asset: selectedAsset || undefined,
      version: selectedAsset?.version,
      onSuccess: () => {
        dialogs.closeRegister()
        setSelectedAsset(null)
        refetchAssets()
      }
    }),
    [props.additionalData, dialogs.editingAssetId, selectedAsset, refetchAssets, dialogs]
  )

  const filterGroups: DataFilterGroup[] = useMemo(
    () => [
      {
        id: 'employee',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.employee', 'Employee'),
        backendSearch: employeeBackendSearch,
        emptyMessage: getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.type_to_search_employee',
          'Type to search for an employee'
        )
      },
      {
        id: 'category',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category'),
        filters: categoryOptions.map(opt => ({
          id: `category:${opt.value}`,
          label: opt.label,
          selected: selectedFilterIds.includes(`category:${opt.value}`)
        }))
      },
      {
        id: 'location',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location'),
        filters: locationOptions.map(loc => ({
          id: `location:${loc.id}`,
          label: loc.name,
          selected: selectedFilterIds.includes(`location:${loc.id}`)
        }))
      },
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status'),
        filters: Object.values(AssetStatus).map(s => ({
          id: `status:${s}`,
          label: formatStatus(s),
          selected: selectedFilterIds.includes(`status:${s}`)
        }))
      },
      {
        id: 'acquisition-date',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.acquisition_date', 'Acquisition Date'),
        hideSearch: true,
        customComponent: (
          <AssetDateRangeFilter
            value={acquisitionRangeValue}
            onRangeChange={handleAcquisitionRangeChange}
            placeholderStart={getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.date_range_start_placeholder',
              'dd/mm/yyyy'
            )}
            placeholderEnd={getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.date_range_end_placeholder',
              'dd/mm/yyyy'
            )}
            testIdPrefix="assets-filter-acquisition-date"
          />
        )
      },
      {
        id: 'disposal-date',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.disposal_date', 'Disposal date'),
        hideSearch: true,
        customComponent: (
          <AssetDateRangeFilter
            value={disposalRangeValue}
            onRangeChange={handleDisposalRangeChange}
            placeholderStart={getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.date_range_start_placeholder',
              'dd/mm/yyyy'
            )}
            placeholderEnd={getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.date_range_end_placeholder',
              'dd/mm/yyyy'
            )}
            testIdPrefix="assets-filter-disposal-date"
          />
        )
      }
    ],
    [
      categoryOptions,
      locationOptions,
      selectedFilterIds,
      employeeBackendSearch,
      currentLocale,
      acquisitionRangeValue,
      disposalRangeValue,
      handleAcquisitionRangeChange,
      handleDisposalRangeChange
    ]
  )

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    categoryOptions.forEach(opt => {
      map[`category:${opt.value}`] = opt.label
    })
    locationOptions.forEach(loc => {
      map[`location:${loc.id}`] = loc.name
    })
    Object.values(AssetStatus).forEach(s => {
      map[`status:${s}`] = formatStatus(s)
    })
    selectedFilterIds
      .filter(id => id.startsWith('employee:'))
      .forEach(id => {
        const employeeId = id.slice('employee:'.length)
        map[id] = getEmployeeLabel(employeeId) ?? employeeId
      })
    const acquisitionTitle = getTranslationFromI18nKeyAndLabel(
      'lowcoder:hr_assets.acquisition_date',
      'Acquisition Date'
    )
    const disposalTitle = getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.disposal_date', 'Disposal date')
    const af = pickDateFilter(selectedFilterIds, ACQUISITION_FROM_PREFIX)
    const at = pickDateFilter(selectedFilterIds, ACQUISITION_TO_PREFIX)
    const df = pickDateFilter(selectedFilterIds, DISPOSAL_FROM_PREFIX)
    const dt = pickDateFilter(selectedFilterIds, DISPOSAL_TO_PREFIX)

    if (af && at) {
      const d1 = formatDate(af, 'date.short') ?? af
      const d2 = formatDate(at, 'date.short') ?? at
      map[ACQUISITION_RANGE_PILL_ID] = `${acquisitionTitle}: ${d1} - ${d2}`
    } else {
      if (af) {
        map[`${ACQUISITION_FROM_PREFIX}${af}`] = `${acquisitionTitle}: ${formatDate(af, 'date.short') ?? af} -`
      }
      if (at) {
        map[`${ACQUISITION_TO_PREFIX}${at}`] = `${acquisitionTitle}: - ${formatDate(at, 'date.short') ?? at}`
      }
    }

    if (df && dt) {
      const d1 = formatDate(df, 'date.short') ?? df
      const d2 = formatDate(dt, 'date.short') ?? dt
      map[DISPOSAL_RANGE_PILL_ID] = `${disposalTitle}: ${d1} - ${d2}`
    } else {
      if (df) {
        map[`${DISPOSAL_FROM_PREFIX}${df}`] = `${disposalTitle}: ${formatDate(df, 'date.short') ?? df} -`
      }
      if (dt) {
        map[`${DISPOSAL_TO_PREFIX}${dt}`] = `${disposalTitle}: - ${formatDate(dt, 'date.short') ?? dt}`
      }
    }
    return map
  }, [categoryOptions, locationOptions, selectedFilterIds, getEmployeeLabel, currentLocale])

  return (
    <div data-testid="assets-app">
      <PageLayout
        headerIcon={DesktopIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.asset_management', 'Asset Management')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.asset_management_description',
          'Manage IT equipment inventory and allocations'
        )}
        className="gba:min-h-screen"
        variant={moduleColor}
      >
        <div className="gba:flex gba:flex-col gba:h-full gba:w-full gba:min-w-0" data-testid="data-container">
          <div className="gba:min-h-[400px] gba:overflow-auto gba:bg-white" data-testid="data-container-body">
            <div className="gba:p-4 gba:space-y-6">
              <AssetStatistics
                statistics={memoizedStatistics}
                isLoading={statisticsLoading}
                error={statisticsError}
                onRetry={refetchStatistics}
                onStatusFilterChange={handleStatusFilterChange}
                activeStatusFilter={activeStatusFilter}
              />

              <div className="gba:flex gba:flex-row gba:gap-4 gba:items-start">
                {showDataFilter && (
                  <div
                    className="gba:flex gba:flex-col gba:w-[336px] gba:shrink-0 gba:border-r gba:border-gray-100 gba:bg-white gba:pr-4"
                    data-testid="assets-filter-sidebar"
                  >
                    <DataFilter
                      show={true}
                      onClose={() => setShowDataFilter(false)}
                      filterGroups={filterGroups}
                      onFilterChange={handleFilterChange}
                      onGroupSearchChange={(groupId, value) => {
                        if (groupId === 'employee') setEmployeeFilterSearch(value)
                      }}
                    />
                  </div>
                )}
                <div className="gba:flex-1 gba:min-w-0 gba:space-y-4">
                  <div
                    className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-4 gba:flex-wrap"
                    data-testid="assets-table-section-header"
                  >
                    <div className="gba:flex gba:flex-row gba:items-center gba:gap-4 gba:min-w-0 gba:flex-1">
                      <AssetTableFilters
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        onPageChange={setCurrentPage}
                        showDataFilter={showDataFilter}
                        onToggleDataFilter={() => setShowDataFilter(prev => !prev)}
                      />
                      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:shrink-0">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_assets', 'All Assets')}{' '}
                        <span className="gba:font-semibold gba:text-muted-foreground" data-testid="assets-total-count">
                          {totalCount}
                        </span>
                      </h3>
                    </div>
                    <Button
                      onClick={() => dialogs.openRegister()}
                      data-testid="register-equipment-button"
                      className="gba:gap-2 gba:shrink-0"
                    >
                      <PlusIcon size={20} />
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment', 'Register Equipment')}
                    </Button>
                  </div>
                  <AssetTable
                    {...props}
                    assets={assets}
                    totalCount={totalCount}
                    isLoading={assetsLoading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    searchQuery={searchQuery}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={handlePageSizeChange}
                    onSearchChange={handleSearchChange}
                    onSortChange={handleSortChange}
                    onAssetClick={handleAssetClick}
                    onAllocateAsset={handleAllocateAsset}
                    onUpdateAsset={handleUpdateAsset}
                    onRetireAsset={handleRetireAsset}
                    onRetrieveAsset={handleRetrieveAsset}
                    onGenerateDocument={handleGenerateDocument}
                    showDataFilter={showDataFilter}
                    onToggleDataFilter={() => setShowDataFilter(prev => !prev)}
                    filter={filterPillIds}
                    setFilter={handleSetFilterPills}
                    filterLabelMap={filterLabelMap}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
      <AssetDetailPanel
        asset={selectedAsset}
        allocations={selectedAssetAllocations}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        accessToken={props.accessToken}
        onAllocateAsset={handleAllocateAsset}
        onUpdateAsset={handleUpdateAsset}
        onRetireAsset={handleRetireAsset}
        onRetrieveAsset={handleRetrieveAsset}
        onGenerateDocument={handleGenerateDocument}
      />

      <Dialog open={dialogs.isRegisterOpen} onOpenChange={dialogs.closeRegister}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{registerDialogTitle}</DialogTitle>
          {dialogs.isRegisterOpen && (
            <EquipmentRegistration
              {...props}
              key={`equipment-registration-${dialogs.editingAssetId || 'new'}-${currentLocale}`}
              additionalData={equipmentRegistrationAdditionalData}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.isAllocateOpen} onOpenChange={dialogs.closeAllocate}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{allocateDialogTitle}</DialogTitle>
          <AllocateAsset
            key={`allocate-asset-${dialogs.allocatingAssetId ?? ''}-${currentLocale}`}
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: dialogs.allocatingAssetId || undefined,
              asset: selectedAsset || undefined
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.isReturnOpen} onOpenChange={dialogs.closeReturn}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{returnDialogTitle}</DialogTitle>
          <ReturnAsset
            key={`return-asset-${currentLocale}`}
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: dialogs.returningAssetId || undefined,
              asset: selectedAsset || undefined
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.isRetireOpen} onOpenChange={dialogs.closeRetire}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{retireDialogTitle}</DialogTitle>
          {dialogs.isRetireOpen && (
            <RetireAsset
              key={`retire-asset-${dialogs.retiringAssetId ?? ''}-${currentLocale}`}
              {...props}
              additionalData={{
                ...props.additionalData,
                assetId: dialogs.retiringAssetId || undefined,
                asset: selectedAsset || undefined
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Assets
