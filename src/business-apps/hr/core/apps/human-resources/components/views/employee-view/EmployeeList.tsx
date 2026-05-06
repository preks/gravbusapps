'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useGetEmployees, Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { EmployeeTable } from './components/EmployeeTable'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  type FilterConfiguration,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PlusSquareIcon } from '@/components/dataController/DataController'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { BackofficeDataDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeDataDisplay'
import { BackofficeFilterSheet } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeFilterSheet'
import { CompanyFilterGroup } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/shared/CompanyFilterGroup'
import { useEmployeeFilterSheetOptions } from '@/business-apps/hr/core/hooks/useEmployeeFilterSheetOptions'

/**
 * Employee List page component. Renders the employee list module with a table view.
 * @returns {JSX.Element}
 */
export const EmployeeList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props
  const { t } = useTranslation(hrTranslations)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [sortField, setSortField] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')

  const [search, setSearch] = useState('')
  const structureId = getCurrentActiveStructureId()

  const [filtersObject, setFiltersObject] = useState<Record<string, unknown>>({})

  const selectedCompanyIds = useMemo(
    () => ((filtersObject.companyIds as string[] | undefined) ?? []).filter(Boolean),
    [filtersObject.companyIds]
  )

  const { companies, organizationalUnits, employmentTypes, contractTypes, matrixTeams } =
    useEmployeeFilterSheetOptions(accessToken)

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(
    () => ({
      accessToken,
      structureId: structureId || undefined,
      companyIds: selectedCompanyIds,
      organizationalUnits: ((filtersObject.orgUnitIds as string[] | undefined) ?? []).filter(Boolean),
      employmentTypes: ((filtersObject.employmentTypeRefs as string[] | undefined) ?? []).filter(Boolean),
      contractTypes: ((filtersObject.contractTypeRefs as string[] | undefined) ?? []).filter(Boolean),
      matrixTeams: ((filtersObject.matrixTeamIds as string[] | undefined) ?? []).filter(Boolean),
      search,
      sortField,
      sortOrder
    }),
    [accessToken, filtersObject, search, selectedCompanyIds, sortField, sortOrder, structureId]
  )

  // Get employee data with filters from the centralized hook
  const { employees, total, loading, error, loadPage, retry } = useGetEmployees(memoizedFilters)

  // Handle page changes
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      loadPage(page, pageSize)
    },
    [pageSize]
  ) // Removed loadPage from dependencies

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    loadPage(1, newPageSize)
  }, []) // Removed loadPage from dependencies

  // Handle sorting changes
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    // When order is empty, clear sorting completely
    if (order === '') {
      setSortField('')
      setSortOrder('DESC') // Keep DESC as default for state type, but field will be empty
      setCurrentPage(1)
    } else {
      setSortField(field)
      setSortOrder(order)
      setCurrentPage(1)
    }
  }, [])

  // Auto-reload when sorting changes (after state updates)
  React.useEffect(() => {
    if (hasInitialLoad) {
      // Only reload if we've had an initial load
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [sortField, sortOrder]) // Only depend on the actual state values

  // Initial load effect - only runs once when component mounts and accessToken is available
  React.useEffect(() => {
    if (accessToken && !hasInitialLoad && !loading) {
      loadPage(1, pageSize) // Load first page with current pageSize
      setHasInitialLoad(true)
    }
  }, [accessToken, loading, hasInitialLoad, pageSize]) // Removed loadPage from dependencies

  // Reset pagination and reload when filters change
  React.useEffect(() => {
    if (hasInitialLoad) {
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [search, filtersObject, pageSize, hasInitialLoad]) // Removed loadPage from dependencies

  // Handle employee selection
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee)
  }, [])

  // Handle details panel close
  const handleDetailsPanelClose = useCallback(() => {
    setSelectedEmployee(null)
  }, [])

  const companyFilterGroupTitle = t('hr-analytics-filter-company-title')

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'hr-employees-filters',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.tab_label', 'Employees'),
      groups: [
        {
          id: 'company-group',
          label: companyFilterGroupTitle,
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'companyIds',
              field: 'companyIds',
              label: companyFilterGroupTitle,
              type: 'multi-select',
              config: {
                options: companies.map(company => ({ id: company.id, label: company.label })),
                showSearch: true,
                showSelectAll: true
              }
            }
          ]
        },
        {
          id: 'org-unit-group',
          label: t('hr-employees-filters-organizational-units'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'orgUnitIds',
              field: 'orgUnitIds',
              label: t('hr-employees-filters-organizational-units'),
              type: 'multi-select',
              config: {
                options: organizationalUnits.map(opt => ({ id: opt.id, label: opt.label })),
                showSearch: true,
                showSelectAll: true
              }
            }
          ]
        },
        {
          id: 'employment-type-group',
          label: t('hr-employees-filters-employment-types'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'employmentTypeRefs',
              field: 'employmentTypeRefs',
              label: t('hr-employees-filters-employment-types'),
              type: 'multi-select',
              config: {
                options: employmentTypes.map(opt => ({ id: opt.id, label: opt.label })),
                showSearch: true,
                showSelectAll: true
              }
            }
          ]
        },
        {
          id: 'contract-type-group',
          label: t('hr-employees-filters-contract-types'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'contractTypeRefs',
              field: 'contractTypeRefs',
              label: t('hr-employees-filters-contract-types'),
              type: 'multi-select',
              config: {
                options: contractTypes.map(opt => ({ id: opt.id, label: opt.label })),
                showSearch: true,
                showSelectAll: true
              }
            }
          ]
        },
        {
          id: 'matrix-teams-group',
          label: t('hr-employees-filters-matrix-teams'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'matrixTeamIds',
              field: 'matrixTeamIds',
              label: t('hr-employees-filters-matrix-teams'),
              type: 'multi-select',
              config: {
                options: matrixTeams.map(opt => ({ id: opt.id, label: opt.label })),
                showSearch: true,
                showSelectAll: true
              }
            }
          ]
        }
      ]
    }),
    [companies, companyFilterGroupTitle, contractTypes, employmentTypes, matrixTeams, organizationalUnits, t]
  )

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    setFiltersObject(filters)
    setCurrentPage(1)
  }, [])

  type CompanyFilterGroupRenderProps = {
    selectedIds: string[]
    onSelectedIdsChange: (ids: string[]) => void
  }

  const renderCompanyFilterGroup = useCallback(
    (props: CompanyFilterGroupRenderProps) => {
      const { selectedIds, onSelectedIdsChange } = props
      return (
        <CompanyFilterGroup
          companies={companies.map(company => ({ id: company.id, name: company.label }))}
          selectedIds={selectedIds}
          onSelectedIdsChange={onSelectedIdsChange}
          searchPlaceholder={t('hr-analytics-filter-company-search-placeholder')}
          previousLabel={t('hr-analytics-filter-previous')}
          nextLabel={t('hr-analytics-filter-next')}
          ofLabel={t('hr-analytics-filter-of')}
          emptyLabel={t('hr-analytics-filter-company-empty')}
        />
      )
    },
    [companies, t]
  )

  const companyCustomGroup = useMemo(
    () => ({
      groupId: 'company-group',
      valueKey: 'companyIds',
      render: renderCompanyFilterGroup
    }),
    [renderCompanyFilterGroup]
  )

  const renderFilterSheet = useCallback(
    (open: boolean, onOpenChange: (open: boolean) => void) => (
      <BackofficeFilterSheet
        open={open}
        onOpenChange={onOpenChange}
        configuration={filterConfiguration}
        values={filtersObject}
        onApply={handleFilterChangeFromDisplay}
        onChange={handleFilterChangeFromDisplay}
        title={t('hr-employees-filter-sheet-title')}
        description={t('hr-employees-filter-sheet-description')}
        noFiltersConfiguredLabel={t('hr-analytics-filter-no-filters-configured')}
        clearAllLabel={t('hr-analytics-filter-clear-all')}
        cancelLabel={t('hr-analytics-filter-cancel')}
        applyFiltersLabel={t('hr-analytics-filter-apply-filters')}
        customGroup={companyCustomGroup}
      />
    ),
    [companyCustomGroup, filterConfiguration, filtersObject, handleFilterChangeFromDisplay, t]
  )

  return (
    <div data-testid="employee-list-content">
      <BackofficeDataDisplay
        className="gba:h-full"
        titleSections={[
          {
            id: 'employees',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:human_resources_page.employees_section.tab_label',
              'Employees'
            ),
            metadata: { count: total, isLoading: loading }
          }
        ]}
        currentSection="employees"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('lowcoder:common.search', 'Search...')}
        onSearchChange={value => {
          setSearch(value)
          setCurrentPage(1)
        }}
        filters={filtersObject}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChangeFromDisplay}
        renderFilterSheet={renderFilterSheet}
        secondaryActions={
          <AppActionMenu
            contextsArray={[FlowContextName.createEmployee]}
            accessToken={accessToken}
            data-testid="add-employee-menu"
            emptyStateBehavior="disable"
            autoExecuteSingleAction={true}
            deferMainContextRequestsUntilClick={false}
          >
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
              data-testid="add-employee-button"
              type="button"
            >
              <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                <PlusSquareIcon />
              </span>
              <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.add', 'Add')}
              </span>
            </button>
          </AppActionMenu>
        }
        data-testid="employee-list-data-display"
      >
        <div data-testid="employee-table-container">
          <EmployeeTable
            employees={employees}
            loading={loading}
            error={error}
            loadPage={loadPage}
            retry={retry}
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSelectEmployee={handleEmployeeSelect}
            selectedEmployeeId={selectedEmployee?.id}
            accessToken={accessToken}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortingChange={handleSortingChange}
          />
        </div>
      </BackofficeDataDisplay>
      <Sheet open={selectedEmployee !== null} onOpenChange={open => !open && handleDetailsPanelClose()}>
        <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0" data-testid="employee-list-details-sheet">
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <SheetTitle className="gba:text-left">
              {selectedEmployee
                ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                : getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.employees_section.employee_details',
                    'Employee Details'
                  )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:min-h-0" data-testid="employee-list-details-content">
            {selectedEmployee && (
              <EmployeeDetails employeeId={selectedEmployee.id} accessToken={accessToken} userInfo={props.userInfo} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default EmployeeList
