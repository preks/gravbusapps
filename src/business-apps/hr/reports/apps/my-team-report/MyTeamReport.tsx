import React, { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout'
import { DataContainer } from '@/components/layout/dataContainer'
import { DataController, DataControllerProps } from '@/components/dataController'
import { useGetEmployeesReport, Employee } from './hooks/useGetEmployeesReport'
import { useCatalogEntries } from './hooks/useCatalogEntries'
import { calculateAverageTenure } from './utils/employeeUtils'
import { applyEmployeeFilters } from './utils/filterUtils'
import { generateKpiCards, matchesKpi as kpiMatcher } from './utils/kpiUtils'
import { useTeamReportFilters } from './hooks/useTeamReportFilters'
import { useSort } from './hooks/useSort'
import { sortData } from './utils/sortUtils'
import { TeamReportTable } from './components/TeamReportTable'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
import { UsersThreeIcon, UsersIcon, CalendarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'

export const MyTeamReport: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken, userInfo } = props
  const { t } = useTranslation()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [activeKpi, setActiveKpi] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const {
    employees: allEmployees,
    workingConditions,
    loading,
    error,
    retry
  } = useGetEmployeesReport({ accessToken: accessToken || '', userInfo })

  const { contractTypes, employmentTypes, loading: catalogLoading } = useCatalogEntries(accessToken || '')

  const averageTenureFormatted = useMemo(() => {
    return calculateAverageTenure(allEmployees).formatted
  }, [allEmployees])

  const getKpiIcon = (kpiKey: string) => {
    if (kpiKey === 'all') return <UsersIcon />
    if (kpiKey === 'tenure') return <CalendarIcon />
    return undefined
  }

  const kpiCards = useMemo(() => {
    return generateKpiCards(allEmployees, averageTenureFormatted, workingConditions, contractTypes, employmentTypes)
  }, [allEmployees, averageTenureFormatted, workingConditions, contractTypes, employmentTypes])

  // Organize widgets by rows
  const widgetsByRow = useMemo(() => {
    const rows: Record<number, WidgetItem[]> = {}

    kpiCards.forEach(kpi => {
      const row = kpi.row || 1
      if (!rows[row]) {
        rows[row] = []
      }
      rows[row].push({
        key: kpi.key,
        title: kpi.label,
        value: kpi.value,
        prefix: getKpiIcon(kpi.key),
        color: '#1890ff',
        span: { xs: 24, sm: 12, lg: 6 },
        description: kpi.subLabel,
        onClick: () => setActiveKpi(kpi.key)
      })
    })

    return rows
  }, [kpiCards])

  // Flatten widgets for backwards compatibility with filtering logic
  const widgets: WidgetItem[] = useMemo(() => {
    return Object.values(widgetsByRow).flat()
  }, [widgetsByRow])

  const { sortConfig, handleSort } = useSort()

  const { search, setSearch, selectedFilters, addFilter, removeFilter, clearFilters, filterGroups, filterLabelMap } =
    useTeamReportFilters(
      [...new Set(allEmployees.map((e: Employee) => e.jobPosition).filter((p): p is string => !!p))],
      [...new Set(allEmployees.map((e: Employee) => e.location).filter((l): l is string => !!l))],
      [
        ...new Set(
          allEmployees
            .map((e: Employee) => (e.employmentType ? getCatalogValue(e.employmentType) : ''))
            .filter((t): t is string => !!t)
        )
      ],
      [
        ...new Set(
          allEmployees
            .map((e: Employee) => (e.contractType ? getCatalogValue(e.contractType) : ''))
            .filter((t): t is string => !!t)
        )
      ]
    )

  const matchesKpi = useCallback(
    (employee: Employee): boolean => {
      return kpiMatcher(employee, activeKpi)
    },
    [activeKpi]
  )

  const filteredEmployees = useMemo(() => {
    return applyEmployeeFilters(allEmployees, search, selectedFilters, matchesKpi)
  }, [allEmployees, search, selectedFilters, matchesKpi])

  const sortedEmployees = useMemo(() => {
    return sortData(filteredEmployees, sortConfig)
  }, [filteredEmployees, sortConfig])

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedEmployees.slice(startIndex, startIndex + pageSize)
  }, [sortedEmployees, currentPage, pageSize])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedFilters, sortConfig])

  const handleFilterChange = useCallback(
    (filterId: string, checked: boolean) => {
      if (checked) {
        addFilter(filterId)
      } else {
        removeFilter(filterId)
      }
    },
    [addFilter, removeFilter]
  )

  const displayFilters = useMemo(() => {
    const kpiFilter = widgets.find(widget => widget.key === activeKpi)
    const kpiFilterPill = kpiFilter && activeKpi !== 'all' ? [`kpi:${activeKpi}`] : []
    return [...kpiFilterPill, ...selectedFilters]
  }, [activeKpi, selectedFilters, widgets])

  const displayLabelMap = useMemo(() => {
    const kpiLabelMap = widgets.reduce(
      (acc, widget) => {
        acc[`kpi:${widget.key}`] = widget.title
        return acc
      },
      {} as Record<string, string>
    )

    return { ...kpiLabelMap, ...filterLabelMap }
  }, [widgets, filterLabelMap])

  const handleDisplayFilterChange = useCallback(
    (newFilters: string[]) => {
      const kpiPillPrefix = 'kpi:'
      const newKpiFilters = newFilters.filter(f => f.startsWith(kpiPillPrefix))
      const newRegularFilters = newFilters.filter(f => !f.startsWith(kpiPillPrefix))

      if (newKpiFilters.length === 0 && activeKpi !== 'all') {
        setActiveKpi('all')
      } else {
        const newActiveKpi = newKpiFilters[0]?.replace(kpiPillPrefix, '')
        if (newActiveKpi && newActiveKpi !== activeKpi) {
          setActiveKpi(newActiveKpi)
        }
      }

      if (newRegularFilters.length === 0 && selectedFilters.length > 0) {
        clearFilters()
      }

      const removedRegularFilters = selectedFilters.filter(f => !newRegularFilters.includes(f))

      removedRegularFilters.forEach(filterToRemove => {
        removeFilter(filterToRemove)
      })
    },
    [activeKpi, selectedFilters, clearFilters, removeFilter, widgets]
  )

  const loadPage = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize) {
      setPageSize(newPageSize)
    }
  }, [])

  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee)
  }, [])

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      const widget = widgets.find(w => w.key === widgetKey)
      if (widget?.onClick) {
        widget.onClick()
      }
    },
    [widgets]
  )

  const handleDetailsPanelClose = useCallback(() => {
    setSelectedEmployee(null)
  }, [])

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isOutsideTeamReportTable = !target.closest('[data-testid="team-report-table-container"]')

      if (isOutsideTeamReportTable && selectedEmployee) {
        setSelectedEmployee(null)
      }
    },
    [selectedEmployee]
  )

  React.useEffect(() => {
    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [handleOutsideClick])

  return (
    <div>
      <PageLayout
        variant="default"
        headerIcon={<CalendarIcon size={32} className="gba:text-info gba:text-3xl" />}
        headerLabel={getTranslationFromI18nKeyAndLabel('lowcoder:employee_my_team_report.overview_header', 'My Team')}
        className="gba:[&_[data-testid=page-layout-content-header]]:!border-b-0 gba:[&_[data-testid=page-layout-header]]:!border-b-0"
        contentHeader={
          <div data-testid="team-report-kpi-container" className="gba:pb-4">
            {Object.entries(widgetsByRow).map(([rowNumber, rowWidgets]) => (
              <div key={rowNumber} className={rowNumber === '1' ? '' : 'gba:mt-4'}>
                <WidgetGroup
                  widgets={rowWidgets}
                  isLoading={loading || catalogLoading}
                  error={error}
                  onRetry={retry}
                  onWidgetClick={handleWidgetClick}
                  cardsClassName="gba:!grid-cols-1 gba:md:!grid-cols-3 gba:lg:!grid-cols-5"
                  skeletonCount={6}
                  emptyText={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_report_kpi.no_data_available',
                    'No KPI data available.'
                  )}
                  data-testid={`team-report-kpi-row-${rowNumber}`}
                />
              </div>
            ))}
          </div>
        }
        contentContainer={
          <DataContainer<DataControllerProps>
            contentBackground="white"
            floatingDetails={true}
            onDetailsPanelClose={handleDetailsPanelClose}
            className="gba:[&_[data-testid=data-container-main-content]]:!pl-0"
            dataControllerComponent={DataController}
            dataControllerProps={{
              search: search,
              setSearch: setSearch,
              debounceDelay: 300,
              filter: displayFilters,
              setFilter: handleDisplayFilterChange,
              filterLabelMap: displayLabelMap,
              listIcon: <UsersThreeIcon size={20} />,
              listAmount: filteredEmployees.length
            }}
            dataFilterProps={{
              filterGroups: filterGroups,
              onFilterChange: handleFilterChange
            }}
            dataBody={
              <div data-testid="team-report-table-container" className="gba:pt-4 gba:pl-0 gba:pr-4 gba:pb-4">
                <div className="gba:border gba:border-gray-200 gba:rounded-lg gba:bg-white">
                  <TeamReportTable
                    {...props}
                    employees={paginatedEmployees}
                    loading={loading}
                    error={error}
                    loadPage={loadPage}
                    retry={retry}
                    total={filteredEmployees.length}
                    onSelectEmployee={handleEmployeeSelect}
                    selectedEmployeeId={selectedEmployee?.id}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </div>
            }
            dataDetails={
              selectedEmployee
                ? {
                    title: t('employee.details_title', 'Employee Details'),
                    icon: <UsersThreeIcon size={20} />,
                    content: <EmployeeDetails employeeId={selectedEmployee.id} {...props} />,
                    onClose: handleDetailsPanelClose
                  }
                : undefined
            }
          />
        }
      />
    </div>
  )
}

export default MyTeamReport
