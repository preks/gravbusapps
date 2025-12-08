import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import {
  Spinner,
  Alert,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  DataDisplay
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import PlannedExitsMetrics from './components/PlannedExitsMetrics'
import PlannedExitsTable from './components/PlannedExitsTable'

export type PlannedExitsProps = BusinessAppContextProps

const PlannedExits: React.FC<PlannedExitsProps> = ({ accessToken, userInfo }) => {
  const [selectedCurrency, setSelectedCurrency] = useState('EUR')
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'plannedExitDate', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'investmentGroup',
    'investmentType',
    'totalInvestmentAmount',
    'investmentMarketValue',
    'performance',
    'plannedExitDate',
    'ownerEmployee',
    'createdAt'
  ])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const initialLoadDone = useRef(false)

  // Build query variables with default filter for planned exits
  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const sortField = sorting.length > 0 ? sorting[0].id : 'plannedExitDate'
    const sortOrder = sorting.length > 0 && sorting[0].desc ? 'DESC' : 'ASC'

    return {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }],
      planedExit: true, // Default filter for planned exits
      ...selectedFilters
    }
  }, [pagination, searchTerm, sorting, selectedFilters])

  // Fetch data using useInvestments hook
  const {
    investments,
    total: totalCount,
    loading: isLoading,
    error,
    refetch
  } = useInvestments(accessToken || '', queryVariables, 'list')

  // Track initial load
  useEffect(() => {
    if (isLoading === false && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [isLoading])

  const isInitialLoading = isLoading && !initialLoadDone.current

  // Fetch available currencies efficiently using distinctOn (full format to get IDs)
  const { currencies: availableCurrencies } = useAvailableCurrencies(
    { accessToken, userInfo },
    {
      filters: { entity: 'Investment' },
      returnFormat: 'full'
    }
  )

  // Set initial currency filter when currencies are loaded
  useEffect(() => {
    if (availableCurrencies && availableCurrencies.length > 0) {
      const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
        (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === selectedCurrency
      )
      if (currencyObj) {
        setSelectedFilters(prev => ({
          ...prev,
          currencyIds: [currencyObj.id]
        }))
      }
    }
  }, [availableCurrencies, selectedCurrency])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    setSorting(newSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  // Column configuration for DataDisplay
  const columnConfig = useMemo(
    () => [
      { id: 'name', label: 'Investment' },
      { id: 'investmentGroup', label: 'Group' },
      { id: 'investmentType', label: 'Type' },
      { id: 'totalInvestmentAmount', label: 'Total Investment' },
      { id: 'investmentMarketValue', label: 'Market Value' },
      { id: 'performance', label: 'Performance' },
      { id: 'plannedExitDate', label: 'Planned Exit Date' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  // Listen for process completion events to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetch()
    }
  })

  // Currency filter for secondaryActions
  const secondaryActions = useMemo(
    () =>
      availableCurrencies && availableCurrencies.length > 0 ? (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
          <Select
            value={selectedCurrency}
            onValueChange={newCurrency => {
              setSelectedCurrency(newCurrency)
              // Find currency object and set currencyIds filter
              const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
                (c): c is { id: string; code: string; value: string } =>
                  typeof c !== 'string' && c?.code === newCurrency
              )
              if (currencyObj) {
                setSelectedFilters(prev => ({
                  ...prev,
                  currencyIds: [currencyObj.id]
                }))
              }
            }}
          >
            <SelectTrigger className="gba:w-32" data-testid="planned-exits-currency-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Array.isArray(availableCurrencies) ? availableCurrencies : []).map(currency => {
                const currencyCode = typeof currency === 'string' ? currency : currency?.code || currency?.value || ''
                return (
                  <SelectItem key={currencyCode} value={currencyCode}>
                    {currencyCode}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      ) : null,
    [availableCurrencies, selectedCurrency]
  )

  if (isInitialLoading && investments.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading planned exits: {error}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div data-testid="planned-exits-container" className="gba:space-y-6">
      {/* Metrics Section */}
      <PlannedExitsMetrics context={{ accessToken, userInfo }} currencyCode={selectedCurrency} />

      <DataDisplay
        titleSections={[
          {
            id: 'planned-exits',
            label: 'Planned Exits',
            metadata: {
              count: totalCount,
              isLoading: isInitialLoading
            }
          }
        ]}
        currentSection="planned-exits"
        searchValue={searchTerm}
        searchPlaceholder="Search planned exits..."
        onSearchChange={handleSearch}
        availableColumns={columnConfig}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        secondaryActions={secondaryActions}
        toolbarDensity="default"
      >
        <PlannedExitsTable
          accessToken={accessToken}
          userInfo={userInfo}
          data={investments}
          loading={isLoading && !initialLoadDone.current}
          error={error}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          visibleColumns={visibleColumns}
        />
      </DataDisplay>
    </div>
  )
}

export default PlannedExits
