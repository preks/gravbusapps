import React, { useState, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PayGrade, JobLevelGroup, JobLevel } from './PayGradesTab'
import { useCompensationDataIntegration } from '../../hooks/useCompensationDataIntegration'
import {
  Card,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Accordion,
  DataTable,
  Input
} from '@newwork/nw-design-system'
import { CardTabHeaderComponent } from '../../../generic-components/card/CardTabHeaderComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  UsersIcon,
  ArrowsDownUpIcon,
  EyeIcon,
  CreditCardIcon,
  CurrencyCircleDollarIcon,
  BankIcon,
  GaugeIcon,
  InfoIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { ColumnDef } from '@tanstack/react-table'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { SortingState } from '@tanstack/react-table'

export interface CareerBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

interface JobLevelDetail extends JobLevel {
  payGrade: PayGrade
  jobLevelGroup: JobLevelGroup
  range: number
  nameI18n?: Record<string, string>
  descriptionI18n?: Record<string, string>
  version: number
  payGradeId: string
  jobLevelGroupId: string
  code: string
  level: number
  hierarchyOrder: number
  displayName: string
}

const DATA_TEST_ID_PREFIX = 'CareerBandsTab'

const CareerBandsTab: React.FC<CareerBandsTabProps> = context => {
  const { prefixDataTestId, userInfo } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // State for drawer
  const [selectedJobLevelDetail, setSelectedJobLevelDetail] = useState<JobLevelDetail | null>(null)
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const [selectedRows, setSelectedRows] = useState<any[]>([])

  // Use real data integration
  const { payGrades, jobLevelGroups, jobLevels, isLoading, error, refetch } = useCompensationDataIntegration(context)

  useEffect(() => {
    if (selectedJobLevelDetail) {
      const newJobLevel = getJobLevelDetails(selectedJobLevelDetail.jobLevelGroupId)
      const targetJobLevel = newJobLevel.find(jl => jl.id === selectedJobLevelDetail.id)
      if (targetJobLevel) {
        setSelectedJobLevelDetail(targetJobLevel)
      }
    }
  }, [jobLevels])

  const formatCurrency = (amount: number, currency?: { id: string; value: string } | string) => {
    let currencyCode = typeof currency === 'string' ? currency : (currency?.id ?? 'EUR')

    // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
    if (currencyCode.includes(':')) {
      const parts = currencyCode.split(':')
      currencyCode = parts[parts.length - 1] // Get the last part
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const filteredData = useMemo(() => {
    return jobLevelGroups.filter(
      group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.code?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [jobLevelGroups, searchTerm])

  const getJobLevelDetails = (groupId: string): JobLevelDetail[] => {
    const group = jobLevelGroups.find(g => g.id === groupId)
    if (!group) return []

    return jobLevels
      .filter(jl => jl.jobLevelGroupId === groupId)
      .map(jobLevel => {
        const payGrade = payGrades.find(pg => pg.id === jobLevel.payGradeId)
        if (!payGrade) return null

        return {
          ...jobLevel,
          payGrade,
          jobLevelGroup: group,
          range: payGrade.maxSalary - payGrade.minSalary
        }
      })
      .filter(Boolean) as JobLevelDetail[]
  }

  const getGroupSummary = (groupId: string) => {
    const details = getJobLevelDetails(groupId)
    if (details.length === 0) return null

    const minSalary = Math.min(...details.map(d => d.payGrade.minSalary))
    const maxSalary = Math.max(...details.map(d => d.payGrade.maxSalary))
    const currency = details[0]?.payGrade.currency ?? 'EUR'

    return {
      groupCount: details.length,
      salaryRange: `${formatCurrency(minSalary, currency)} - ${formatCurrency(maxSalary, currency)}`
    }
  }

  const drawerItems = useMemo(() => {
    if (!selectedJobLevelDetail) return []

    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        items: [
          {
            label: 'Name',
            value: selectedJobLevelDetail.name ?? '-'
          },
          {
            label: 'Code',
            value: selectedJobLevelDetail.code ?? '-'
          },
          {
            label: 'Pay Grade',
            value: selectedJobLevelDetail.payGrade?.code ?? '-'
          },
          {
            label: 'Job Group',
            value: selectedJobLevelDetail.jobLevelGroup?.name ?? '-'
          }
        ]
      },
      {
        icon: <InfoIcon />,
        title: 'Compensation Details',
        items: [
          {
            label: 'Currency',
            value:
              selectedJobLevelDetail.payGrade?.currency?.value ?? selectedJobLevelDetail.payGrade?.currency?.id ?? '-'
          },
          {
            label: 'Minimum Salary',
            value: formatCurrency(
              selectedJobLevelDetail.payGrade?.minSalary ?? 0,
              selectedJobLevelDetail.payGrade?.currency
            )
          },
          {
            label: 'Standard Salary',
            value: formatCurrency(
              selectedJobLevelDetail.payGrade?.standardSalary ?? 0,
              selectedJobLevelDetail.payGrade?.currency
            )
          },
          {
            label: 'Maximum Salary',
            value: formatCurrency(
              selectedJobLevelDetail.payGrade?.maxSalary ?? 0,
              selectedJobLevelDetail.payGrade?.currency
            )
          },
          {
            label: 'Salary Range',
            value: formatCurrency(selectedJobLevelDetail.range ?? 0, selectedJobLevelDetail.payGrade?.currency)
          }
        ]
      },
      {
        icon: <InfoIcon />,
        title: 'Additional Details',
        items: [
          {
            label: 'Category',
            value: selectedJobLevelDetail.jobLevelGroup?.category ?? '-'
          },
          {
            label: 'Hierarchy Order',
            value: selectedJobLevelDetail.hierarchyOrder ?? '-'
          },
          {
            label: 'Level',
            value: selectedJobLevelDetail.level ?? '-'
          }
        ]
      }
    ]
  }, [selectedJobLevelDetail])

  const navigationItems = useMemo(() => {
    if (!selectedJobLevelDetail) return []

    return [
      {
        redirectLink: `/mdm/compensation-data/pay-grades/${selectedJobLevelDetail.payGradeId}`,
        color: 'blue',
        icon: CurrencyCircleDollarIcon,
        title: selectedJobLevelDetail.payGrade?.name ?? 'Pay Grade Details',
        description: 'View complete pay grade information, salary structures and related job positions'
      },
      {
        redirectLink: `/mdm/compensation-data/compensation-bands/${selectedJobLevelDetail.compensationBandId}`,
        color: 'green',
        icon: BankIcon,
        title: 'Compensation Band Details',
        description: 'View complete compensation band structure, range analysis and market comparisons'
      },
      {
        redirectLink: `/mdm/compensation-data/job-level-groups/${selectedJobLevelDetail.jobLevelGroupId}`,
        color: 'purple',
        icon: UsersIcon,
        title: selectedJobLevelDetail.jobLevelGroup?.name ?? 'Job Level Group',
        description: `View all positions within ${
          selectedJobLevelDetail.jobLevelGroup?.name ?? 'this group'
        }, career progression paths, and requirements`
      },
      {
        redirectLink: `/mdm/organizational-data?structure=${selectedJobLevelDetail.id}`,
        color: 'orange',
        icon: GaugeIcon,
        title: 'Organizational Positions',
        description: ` View organizational units and positions with ${selectedJobLevelDetail.name} level`
      }
    ]
  }, [selectedJobLevelDetail])

  const renderJobLevelsTable = (groupId: string) => {
    const groupJobLevels = getJobLevelDetails(groupId)

    const columns: ColumnDef<JobLevelDetail>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const levelName = getValue()
          return (levelName as string) ?? 'N/A'
        }
      },
      {
        accessorKey: 'payGrade',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Pay Grade
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const payGrade = getValue()
          return (payGrade as string) ?? 'N/A'
        }
      },
      {
        accessorKey: 'minSalary',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Minimum
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const minSalary = getValue()
          return (minSalary as string) ?? 'N/A'
        }
      },
      {
        accessorKey: 'standardSalary',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Standard
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const standardSalary = getValue()
          return (standardSalary as string) ?? 'N/A'
        }
      },
      {
        accessorKey: 'maxSalary',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Maximum
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const maxSalary = getValue()
          return (maxSalary as string) ?? 'N/A'
        }
      },
      {
        accessorKey: 'range',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Range
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const range = getValue()
          return (range as string) ?? 'N/A'
        }
      },
      {
        id: 'actions',
        header: () => <div className="gba:flex gba:w-[65px]">Actions</div>,
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRowClick(row.original)}
            data-testid={`${dataTestId}-view-contract-type-${row.original.id}`}
          >
            <EyeIcon className="gba:h-4 gba:w-4" />
          </Button>
        )
      }
    ]

    const dataTable = groupJobLevels.map(jobLevel => ({
      ...jobLevel,
      id: jobLevel.id,
      name: jobLevel.name,
      payGrade: jobLevel.payGrade.code,
      minSalary: jobLevel.payGrade.minSalary,
      standardSalary: jobLevel.payGrade.standardSalary,
      maxSalary: jobLevel.payGrade.maxSalary,
      range: jobLevel.range
    }))

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
        sorting={sorting}
        onSortingChange={setSorting}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        enableSorting
        enableSelection
        enablePagination
      />
    )
  }

  const groupItems = useMemo(
    () =>
      filteredData.map(group => {
        const summary = getGroupSummary(group.id)

        return {
          id: group.id,
          title: group.name,
          description: summary ? summary.salaryRange : 'No data',
          badgeText: `${summary?.groupCount ?? 0} levels`,
          badgeVariant: 'info' as const,
          contentDescription: group.description,
          content: <div className="gba:space-y-4">{renderJobLevelsTable(group.id)}</div>
        }
      }),
    [
      jobLevelGroups,
      filteredData,
      userInfo?.employeeDetails.employeeId,
      refetch,
      context.accessToken,
      dataTestId,
      payGrades
    ]
  )

  if (jobLevelGroups.length === 0 && isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-CareerBandsTab`}
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-CareerBandsTab`} className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Data
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Handle row click to show details drawer
  const handleRowClick = (record: JobLevelDetail) => {
    setSelectedJobLevelDetail(record)
    setDrawerVisible(true)
  }

  return (
    <Card data-testid={`${prefixDataTestId}-CareerBandsTab`}>
      <CardTabHeaderComponent
        cardTitle="Career Band Details"
        cardDescription="Detailed breakdown of compensation ranges for each career band and
            group"
      />

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search career bands..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:pl-10"
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        {jobLevelGroups.length === 0 && !isLoading ? (
          <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <UsersIcon className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
            <h1 className="gba:font-bold gba:text-xl">No Job Level Groups Found</h1>
          </div>
        ) : (
          <Accordion
            className="gba:w-full"
            value={accordionValue}
            onValueChange={value => setAccordionValue(value)}
            items={groupItems}
          />
        )}

        {selectedJobLevelDetail && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedJobLevelDetail(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Compensation Band Details"
            titleIcon={CreditCardIcon}
            drawerItems={drawerItems}
            navigationItems={navigationItems}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CareerBandsTab
export { CareerBandsTab }
