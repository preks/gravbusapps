import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
  WarningCircleIcon,
  FunnelIcon,
  DotsThreeVerticalIcon
} from '@phosphor-icons/react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type FilterConfiguration,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { format, addMonths, parseISO, differenceInYears, startOfMonth, endOfMonth } from 'date-fns'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenerateDocumentDialog } from '@/business-apps/core/office/apps/documents/components'
import { DocumentApiService } from '@/business-apps/core/office/apps/documents/services/DocumentApiService'
import { exportToWord } from '@/business-apps/core/office/apps/documents/utils/exportUtils'
import { toast } from 'sonner'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { BackofficeFilterSheet } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeFilterSheet'
import { CompanyFilterGroup } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/shared/CompanyFilterGroup'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation/hooks/useActiveStructureCompanies'
import { HrAnalyticsFilterSummary } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/shared/HrAnalyticsFilterSummary'

interface EmployeeInsight {
  id: string
  firstName: string
  lastName: string
  fullName: string
  birthDate?: string
  hireDate?: string
  probationEnd?: string
  exitDate?: string
  pictureThumbnail?: string
  jobPositionName?: string
  organizationalUnitName?: string
  companyName?: string
}

interface DatasetRow {
  category?: string
  value?: number
  display_name?: string
  first_name?: string
  last_name?: string
  birth_date?: string
  hire_date?: string
  probation_end_date?: string
  termination_date?: string
  organizational_unit_name?: string
  job_position_name?: string
  picture_thumbnail?: string
}

type DateFieldMapping = {
  sourceField: keyof DatasetRow
  targetField: keyof EmployeeInsight
}

const mapDatasetRows = (rows: DatasetRow[], dateMapping: DateFieldMapping): EmployeeInsight[] =>
  rows.map(row => {
    const firstName = row.first_name ?? ''
    const lastName = row.last_name ?? ''
    return {
      id: String(row.category ?? ''),
      firstName,
      lastName,
      fullName: row.display_name ?? `${firstName} ${lastName}`.trim(),
      [dateMapping.targetField]: row[dateMapping.sourceField],
      pictureThumbnail: row.picture_thumbnail,
      jobPositionName: row.job_position_name,
      organizationalUnitName: row.organizational_unit_name
    }
  })

export const InsightsView: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { t } = useTranslation(hrTranslations)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [birthdays, setBirthdays] = useState<EmployeeInsight[]>([])
  const [anniversaries, setAnniversaries] = useState<EmployeeInsight[]>([])
  const [newHires, setNewHires] = useState<EmployeeInsight[]>([])
  const [probationEnds, setProbationEnds] = useState<EmployeeInsight[]>([])
  const [terminations, setTerminations] = useState<EmployeeInsight[]>([])
  const [birthdaysPage, setBirthdaysPage] = useState(1)
  const [birthdaysPageSize] = useState(10)
  const [birthdaysHasNextPage, setBirthdaysHasNextPage] = useState(false)
  const [anniversariesPage, setAnniversariesPage] = useState(1)
  const [anniversariesPageSize] = useState(10)
  const [anniversariesHasNextPage, setAnniversariesHasNextPage] = useState(false)
  const [newHiresPage, setNewHiresPage] = useState(1)
  const [newHiresPageSize] = useState(10)
  const [newHiresHasNextPage, setNewHiresHasNextPage] = useState(false)
  const [probationPage, setProbationPage] = useState(1)
  const [probationPageSize] = useState(10)
  const [probationHasNextPage, setProbationHasNextPage] = useState(false)
  const [terminationsPage, setTerminationsPage] = useState(1)
  const [terminationsPageSize] = useState(10)
  const [terminationsHasNextPage, setTerminationsHasNextPage] = useState(false)
  const [generateDocEmployee, setGenerateDocEmployee] = useState<EmployeeInsight | null>(null)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)
  const [includeNextMonthBirthdays, setIncludeNextMonthBirthdays] = useState(false)
  const [includeNextMonthAnniversaries, setIncludeNextMonthAnniversaries] = useState(false)
  const [includeNextMonthNewHires, setIncludeNextMonthNewHires] = useState(false)
  const [includeNextMonthProbation, setIncludeNextMonthProbation] = useState(false)
  const [includeNextMonthTerminations, setIncludeNextMonthTerminations] = useState(false)
  const [nextMonthBirthdays, setNextMonthBirthdays] = useState<EmployeeInsight[]>([])
  const [nextMonthAnniversaries, setNextMonthAnniversaries] = useState<EmployeeInsight[]>([])
  const [nextMonthNewHires, setNextMonthNewHires] = useState<EmployeeInsight[]>([])
  const [nextMonthProbationEnds, setNextMonthProbationEnds] = useState<EmployeeInsight[]>([])
  const [nextMonthTerminations, setNextMonthTerminations] = useState<EmployeeInsight[]>([])

  const nextMonthName = useMemo(() => format(addMonths(new Date(), 1), 'MMMM'), [])

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const structureId = getCurrentActiveStructureId()

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [filtersObject, setFiltersObject] = useState<Record<string, unknown>>({})

  const selectedCompanyIds = useMemo(
    () => ((filtersObject.companyIds as string[] | undefined) ?? []).filter(Boolean),
    [filtersObject.companyIds]
  )

  const { companies: companyNodes } = useActiveStructureCompanies(accessToken)
  const companyOptions = useMemo(() => (companyNodes ?? []).map(c => ({ id: c.id, label: c.name })), [companyNodes])

  const selectedCompanies = useMemo(
    () => companyOptions.filter(c => selectedCompanyIds.includes(c.id)).map(c => ({ id: c.id, name: c.label })),
    [companyOptions, selectedCompanyIds]
  )

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'hr-insights-filters',
      name: t('hr-insights-filter-sheet-title'),
      groups: [
        {
          id: 'company-group',
          label: t('hr-analytics-filter-company-title'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'companyIds',
              field: 'companyIds',
              label: t('hr-analytics-filter-company-title'),
              type: 'multi-select',
              config: { options: companyOptions, showSearch: true, showSelectAll: true }
            }
          ]
        }
      ]
    }),
    [companyOptions, t]
  )

  const handleFilterChangeFromSheet = useCallback((next: Record<string, unknown>) => {
    setFiltersObject(next)
    setBirthdaysPage(1)
    setAnniversariesPage(1)
    setNewHiresPage(1)
    setProbationPage(1)
    setTerminationsPage(1)
    setIncludeNextMonthBirthdays(false)
    setIncludeNextMonthAnniversaries(false)
    setIncludeNextMonthNewHires(false)
    setIncludeNextMonthProbation(false)
    setIncludeNextMonthTerminations(false)
  }, [])

  const clearSelectedCompanies = useCallback(() => {
    handleFilterChangeFromSheet({})
  }, [handleFilterChangeFromSheet])

  const entityDataMapForDoc = useMemo(() => {
    if (!generateDocEmployee) {
      return {} as Record<string, Record<string, unknown>>
    }
    const entityDataMap: Record<string, Record<string, unknown>> = {
      employee: {
        id: generateDocEmployee.id,
        firstName: generateDocEmployee.firstName,
        lastName: generateDocEmployee.lastName,
        fullName: generateDocEmployee.fullName,
        jobPositionName: generateDocEmployee.jobPositionName,
        organizationalUnitName: generateDocEmployee.organizationalUnitName,
        birthDate: generateDocEmployee.birthDate,
        hireDate: generateDocEmployee.hireDate,
        probationEnd: generateDocEmployee.probationEnd,
        exitDate: generateDocEmployee.exitDate
      },
      employment: {
        startDate: generateDocEmployee.hireDate,
        endDate: generateDocEmployee.exitDate
      },
      job: {
        position: generateDocEmployee.jobPositionName,
        name: generateDocEmployee.jobPositionName
      },
      company: {
        name: generateDocEmployee.companyName
      }
    }
    return entityDataMap
  }, [generateDocEmployee])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const currentMonthStart = startOfMonth(now).toISOString().slice(0, 10)
      const currentMonthEnd = endOfMonth(now).toISOString().slice(0, 10)
      const nextMonthStart = startOfMonth(addMonths(now, 1)).toISOString().slice(0, 10)
      const nextMonthEnd = endOfMonth(addMonths(now, 1)).toISOString().slice(0, 10)

      const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
      const buildParams = (start: string, end: string): Record<string, string | number> => {
        const params: Record<string, string | number> = { startDate: start, endDate: end }
        if (structureId) params.structureId = structureId
        if (companyIdsParam) params.companyIds = companyIdsParam
        return params
      }

      const currentMonthParams = buildParams(currentMonthStart, currentMonthEnd)
      const nextMonthParams = buildParams(nextMonthStart, nextMonthEnd)

      const fetchInsightCategory = async (
        queryName: string,
        dateMapping: DateFieldMapping,
        page: number,
        pageSize: number
      ) => {
        const currentDataset = await datasetClient.executeQuery(queryName, QueryType.DATASET, {
          ...currentMonthParams,
          page,
          pageSize
        })
        const currentRows = (currentDataset?.data ?? []) as DatasetRow[]

        const nextDataset = await datasetClient.executeQuery(queryName, QueryType.DATASET, {
          ...nextMonthParams,
          page: 1,
          pageSize
        })
        const nextRows = (nextDataset?.data ?? []) as DatasetRow[]

        return {
          current: mapDatasetRows(currentRows, dateMapping),
          next: mapDatasetRows(nextRows, dateMapping),
          hasNextPage: currentRows.length === pageSize
        }
      }

      const [bdResult, annResult, nhResult, probResult, termResult] = await Promise.all([
        fetchInsightCategory(
          'upcomingBirthdaysEmployees',
          { sourceField: 'birth_date', targetField: 'birthDate' },
          birthdaysPage,
          birthdaysPageSize
        ),
        fetchInsightCategory(
          'upcomingAnniversariesEmployees',
          { sourceField: 'hire_date', targetField: 'hireDate' },
          anniversariesPage,
          anniversariesPageSize
        ),
        fetchInsightCategory(
          'upcomingNewHiresEmployees',
          { sourceField: 'hire_date', targetField: 'hireDate' },
          newHiresPage,
          newHiresPageSize
        ),
        fetchInsightCategory(
          'upcomingProbationEndsEmployees',
          { sourceField: 'probation_end_date', targetField: 'probationEnd' },
          probationPage,
          probationPageSize
        ),
        fetchInsightCategory(
          'upcomingTerminationsEmployees',
          { sourceField: 'termination_date', targetField: 'exitDate' },
          terminationsPage,
          terminationsPageSize
        )
      ])

      setBirthdays(bdResult.current)
      setNextMonthBirthdays(bdResult.next)
      setBirthdaysHasNextPage(bdResult.hasNextPage)

      setAnniversaries(annResult.current)
      setNextMonthAnniversaries(annResult.next)
      setAnniversariesHasNextPage(annResult.hasNextPage)

      setNewHires(nhResult.current)
      setNextMonthNewHires(nhResult.next)
      setNewHiresHasNextPage(nhResult.hasNextPage)

      setProbationEnds(probResult.current)
      setNextMonthProbationEnds(probResult.next)
      setProbationHasNextPage(probResult.hasNextPage)

      setTerminations(termResult.current)
      setNextMonthTerminations(termResult.next)
      setTerminationsHasNextPage(termResult.hasNextPage)
    } catch (err: any) {
      setError(
        err.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.failed_to_fetch', 'Failed to fetch insights data')
      )
      console.error('Error fetching insights data:', err)
    } finally {
      setLoading(false)
    }
  }, [
    birthdaysPage,
    birthdaysPageSize,
    datasetClient,
    anniversariesPage,
    anniversariesPageSize,
    newHiresPage,
    newHiresPageSize,
    probationPage,
    probationPageSize,
    terminationsPage,
    terminationsPageSize,
    selectedCompanyIds,
    structureId
  ])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get initial tab from URL
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('insightsTab')
    const validTabs = ['birthdays', 'anniversaries', 'new-hires', 'probation-ends', 'terminations']

    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl
    }
    return 'birthdays'
  }

  const [activeSubTab, setActiveSubTab] = useState<string>(getInitialTab())

  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value)

    // Update URL to reflect the current tab
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('insightsTab', value)
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveSubTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const getDisplayedCount = (data: EmployeeInsight[], nextData: EmployeeInsight[], included: boolean) =>
    included ? data.length + nextData.length : data.length

  const viewOptions = [
    {
      key: 'birthdays',
      icon: <CalendarIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthdays', 'Birthdays'),
      count: getDisplayedCount(birthdays, nextMonthBirthdays, includeNextMonthBirthdays)
    },
    {
      key: 'anniversaries',
      icon: <UserIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversaries', 'Anniversaries'),
      count: getDisplayedCount(anniversaries, nextMonthAnniversaries, includeNextMonthAnniversaries)
    },
    {
      key: 'new-hires',
      icon: <UsersIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.new_hires', 'New Hires'),
      count: getDisplayedCount(newHires, nextMonthNewHires, includeNextMonthNewHires)
    },
    {
      key: 'probation-ends',
      icon: <ClockIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.probation_ends', 'Probation Ends'),
      count: getDisplayedCount(probationEnds, nextMonthProbationEnds, includeNextMonthProbation)
    },
    {
      key: 'terminations',
      icon: <WarningCircleIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.terminations', 'Terminations'),
      count: getDisplayedCount(terminations, nextMonthTerminations, includeNextMonthTerminations)
    }
  ]

  const handleNavigateToEmployee = useCallback((employeeId: string) => {
    const profileUrl = buildPlatformUrl('/platform/employee-record', {
      employeeId,
      tab: 'summary'
    })
    navigateTo(profileUrl)
  }, [])

  const renderEmployeeTable = (employees: EmployeeInsight[], dateField: string, dateLabel: string) => {
    if (!employees || employees.length === 0) {
      return (
        <div className="gba:text-sm gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.no_events', 'No events this month.')}
        </div>
      )
    }

    const handleGenerateDocument = (record: EmployeeInsight) => {
      setGenerateDocEmployee(record)
      setGenerateDocOpen(true)
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.employee', 'Employee')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.department', 'Department')}</TableHead>
            <TableHead>{dateLabel}</TableHead>
            <TableHead className="gba:w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map(record => {
            const dateValue = record[dateField as keyof EmployeeInsight] as string | undefined
            let renderedDate: string = getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.not_available', 'N/A')
            if (dateValue) {
              if (dateField === 'birthDate') {
                const birthDate = parseISO(dateValue)
                const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate())
                // For birthdays, show only day and month
                renderedDate = format(thisYearBirthday, 'MMM dd')
              } else if (dateField === 'hireDate' && activeSubTab === 'anniversaries') {
                const hireDate = parseISO(dateValue)
                const thisYearAnniversary = new Date(new Date().getFullYear(), hireDate.getMonth(), hireDate.getDate())
                const years = differenceInYears(new Date(), hireDate) + 1
                const yearsLabel =
                  years === 1
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.year', 'year')
                    : getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.years', 'years')
                renderedDate = `${format(thisYearAnniversary, 'MMM dd, yyyy')} (${years} ${yearsLabel})`
              } else {
                renderedDate = format(parseISO(dateValue), 'MMM dd, yyyy')
              }
            }

            const initials = `${record.firstName?.[0] || ''}${record.lastName?.[0] || ''}`

            return (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="gba:flex gba:items-center gba:space-x-3">
                    <Avatar>
                      {record.pictureThumbnail ? (
                        <AvatarImage
                          src={`data:image/gif;base64,${record.pictureThumbnail}`}
                          alt={`${record.firstName} ${record.lastName}`}
                        />
                      ) : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className="gba:font-medium gba:cursor-pointer gba:hover:text-blue-600 gba:hover:underline"
                        onClick={() => handleNavigateToEmployee(record.id)}
                        title={getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.view_profile', 'View profile')}
                      >
                        {record.fullName}
                      </div>
                      <div className="gba:text-sm gba:text-gray-500">{record.jobPositionName}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {record.organizationalUnitName ||
                    getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.not_available', 'N/A')}
                </TableCell>
                <TableCell>{renderedDate}</TableCell>
                <TableCell className="gba:text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8"
                        data-testid="hr-insights-row-menu"
                      >
                        <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="gba:font-semibold">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.actions', 'Actions')}
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleGenerateDocument(record)}
                        data-testid="hr-insights-row-generate-document"
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_insights.generate_document',
                          'Generate document'
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  interface TabConfig {
    key: string
    data: EmployeeInsight[]
    nextMonthData: EmployeeInsight[]
    includeNextMonth: boolean
    onToggleNextMonth: () => void
    dateField: string
    dateLabel: string
    categoryLabel: string
    page: number
    setPage: React.Dispatch<React.SetStateAction<number>>
    hasNextPage: boolean
  }

  const tabConfigs: TabConfig[] = [
    {
      key: 'birthdays',
      data: birthdays,
      nextMonthData: nextMonthBirthdays,
      includeNextMonth: includeNextMonthBirthdays,
      onToggleNextMonth: () => setIncludeNextMonthBirthdays(true),
      dateField: 'birthDate',
      dateLabel: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday_date', 'Birthday'),
      categoryLabel: 'birthdays',
      page: birthdaysPage,
      setPage: setBirthdaysPage,
      hasNextPage: birthdaysHasNextPage
    },
    {
      key: 'anniversaries',
      data: anniversaries,
      nextMonthData: nextMonthAnniversaries,
      includeNextMonth: includeNextMonthAnniversaries,
      onToggleNextMonth: () => setIncludeNextMonthAnniversaries(true),
      dateField: 'hireDate',
      dateLabel: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary'),
      categoryLabel: 'anniversaries',
      page: anniversariesPage,
      setPage: setAnniversariesPage,
      hasNextPage: anniversariesHasNextPage
    },
    {
      key: 'new-hires',
      data: newHires,
      nextMonthData: nextMonthNewHires,
      includeNextMonth: includeNextMonthNewHires,
      onToggleNextMonth: () => setIncludeNextMonthNewHires(true),
      dateField: 'hireDate',
      dateLabel: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.start_date', 'Start Date'),
      categoryLabel: 'new hires',
      page: newHiresPage,
      setPage: setNewHiresPage,
      hasNextPage: newHiresHasNextPage
    },
    {
      key: 'probation-ends',
      data: probationEnds,
      nextMonthData: nextMonthProbationEnds,
      includeNextMonth: includeNextMonthProbation,
      onToggleNextMonth: () => setIncludeNextMonthProbation(true),
      dateField: 'probationEnd',
      dateLabel: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.probation_end_date', 'Probation End'),
      categoryLabel: 'probation ends',
      page: probationPage,
      setPage: setProbationPage,
      hasNextPage: probationHasNextPage
    },
    {
      key: 'terminations',
      data: terminations,
      nextMonthData: nextMonthTerminations,
      includeNextMonth: includeNextMonthTerminations,
      onToggleNextMonth: () => setIncludeNextMonthTerminations(true),
      dateField: 'exitDate',
      dateLabel: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.termination_date', 'Termination Date'),
      categoryLabel: 'terminations',
      page: terminationsPage,
      setPage: setTerminationsPage,
      hasNextPage: terminationsHasNextPage
    }
  ]

  const renderTabFooter = (cfg: TabConfig) => (
    <div className="gba:mt-4 gba:flex gba:items-center gba:justify-between">
      <div>
        {!cfg.includeNextMonth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={cfg.onToggleNextMonth}
            data-testid={`hr-insights-${cfg.key}-load-next-month`}
          >
            {cfg.nextMonthData.length > 0
              ? `Show ${nextMonthName} ${cfg.categoryLabel} (${cfg.nextMonthData.length})`
              : `Show ${nextMonthName} ${cfg.categoryLabel}`}
          </Button>
        )}
        {cfg.includeNextMonth && cfg.nextMonthData.length === 0 && (
          <span className="gba:text-sm gba:text-muted-foreground">{`No ${cfg.categoryLabel} in ${nextMonthName}`}</span>
        )}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.page', 'Page')} {cfg.page}
        </span>
        <Button
          variant="outline"
          size="sm"
          data-testid={`hr-insights-${cfg.key}-prev-page`}
          onClick={() => cfg.setPage(p => Math.max(1, p - 1))}
          disabled={cfg.page === 1}
        >
          {getTranslationFromI18nKeyAndLabel('common-previous', 'Previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          data-testid={`hr-insights-${cfg.key}-next-page`}
          onClick={() => cfg.setPage(p => p + 1)}
          disabled={!cfg.hasNextPage}
        >
          {getTranslationFromI18nKeyAndLabel('common-next', 'Next')}
        </Button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive">
          <AlertTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.error_loading', 'Error loading insights')}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-5">
          {viewOptions.map(option => (
            <TabsTrigger
              key={option.key}
              value={option.key}
              className="gba:flex gba:flex-col gba:items-center gba:space-y-1"
            >
              <div className="gba:flex gba:items-center gba:space-x-2">
                {option.icon}
                <span>{option.label}</span>
                <span className="gba:bg-blue-100 gba:text-blue-800 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs">
                  {option.count}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <div className="gba:flex-1 gba:min-w-0">
            <HrAnalyticsFilterSummary
              selectedCompanies={selectedCompanies}
              filtersLabel={t('hr-analytics-filter-button')}
              companyLabel={t('hr-analytics-filter-company-title')}
              clearAllLabel={t('hr-analytics-filter-clear-all')}
              onRemoveCompany={() => {
                // Component currently clears all via onClearAll, keep this a no-op for now.
              }}
              onClearAll={clearSelectedCompanies}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setFilterSheetOpen(true)}
            data-testid="hr-insights-filter-button"
            aria-label={t('hr-analytics-filter-button')}
          >
            <FunnelIcon className="gba:h-4 gba:w-4" aria-hidden="true" />
          </Button>
        </div>

        {tabConfigs.map(cfg => (
          <TabsContent key={cfg.key} value={cfg.key}>
            {renderEmployeeTable(
              cfg.includeNextMonth ? [...cfg.data, ...cfg.nextMonthData] : cfg.data,
              cfg.dateField,
              cfg.dateLabel
            )}
            {renderTabFooter(cfg)}
          </TabsContent>
        ))}
      </Tabs>

      <GenerateDocumentDialog
        open={generateDocOpen}
        onOpenChange={open => {
          setGenerateDocOpen(open)
          if (!open) setGenerateDocEmployee(null)
        }}
        entityDataMap={entityDataMapForDoc}
        defaultTitle={generateDocEmployee?.fullName ?? 'Employee'}
        onSuccess={async documentId => {
          if (!accessToken) return
          DocumentApiService.setAccessToken(accessToken)
          try {
            const doc = await DocumentApiService.getDocument(documentId)
            if (doc?.content != null) {
              await exportToWord(doc.title || 'Document', doc.content)
              toast.success('Document downloaded')
            }
          } catch (err) {
            console.error('Failed to download document:', err)
            toast.error('Failed to download document')
          }
        }}
        data-testid="hr-insights-generate-document-dialog"
      />

      <BackofficeFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        configuration={filterConfiguration}
        values={filtersObject}
        onApply={handleFilterChangeFromSheet}
        onChange={handleFilterChangeFromSheet}
        title={t('hr-insights-filter-sheet-title')}
        description={t('hr-insights-filter-sheet-description')}
        noFiltersConfiguredLabel={t('hr-analytics-filter-no-filters-configured')}
        clearAllLabel={t('hr-analytics-filter-clear-all')}
        cancelLabel={t('hr-analytics-filter-cancel')}
        applyFiltersLabel={t('hr-analytics-filter-apply-filters')}
        customGroup={{
          groupId: 'company-group',
          valueKey: 'companyIds',
          render: ({ selectedIds, onSelectedIdsChange }) => (
            <CompanyFilterGroup
              companies={companyOptions.map(c => ({ id: c.id, name: c.label }))}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              searchPlaceholder={t('hr-analytics-filter-company-search-placeholder')}
              previousLabel={t('hr-analytics-filter-previous')}
              nextLabel={t('hr-analytics-filter-next')}
              ofLabel={t('hr-analytics-filter-of')}
              emptyLabel={t('hr-analytics-filter-company-empty')}
            />
          )
        }}
      />
    </div>
  )
}
