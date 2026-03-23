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

import { AssetTablePagination } from '@/business-apps/hr/core/apps/assets/components/AssetTablePagination'

import { TeamCompensationTableFilters } from './components/TeamCompensationTableFilters'

import { formatLocaleInteger } from '../../utils/budgetCalculations'

import translations from './_i18n'

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

    toggleSidebarFilter,

    currentPage,

    pageSize,

    setCurrentPage,

    setPageSize,

    resetTableUi
  } = useManagerPlanningStore()

  const { companies, loading: companiesLoading } = useActiveStructureCompanies(accessToken)

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

    sortField,

    sortDirection,

    currentPage,

    pageSize
  })

  const { pageRows, totalFiltered, uniqueJobLevels } = pipeline

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1)

  const filterGroups: DataFilterGroup[] = useMemo(
    () => [
      {
        id: 'employee',

        title: t('filter-employee-group'),

        backendSearch: employeeBackendSearch
      },

      {
        id: 'level',

        title: t('filter-level-label'),

        filters: uniqueJobLevels.map(level => ({
          id: `level:${level}`,

          label: level,

          selected: sidebarFilterIds.includes(`level:${level}`)
        }))
      },

      {
        id: 'salary',

        title: t('filter-salary-group'),

        hideSearch: true,

        filters: [
          {
            id: 'salary:with',

            label: t('filter-salary-with'),

            selected: sidebarFilterIds.includes('salary:with')
          },

          {
            id: 'salary:without',

            label: t('filter-salary-without'),

            selected: sidebarFilterIds.includes('salary:without')
          }
        ]
      }
    ],

    [t, uniqueJobLevels, sidebarFilterIds, employeeBackendSearch]
  )

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    for (const id of sidebarFilterIds) {
      if (id.startsWith('employee:')) {
        const eid = id.slice('employee:'.length)

        map[id] = getEmployeeLabel(eid) ?? eid
      } else if (id.startsWith('level:')) {
        const level = id.slice('level:'.length)

        map[id] = t('filter-pill-level', { level })
      } else if (id === 'salary:with') {
        map[id] = t('filter-pill-salary-with')
      } else if (id === 'salary:without') {
        map[id] = t('filter-pill-salary-without')
      }
    }

    return map
  }, [sidebarFilterIds, getEmployeeLabel, t])

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

  const companySelect = (
    <Select value={selectedCompanyId ?? undefined} onValueChange={val => setSelectedCompanyId(val || null)}>
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

  const toolbarRow = (
    <div
      className="gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-4"
      data-testid="manager-compensation-toolbar"
    >
      <div className="gba:min-w-0 gba:flex-1">
        {selectedCompanyId ? (
          <TeamCompensationTableFilters
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onPageChange={setCurrentPage}
            showDataFilter={showDataFilter}
            onToggleDataFilter={() => setShowDataFilter(v => !v)}
            sidebarFilterIds={sidebarFilterIds}
            filterLabelMap={filterLabelMap}
            onRemoveSidebarFilterId={id => toggleSidebarFilter(id, false)}
            onClearAllFilters={handleClearAllFilters}
            toolbarAfterSearch={
              <h3 className="gba:shrink-0 gba:text-lg gba:font-semibold gba:text-foreground">
                {t('table-section-title')}{' '}
                <span
                  className="gba:font-semibold gba:text-muted-foreground"
                  data-testid="manager-compensation-team-count"
                >
                  {teamCountLabel}
                </span>
              </h3>
            }
          />
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
        )}
      </div>

      <div className="gba:shrink-0">{companySelect}</div>
    </div>
  )

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
          <div className="gba:p-4">{toolbarRow}</div>
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
            <div className="gba:flex gba:flex-row gba:items-start gba:gap-4">
              {filterSidebar}

              <div className="gba:min-w-0 gba:flex-1 gba:space-y-4">
                {toolbarRow}

                <div className="gba:flex gba:justify-center gba:py-12">
                  <Spinner />
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
            <div className="gba:flex gba:flex-row gba:items-start gba:gap-4">
              {filterSidebar}

              <div className="gba:min-w-0 gba:flex-1 gba:space-y-4">
                {toolbarRow}

                <Alert variant="destructive" data-testid="manager-compensation-error">
                  <AlertTitle>{t('error-title')}</AlertTitle>

                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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
          <div className="gba:flex gba:flex-row gba:items-start gba:gap-4">
            {filterSidebar}

            <div className="gba:min-w-0 gba:flex-1 gba:space-y-4">
              {toolbarRow}

              <div className="gba:space-y-4">
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
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-6">{renderBody()}</div>
    </PageLayout>
  )
}
