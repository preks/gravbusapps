import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarIcon, UserIcon, UsersIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
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
import { MoreHorizontal } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { format, addDays, parseISO, differenceInYears } from 'date-fns'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenerateDocumentDialog } from '@/business-apps/core/office/apps/documents/components'
import { DocumentApiService } from '@/business-apps/core/office/apps/documents/services/DocumentApiService'
import { exportToWord } from '@/business-apps/core/office/apps/documents/utils/exportUtils'
import { toast } from 'sonner'

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

interface UpcomingBirthdayDatasetRow {
  category?: string
  value?: number
  display_name?: string
  first_name?: string
  last_name?: string
  birth_date?: string
  organizational_unit_name?: string
  job_position_name?: string
  picture_thumbnail?: string
}

interface UpcomingAnniversaryDatasetRow {
  category?: string
  value?: number
  display_name?: string
  first_name?: string
  last_name?: string
  hire_date?: string
  organizational_unit_name?: string
  job_position_name?: string
  picture_thumbnail?: string
}

interface UpcomingNewHireDatasetRow {
  category?: string
  value?: number
  display_name?: string
  first_name?: string
  last_name?: string
  hire_date?: string
  organizational_unit_name?: string
  job_position_name?: string
  picture_thumbnail?: string
}

interface UpcomingProbationDatasetRow {
  category?: string
  value?: number
  display_name?: string
  first_name?: string
  last_name?: string
  probation_end_date?: string
  organizational_unit_name?: string
  job_position_name?: string
  picture_thumbnail?: string
}

interface UpcomingTerminationDatasetRow {
  category?: string
  value?: number
  display_name?: string
  first_name?: string
  last_name?: string
  termination_date?: string
  organizational_unit_name?: string
  job_position_name?: string
  picture_thumbnail?: string
}

export const InsightsView: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
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

  const client = useGraphqlClient(accessToken)
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

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
      const startDate = new Date().toISOString().slice(0, 10)
      const endDate = addDays(new Date(), 30).toISOString().slice(0, 10)
      const birthdaysDataset = await datasetClient.executeQuery('upcomingBirthdaysEmployees', QueryType.DATASET, {
        startDate,
        endDate,
        page: birthdaysPage,
        pageSize: birthdaysPageSize
      })
      const birthdayRows = (birthdaysDataset?.data ?? []) as UpcomingBirthdayDatasetRow[]
      const birthdaysFromDataset: EmployeeInsight[] = birthdayRows.map(row => {
        const firstName = row.first_name ?? ''
        const lastName = row.last_name ?? ''
        const fallbackName = `${firstName} ${lastName}`.trim()
        return {
          id: String(row.category ?? ''),
          firstName,
          lastName,
          fullName: row.display_name ?? fallbackName,
          birthDate: row.birth_date,
          pictureThumbnail: row.picture_thumbnail,
          jobPositionName: row.job_position_name,
          organizationalUnitName: row.organizational_unit_name
        }
      })
      setBirthdaysHasNextPage(birthdayRows.length === birthdaysPageSize)

      const anniversariesDataset = await datasetClient.executeQuery(
        'upcomingAnniversariesEmployees',
        QueryType.DATASET,
        {
          startDate,
          endDate,
          page: anniversariesPage,
          pageSize: anniversariesPageSize
        }
      )
      const anniversaryRows = (anniversariesDataset?.data ?? []) as UpcomingAnniversaryDatasetRow[]
      const anniversariesFromDataset: EmployeeInsight[] = anniversaryRows.map(row => {
        const firstName = row.first_name ?? ''
        const lastName = row.last_name ?? ''
        const fallbackName = `${firstName} ${lastName}`.trim()
        return {
          id: String(row.category ?? ''),
          firstName,
          lastName,
          fullName: row.display_name ?? fallbackName,
          hireDate: row.hire_date,
          pictureThumbnail: row.picture_thumbnail,
          jobPositionName: row.job_position_name,
          organizationalUnitName: row.organizational_unit_name
        }
      })
      setAnniversariesHasNextPage(anniversaryRows.length === anniversariesPageSize)

      const newHiresDataset = await datasetClient.executeQuery('upcomingNewHiresEmployees', QueryType.DATASET, {
        startDate,
        endDate,
        page: newHiresPage,
        pageSize: newHiresPageSize
      })
      const newHireRows = (newHiresDataset?.data ?? []) as UpcomingNewHireDatasetRow[]
      const newHiresFromDataset: EmployeeInsight[] = newHireRows.map(row => {
        const firstName = row.first_name ?? ''
        const lastName = row.last_name ?? ''
        const fallbackName = `${firstName} ${lastName}`.trim()
        return {
          id: String(row.category ?? ''),
          firstName,
          lastName,
          fullName: row.display_name ?? fallbackName,
          hireDate: row.hire_date,
          pictureThumbnail: row.picture_thumbnail,
          jobPositionName: row.job_position_name,
          organizationalUnitName: row.organizational_unit_name
        }
      })
      setNewHiresHasNextPage(newHireRows.length === newHiresPageSize)

      const probationDataset = await datasetClient.executeQuery('upcomingProbationEndsEmployees', QueryType.DATASET, {
        startDate,
        endDate,
        page: probationPage,
        pageSize: probationPageSize
      })
      const probationRows = (probationDataset?.data ?? []) as UpcomingProbationDatasetRow[]
      const probationFromDataset: EmployeeInsight[] = probationRows.map(row => {
        const firstName = row.first_name ?? ''
        const lastName = row.last_name ?? ''
        const fallbackName = `${firstName} ${lastName}`.trim()
        return {
          id: String(row.category ?? ''),
          firstName,
          lastName,
          fullName: row.display_name ?? fallbackName,
          probationEnd: row.probation_end_date,
          pictureThumbnail: row.picture_thumbnail,
          jobPositionName: row.job_position_name,
          organizationalUnitName: row.organizational_unit_name
        }
      })
      setProbationHasNextPage(probationRows.length === probationPageSize)

      const terminationsDataset = await datasetClient.executeQuery('upcomingTerminationsEmployees', QueryType.DATASET, {
        startDate,
        endDate,
        page: terminationsPage,
        pageSize: terminationsPageSize
      })
      const termRows = (terminationsDataset?.data ?? []) as UpcomingTerminationDatasetRow[]
      const terminationsFromDataset: EmployeeInsight[] = termRows.map(row => {
        const firstName = row.first_name ?? ''
        const lastName = row.last_name ?? ''
        const fallbackName = `${firstName} ${lastName}`.trim()
        return {
          id: String(row.category ?? ''),
          firstName,
          lastName,
          fullName: row.display_name ?? fallbackName,
          exitDate: row.termination_date,
          pictureThumbnail: row.picture_thumbnail,
          jobPositionName: row.job_position_name,
          organizationalUnitName: row.organizational_unit_name
        }
      })
      setTerminationsHasNextPage(termRows.length === terminationsPageSize)

      setBirthdays(birthdaysFromDataset)
      setAnniversaries(anniversariesFromDataset)
      setNewHires(newHiresFromDataset)
      setProbationEnds(probationFromDataset)
      setTerminations(terminationsFromDataset)
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
    client,
    datasetClient,
    anniversariesPage,
    anniversariesPageSize,
    newHiresPage,
    newHiresPageSize,
    probationPage,
    probationPageSize,
    terminationsPage,
    terminationsPageSize
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

  const viewOptions = [
    {
      key: 'birthdays',
      icon: <CalendarIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthdays', 'Birthdays'),
      count: birthdays.length
    },
    {
      key: 'anniversaries',
      icon: <UserIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversaries', 'Anniversaries'),
      count: anniversaries.length
    },
    {
      key: 'new-hires',
      icon: <UsersIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.new_hires', 'New Hires'),
      count: newHires.length
    },
    {
      key: 'probation-ends',
      icon: <ClockIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.probation_ends', 'Probation Ends'),
      count: probationEnds.length
    },
    {
      key: 'terminations',
      icon: <WarningCircleIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.terminations', 'Terminations'),
      count: terminations.length
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
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.no_events', 'No events in the next 30 days.')}
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
                        <MoreHorizontal className="gba:h-4 gba:w-4" />
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
    <div className="gba:p-6">
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

        <TabsContent value="birthdays" className="gba:mt-6">
          {renderEmployeeTable(
            birthdays,
            'birthDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday_date', 'Birthday')
          )}
          <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.page', 'Page')} {birthdaysPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-birthdays-prev-page"
              onClick={() => setBirthdaysPage(currentPage => Math.max(1, currentPage - 1))}
              disabled={birthdaysPage === 1}
            >
              {getTranslationFromI18nKeyAndLabel('common-previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-birthdays-next-page"
              onClick={() => setBirthdaysPage(currentPage => currentPage + 1)}
              disabled={!birthdaysHasNextPage}
            >
              {getTranslationFromI18nKeyAndLabel('common-next', 'Next')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="anniversaries" className="gba:mt-6">
          {renderEmployeeTable(
            anniversaries,
            'hireDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary')
          )}
          <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.page', 'Page')} {anniversariesPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-anniversaries-prev-page"
              onClick={() => setAnniversariesPage(currentPage => Math.max(1, currentPage - 1))}
              disabled={anniversariesPage === 1}
            >
              {getTranslationFromI18nKeyAndLabel('common-previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-anniversaries-next-page"
              onClick={() => setAnniversariesPage(currentPage => currentPage + 1)}
              disabled={!anniversariesHasNextPage}
            >
              {getTranslationFromI18nKeyAndLabel('common-next', 'Next')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="new-hires" className="gba:mt-6">
          {renderEmployeeTable(
            newHires,
            'hireDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.start_date', 'Start Date')
          )}
          <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.page', 'Page')} {newHiresPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-new-hires-prev-page"
              onClick={() => setNewHiresPage(currentPage => Math.max(1, currentPage - 1))}
              disabled={newHiresPage === 1}
            >
              {getTranslationFromI18nKeyAndLabel('common-previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-new-hires-next-page"
              onClick={() => setNewHiresPage(currentPage => currentPage + 1)}
              disabled={!newHiresHasNextPage}
            >
              {getTranslationFromI18nKeyAndLabel('common-next', 'Next')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="probation-ends" className="gba:mt-6">
          {renderEmployeeTable(
            probationEnds,
            'probationEnd',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.probation_end_date', 'Probation End')
          )}
          <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.page', 'Page')} {probationPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-probation-prev-page"
              onClick={() => setProbationPage(currentPage => Math.max(1, currentPage - 1))}
              disabled={probationPage === 1}
            >
              {getTranslationFromI18nKeyAndLabel('common-previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-probation-next-page"
              onClick={() => setProbationPage(currentPage => currentPage + 1)}
              disabled={!probationHasNextPage}
            >
              {getTranslationFromI18nKeyAndLabel('common-next', 'Next')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="terminations" className="gba:mt-6">
          {renderEmployeeTable(
            terminations,
            'exitDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.termination_date', 'Termination Date')
          )}
          <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.page', 'Page')} {terminationsPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-terminations-prev-page"
              onClick={() => setTerminationsPage(currentPage => Math.max(1, currentPage - 1))}
              disabled={terminationsPage === 1}
            >
              {getTranslationFromI18nKeyAndLabel('common-previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="hr-insights-terminations-next-page"
              onClick={() => setTerminationsPage(currentPage => currentPage + 1)}
              disabled={!terminationsHasNextPage}
            >
              {getTranslationFromI18nKeyAndLabel('common-next', 'Next')}
            </Button>
          </div>
        </TabsContent>
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
    </div>
  )
}
