import React, { useEffect, useCallback, useMemo, useState } from 'react'

import {
  PageLayout,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'

import { UsersIcon } from '@phosphor-icons/react'

import { MODULE_COLORS } from '@/common/constants/ui'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'

import { useEmployeeFilterBackendSearch } from '@/business-apps/hr/core/apps/assets/hooks/useEmployeeFilterBackendSearch'

import { DataFilter, type DataFilterGroup } from '@/components/data-filter/DataFilter'

import { useManagerPlanningStore } from './hooks/useManagerPlanningStore'

import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'

import { useTeamCompensationData } from './hooks/useTeamCompensationData'

import { useTeamMembersPipeline } from './hooks/useTeamMembersPipeline'

import { TeamAllocationGrid } from './components/TeamAllocationGrid'
import { TeamCompensationBudgetSummary } from './components/TeamCompensationBudgetSummary'

import { AssetTablePagination } from '@/business-apps/hr/core/apps/assets/components/AssetTablePagination'

import { TeamCompensationTableFilters } from './components/TeamCompensationTableFilters'
import {
  TeamCompensationLastRaiseFilterFields,
  TeamCompensationSalaryFilterFields
} from './components/TeamCompensationRangeFilterFields'

import { formatLocaleInteger } from '../../utils/budgetCalculations'

import translations from './_i18n'

const PILL_SALARY_RANGE = 'range-salary'
const PILL_LAST_RAISE_RANGE = 'range-last-raise'

export const ManagerCompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context

  const employeeId = userInfo?.employeeDetails?.employeeId

  const { t } = useTranslation(translations)

  const [showDataFilter, setShowDataFilter] = useState(false)

  const [employeeFilterSearch, setEmployeeFilterSearch] = useState('')

  const {
    searchQuery,

    selectedCompanyId,

    setSearchQuery,

    setSelectedCompanyId,

    sortField,

    sortDirection,

    setSortFromTable,

    sidebarFilterIds,

    filterSalaryMin,

    filterSalaryMax,

    filterLastRaiseFrom,

    filterLastRaiseTo,

    toggleSidebarFilter,

    setSalaryFilterRange,

    setLastRaiseFilterRange,

    currentPage,

    pageSize,

    setCurrentPage,

    setPageSize,

    resetTableUi
  } = useManagerPlanningStore()

  const { companies, loading: companiesLoading, error: companiesLoadError } = useActiveStructureCompanies(accessToken)

  useEffect(() => {
    if (companiesLoading) return
    if (selectedCompanyId == null) return
    if (companies.length === 0) {
      setSelectedCompanyId(null)
      return
    }
    if (!companies.some(c => c.id === selectedCompanyId)) {
      setSelectedCompanyId(null)
    }
  }, [companiesLoading, companies, selectedCompanyId, setSelectedCompanyId])

  useDefaultCompanyForCurrentUser(
    accessToken,
    employeeId,
    companies,
    companiesLoading,
    selectedCompanyId,
    setSelectedCompanyId
  )

  const {
    teamMembers,

    loading: dataLoading,

    error
  } = useTeamCompensationData({
    accessToken,

    companyId: selectedCompanyId
  })

  const { backendSearch: employeeBackendSearch, getEmployeeLabel } = useEmployeeFilterBackendSearch(
    accessToken ?? '',

    sidebarFilterIds,

    employeeFilterSearch
  )

  const pipeline = useTeamMembersPipeline({
    members: teamMembers,

    searchQuery,

    sidebarFilterIds,

    filterSalaryMin,

    filterSalaryMax,

    filterLastRaiseFrom,

    filterLastRaiseTo,

    sortField,

    sortDirection,

    currentPage,

    pageSize
  })

  const { pageRows, totalFiltered } = pipeline

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1)

  const filterGroups: DataFilterGroup[] = useMemo(
    () => [
      {
        id: 'employee',

        title: t('filter-employee-group'),

        backendSearch: employeeBackendSearch
      },

      {
        id: 'salary',

        title: t('filter-salary-group'),

        hideSearch: true,

        customComponent: (
          <TeamCompensationSalaryFilterFields
            salaryMin={filterSalaryMin}
            salaryMax={filterSalaryMax}
            onSalaryMinMaxChange={setSalaryFilterRange}
          />
        )
      },

      {
        id: 'lastRaise',

        title: t('filter-last-raise-group'),

        hideSearch: true,

        customComponent: (
          <TeamCompensationLastRaiseFilterFields
            lastRaiseFrom={filterLastRaiseFrom}
            lastRaiseTo={filterLastRaiseTo}
            onLastRaiseRangeChange={setLastRaiseFilterRange}
          />
        )
      }
    ],

    [
      t,
      employeeBackendSearch,
      filterSalaryMin,
      filterSalaryMax,
      filterLastRaiseFrom,
      filterLastRaiseTo,
      setSalaryFilterRange,
      setLastRaiseFilterRange
    ]
  )

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    for (const id of sidebarFilterIds) {
      if (id.startsWith('employee:')) {
        const eid = id.slice('employee:'.length)

        map[id] = getEmployeeLabel(eid) ?? eid
      }
    }

    return map
  }, [sidebarFilterIds, getEmployeeLabel, t])

  const additionalFilterPills = useMemo(() => {
    const pills: { id: string; label: string }[] = []

    if (filterSalaryMin != null || filterSalaryMax != null) {
      const minLabel = filterSalaryMin != null ? formatLocaleInteger(filterSalaryMin) : t('filter-range-open')
      const maxLabel = filterSalaryMax != null ? formatLocaleInteger(filterSalaryMax) : t('filter-range-open')
      pills.push({
        id: PILL_SALARY_RANGE,
        label: t('filter-pill-salary-range', { min: minLabel, max: maxLabel })
      })
    }

    if (filterLastRaiseFrom != null || filterLastRaiseTo != null) {
      const from = filterLastRaiseFrom ?? ''
      const to = filterLastRaiseTo ?? ''
      let label: string
      if (from && to) {
        label = t('filter-pill-last-raise-range', { from, to })
      } else if (from) {
        label = t('filter-pill-last-raise-from', { from })
      } else {
        label = t('filter-pill-last-raise-to', { to })
      }
      pills.push({ id: PILL_LAST_RAISE_RANGE, label })
    }

    return pills
  }, [filterSalaryMin, filterSalaryMax, filterLastRaiseFrom, filterLastRaiseTo, t])

  const handleRemoveAdditionalFilterPill = useCallback(
    (id: string) => {
      if (id === PILL_SALARY_RANGE) {
        setSalaryFilterRange(null, null)
      } else if (id === PILL_LAST_RAISE_RANGE) {
        setLastRaiseFilterRange(null, null)
      }
    },

    [setSalaryFilterRange, setLastRaiseFilterRange]
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages, setCurrentPage])

  const currentSortOrder = useMemo(() => (sortDirection === 'asc' ? 'ASC' : 'DESC'), [sortDirection])

  const teamCountLabel = useMemo(() => formatLocaleInteger(totalFiltered), [totalFiltered])

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q)
    },

    [setSearchQuery]
  )

  const handleClearAllFilters = useCallback(() => {
    setEmployeeFilterSearch('')

    resetTableUi()
  }, [resetTableUi])

  const handleSidebarFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      toggleSidebarFilter(filterId, selected)
    },

    [toggleSidebarFilter]
  )

  const companySelectValue =
    selectedCompanyId != null && companies.some(c => c.id === selectedCompanyId) ? selectedCompanyId : undefined

  const companySelect = (
    <Select
      value={companySelectValue}
      onValueChange={val => setSelectedCompanyId(val || null)}
      disabled={!companiesLoading && companies.length === 0}
    >
      <SelectTrigger className="gba:w-[300px]" data-testid="manager-compensation-company-select">
        <SelectValue placeholder={t('select-company-placeholder')} />
      </SelectTrigger>

      <SelectContent>
        {companies.map(company => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const companiesLoadErrorMessage =
    !companiesLoading && companies.length === 0 && companiesLoadError ? (
      <p
        className="gba:max-w-sm gba:text-right gba:text-sm gba:text-destructive"
        data-testid="manager-compensation-companies-error"
      >
        {t('error-companies-load', { message: companiesLoadError })}
      </p>
    ) : null

  /** Shown only when no company is selected (no budget / table yet). */
  const emptyCompanySelectionRow = (
    <div
      className="gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-4"
      data-testid="manager-compensation-empty-company-bar"
    >
      <p className="gba:min-w-0 gba:flex-1 gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
      <div className="gba:flex gba:shrink-0 gba:flex-col gba:items-end gba:gap-2">
        {companySelect}
        {companiesLoadErrorMessage}
      </div>
    </div>
  )

  const teamTableFiltersRow = selectedCompanyId ? (
    <TeamCompensationTableFilters
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      onPageChange={setCurrentPage}
      showDataFilter={showDataFilter}
      onToggleDataFilter={() => setShowDataFilter(v => !v)}
      sidebarFilterIds={sidebarFilterIds}
      filterLabelMap={filterLabelMap}
      onRemoveSidebarFilterId={id => toggleSidebarFilter(id, false)}
      additionalFilterPills={additionalFilterPills}
      onRemoveAdditionalFilterPill={handleRemoveAdditionalFilterPill}
      onClearAllFilters={handleClearAllFilters}
      toolbarRowDataTestId="manager-compensation-toolbar"
      toolbarAfterSearch={
        <h3 className="gba:shrink-0 gba:text-lg gba:font-semibold gba:text-foreground">
          {t('table-section-title')}{' '}
          <span className="gba:font-semibold gba:text-muted-foreground" data-testid="manager-compensation-team-count">
            {teamCountLabel}
          </span>
        </h3>
      }
      toolbarEndRight={
        <>
          {companySelect}
          {companiesLoadErrorMessage}
        </>
      }
    />
  ) : null

  const filterSidebar =
    showDataFilter && selectedCompanyId ? (
      <div
        className="gba:flex gba:w-[336px] gba:flex-shrink-0 gba:flex-col gba:border-r gba:border-border gba:bg-background gba:pr-4"
        data-testid="manager-compensation-filter-sidebar"
      >
        <DataFilter
          show
          onClose={() => setShowDataFilter(false)}
          filterGroups={filterGroups}
          onFilterChange={handleSidebarFilterChange}
          onGroupSearchChange={(groupId, value) => {
            if (groupId === 'employee') setEmployeeFilterSearch(value)
          }}
        />
      </div>
    ) : null

  const renderBody = () => {
    if (companiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      )
    }

    if (!selectedCompanyId) {
      return (
        <div
          className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
          data-testid="manager-compensation-data-body"
        >
          <div className="gba:p-4">{emptyCompanySelectionRow}</div>
        </div>
      )
    }

    if (dataLoading) {
      return (
        <div
          className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
          data-testid="manager-compensation-data-body"
        >
          <div className="gba:p-4">
            <div className="gba:flex gba:flex-col gba:gap-4">
              <TeamCompensationBudgetSummary />

              {teamTableFiltersRow}

              <div className="gba:flex gba:flex-row gba:items-start gba:gap-4">
                {filterSidebar}

                <div className="gba:min-w-0 gba:flex-1">
                  <div className="gba:flex gba:justify-center gba:py-12">
                    <Spinner />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div
          className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
          data-testid="manager-compensation-data-body"
        >
          <div className="gba:p-4">
            <div className="gba:flex gba:flex-col gba:gap-4">
              <TeamCompensationBudgetSummary />

              {teamTableFiltersRow}

              <div className="gba:flex gba:flex-row gba:items-start gba:gap-4">
                {filterSidebar}

                <div className="gba:min-w-0 gba:flex-1">
                  <Alert variant="destructive" data-testid="manager-compensation-error">
                    <AlertTitle>{t('error-title')}</AlertTitle>

                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
        data-testid="manager-compensation-data-body"
      >
        <div className="gba:p-4">
          <div className="gba:flex gba:flex-col gba:gap-4">
            <TeamCompensationBudgetSummary />

            {teamTableFiltersRow}

            <div className="gba:flex gba:flex-row gba:items-start gba:gap-4">
              {filterSidebar}

              <div className="gba:min-w-0 gba:flex-1 gba:space-y-4">
                <TeamAllocationGrid
                  members={pageRows}
                  sortField={sortField}
                  currentSortOrder={currentSortOrder}
                  onSort={setSortFromTable}
                />

                <AssetTablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalCount={totalFiltered}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  itemLabel={t('pagination-item-suffix')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      headerIcon={UsersIcon}
      headerTitle={t('title')}
      headerDescription={t('subtitle')}
      // PageHeader defaults onBack to history.back(); null hides the back control.
      onBack={null as unknown as (() => void) | undefined}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-6">{renderBody()}</div>
    </PageLayout>
  )
}
