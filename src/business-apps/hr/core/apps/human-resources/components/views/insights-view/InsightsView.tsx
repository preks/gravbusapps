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
import { format, addDays, isWithinInterval, parseISO, differenceInYears } from 'date-fns'
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

const GET_EMPLOYEE_INSIGHTS = `
query GetEmployeeInsights($asOf: timestamp!) {
  EmployeePosition(
    where: {
      _and: [
        { _or: [{ hireDate: { _lte: $asOf } }, { hireDate: { _isNull: true } }] }
        { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: $asOf } }] }
        { employee: { isDeleted: { _eq: false } } }
      ]
    }
    orderBy: { createdAt: DESC }
  ) {
    employee {
      id
      firstName
      lastName
      fullName
      birthDate
      pictureThumbnail
      workingCondition(
        where: {
          _and: [
            { _or: [{ hireDate: { _lte: $asOf } }, { hireDate: { _isNull: true } }] }
            { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: $asOf } }] }
            { isDeleted: { _eq: false } }
          ]
        }
        limit: 1
        orderBy: { createdAt: DESC }
      ) {
        hireDate
        probationEnd
        exitDate
        contractStatus
      }
    }
    organizationalUnit { name, companyId, company { id, name } }
    jobPosition { name }
  }
}
`

export const InsightsView: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [birthdays, setBirthdays] = useState<EmployeeInsight[]>([])
  const [anniversaries, setAnniversaries] = useState<EmployeeInsight[]>([])
  const [newHires, setNewHires] = useState<EmployeeInsight[]>([])
  const [probationEnds, setProbationEnds] = useState<EmployeeInsight[]>([])
  const [terminations, setTerminations] = useState<EmployeeInsight[]>([])
  const [generateDocEmployee, setGenerateDocEmployee] = useState<EmployeeInsight | null>(null)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)

  const client = useGraphqlClient(accessToken)

  const entityDataMapForDoc = useMemo(() => {
    if (!generateDocEmployee) return {}
    return {
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
  }, [generateDocEmployee])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const asOf = new Date().toISOString()
      const data: any = await client.request(GET_EMPLOYEE_INSIGHTS, { asOf })
      const now = new Date()
      const employees = (data.EmployeePosition || [])
        .map((ep: any) => ({
          id: ep.employee?.id,
          firstName: ep.employee?.firstName,
          lastName: ep.employee?.lastName,
          fullName: ep.employee?.fullName,
          birthDate: ep.employee?.birthDate,
          contract_status: ep.employee?.workingCondition?.[0]?.contractStatus,
          pictureThumbnail: ep.employee?.pictureThumbnail,
          hireDate: ep.employee?.workingCondition?.[0]?.hireDate,
          probationEnd: ep.employee?.workingCondition?.[0]?.probationEnd,
          exitDate: ep.employee?.workingCondition?.[0]?.exitDate,
          jobPositionName: ep.jobPosition?.name,
          organizationalUnitName: ep.organizationalUnit?.name,
          companyName: ep.organizationalUnit?.company?.name
        }))
        // Active-as-of safeguard (server already filters positions)
        .filter((emp: any) => {
          const hireOk = !emp.hireDate || parseISO(emp.hireDate) <= now
          const exitOk = !emp.exitDate || parseISO(emp.exitDate) > now
          const notInactiveWithExit = !(emp.exitDate && String(emp.contract_status || '').toUpperCase() === 'INACTIVE')
          return hireOk && exitOk && notInactiveWithExit
        })

      const today = new Date()
      const startWindow = addDays(today, -30)
      const endWindow = addDays(today, 30)

      const upcomingBirthdays: EmployeeInsight[] = []
      const upcomingAnniversaries: EmployeeInsight[] = []
      const upcomingNewHires: EmployeeInsight[] = []
      const upcomingProbationEnds: EmployeeInsight[] = []
      const upcomingTerminations: EmployeeInsight[] = []

      employees.forEach((emp: EmployeeInsight) => {
        // Birthdays (future 30 only)
        if (emp.birthDate) {
          const birthDate = parseISO(emp.birthDate)
          const nextOcc = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
          const next =
            nextOcc < today ? new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate()) : nextOcc
          if (isWithinInterval(next, { start: today, end: endWindow })) upcomingBirthdays.push(emp)
        }

        // Anniversaries (future 30 only)
        if (emp.hireDate) {
          const hireDate = parseISO(emp.hireDate)
          const nextOcc = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate())
          const next =
            nextOcc < today ? new Date(today.getFullYear() + 1, hireDate.getMonth(), hireDate.getDate()) : nextOcc
          if (isWithinInterval(next, { start: today, end: endWindow })) upcomingAnniversaries.push(emp)
        }

        // New Hires (start date in next 30 days)
        if (emp.hireDate) {
          const hireDate = parseISO(emp.hireDate)
          if (isWithinInterval(hireDate, { start: startWindow, end: endWindow })) {
            upcomingNewHires.push(emp)
          }
        }

        // Probation Ends (probationEnd in next 30 days)
        if (emp.probationEnd) {
          const probationEndDate = parseISO(emp.probationEnd)
          if (isWithinInterval(probationEndDate, { start: startWindow, end: endWindow })) {
            upcomingProbationEnds.push(emp)
          }
        }

        // Terminations (exitDate in next 30 days)
        if (emp.exitDate) {
          const exitDate = parseISO(emp.exitDate)
          if (isWithinInterval(exitDate, { start: startWindow, end: endWindow })) {
            upcomingTerminations.push(emp)
          }
        }
      })

      // Sort helpers
      const getBirthdayDateForSort = (dateStr: string): Date => {
        const birthDate = parseISO(dateStr)
        const nextOcc = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        return nextOcc < today ? new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate()) : nextOcc
      }

      const getAnniversaryDateForSort = (dateStr: string): Date => {
        const hireDate = parseISO(dateStr)
        const nextOcc = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate())
        return nextOcc < today ? new Date(today.getFullYear() + 1, hireDate.getMonth(), hireDate.getDate()) : nextOcc
      }

      upcomingBirthdays.sort((a, b) => {
        if (!a.birthDate || !b.birthDate) return 0
        return getBirthdayDateForSort(a.birthDate).getTime() - getBirthdayDateForSort(b.birthDate).getTime()
      })

      upcomingAnniversaries.sort((a, b) => {
        if (!a.hireDate || !b.hireDate) return 0
        return getAnniversaryDateForSort(a.hireDate).getTime() - getAnniversaryDateForSort(b.hireDate).getTime()
      })

      upcomingNewHires.sort((a, b) => {
        if (!a.hireDate || !b.hireDate) return 0
        return parseISO(a.hireDate).getTime() - parseISO(b.hireDate).getTime()
      })

      upcomingProbationEnds.sort((a, b) => {
        if (!a.probationEnd || !b.probationEnd) return 0
        return parseISO(a.probationEnd).getTime() - parseISO(b.probationEnd).getTime()
      })

      upcomingTerminations.sort((a, b) => {
        if (!a.exitDate || !b.exitDate) return 0
        return parseISO(a.exitDate).getTime() - parseISO(b.exitDate).getTime()
      })

      setBirthdays(upcomingBirthdays)
      setAnniversaries(upcomingAnniversaries)
      setNewHires(upcomingNewHires)
      setProbationEnds(upcomingProbationEnds)
      setTerminations(upcomingTerminations)
    } catch (err: any) {
      setError(
        err.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.failed_to_fetch', 'Failed to fetch insights data')
      )
      console.error('Error fetching insights data:', err)
    } finally {
      setLoading(false)
    }
  }, [client])

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
        </TabsContent>

        <TabsContent value="anniversaries" className="gba:mt-6">
          {renderEmployeeTable(
            anniversaries,
            'hireDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary')
          )}
        </TabsContent>

        <TabsContent value="new-hires" className="gba:mt-6">
          {renderEmployeeTable(
            newHires,
            'hireDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.start_date', 'Start Date')
          )}
        </TabsContent>

        <TabsContent value="probation-ends" className="gba:mt-6">
          {renderEmployeeTable(
            probationEnds,
            'probationEnd',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.probation_end_date', 'Probation End')
          )}
        </TabsContent>

        <TabsContent value="terminations" className="gba:mt-6">
          {renderEmployeeTable(
            terminations,
            'exitDate',
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.termination_date', 'Termination Date')
          )}
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
