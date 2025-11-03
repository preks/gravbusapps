import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, DataTable, Badge } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { PlusIcon, PencilSimpleLineIcon, TrashIcon, CheckIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useIncrementTypeVersionDetailsData } from '../hooks/useIncrementTypeVersionDetailsData'
import IncrementTypeDetailsForm, {
  APPLIED_DAYS_OPTIONS,
  TIME_ISSUE_TYPE_OPTIONS,
  INCREMENT_CALCULATION_TYPE_OPTIONS,
  INCLUDE_EXCLUDE_OPTIONS
} from '@/business-apps/mdm/forms/time-attendance/IncrementTypeDetailsForm'
import { TransformedIncrementTypeVersionDetail } from '../types/increment-type-version-details'
import { useTimeTypesData } from '../hooks/useTimeTypesData'

export interface IncrementTypeDetailsProps {
  incrementTypeVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'IncrementTypeDetails'

export const IncrementTypeDetails: React.FC<IncrementTypeDetailsProps> = ({
  incrementTypeVersionId,
  accessToken,
  prefixDataTestId = ''
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [sorting, setSorting] = useState<SortingState>([])

  // Fetch increment type version details using the hook
  const { incrementTypeVersionDetails, loading, error, refetch } = useIncrementTypeVersionDetailsData({
    accessToken,
    incrementTypeVersionId: incrementTypeVersionId || null
  })

  // Fetch time types for display
  const { timeTypes } = useTimeTypesData({ accessToken })

  const findTimeIssueTypeOption = (code: string) => {
    return TIME_ISSUE_TYPE_OPTIONS.find(option => option.code === code)
  }

  const findAppliedDayOption = (code: string) => {
    return APPLIED_DAYS_OPTIONS.find(option => option.code === code)
  }

  const findTimeType = (timeTypeId: string) => {
    return timeTypes.find(timeType => timeType.id === timeTypeId)
  }

  const findCalculationTypeOption = (code: string) => {
    return INCREMENT_CALCULATION_TYPE_OPTIONS.find(option => option.code === code)
  }

  const findIncludeExcludeOption = (code: string) => {
    return INCLUDE_EXCLUDE_OPTIONS.find(option => option.code === code)
  }

  // Table columns
  const incrementTypeDetailsColumns: ColumnDef<TransformedIncrementTypeVersionDetail>[] = useMemo(
    () => [
      {
        accessorKey: 'displayOrder',
        header: 'Display Order',
        enableSorting: true,
        cell: ({ row }) => {
          return <span>{row.original.displayOrder}</span>
        }
      },
      {
        accessorKey: 'timeIssueType',
        header: 'Time Issue',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findTimeIssueTypeOption(row.original.timeIssueType)
          return <Badge variant="outline">{option?.displayValue || row.original.timeIssueType}</Badge>
        }
      },
      {
        accessorKey: 'includeBreaks',
        header: 'Include Breaks',
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.includeBreaks ? <CheckIcon className="gba:h-4 gba:w-4" /> : '-'
        }
      },
      {
        accessorKey: 'fromAppliedDay',
        header: 'Day From',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findAppliedDayOption(row.original.fromAppliedDay)
          return option?.displayValue || row.original.fromAppliedDay
        }
      },
      {
        accessorKey: 'startTime',
        header: 'Start',
        enableSorting: true
      },
      {
        accessorKey: 'toAppliedDate',
        header: 'Day To',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findAppliedDayOption(row.original.toAppliedDate)
          return option?.displayValue || row.original.toAppliedDate
        }
      },
      {
        accessorKey: 'endTime',
        header: 'To',
        enableSorting: true
      },
      {
        accessorKey: 'sumTime',
        header: 'Sum',
        enableSorting: true
      },
      {
        accessorKey: 'timeTypeId',
        header: 'Time Type',
        enableSorting: true,
        cell: ({ row }) => {
          const timeType = findTimeType(row.original.timeTypeId)
          return timeType ? `${timeType.code} - ${timeType.name}` : 'N/A'
        }
      },
      {
        accessorKey: 'incrementCalculationType',
        header: 'Calculation',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findCalculationTypeOption(row.original.incrementCalculationType)
          return <Badge variant="outline">{option?.displayValue || row.original.incrementCalculationType}</Badge>
        }
      },
      {
        accessorKey: 'fixedValue',
        header: 'Value',
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.fixedValue !== null ? row.original.fixedValue.toString() : '-'
        }
      },
      {
        accessorKey: 'includeExcludeOption',
        header: 'Include Exclude Option',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findIncludeExcludeOption(row.original.includeExcludeOption)
          return <Badge variant="outline">{option?.displayValue || row.original.includeExcludeOption}</Badge>
        }
      },
      {
        accessorKey: 'alternativeIncrementTypeVersionDetailId',
        header: 'Alternative to',
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.alternativeIncrementTypeVersionDetailId || 'None'
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const targetDetail = incrementTypeVersionDetails.find(detail => detail.id === row.original.id)

          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <IncrementTypeDetailsForm
                incrementTypeVersionId={incrementTypeVersionId || ''}
                accessToken={accessToken}
                prefixDataTestId={dataTestId}
                childAddButton={
                  <Button
                    onClick={event => event.stopPropagation()}
                    variant="ghost"
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <PencilSimpleLineIcon />
                  </Button>
                }
                refetch={refetch}
                incrementTypeDetails={targetDetail}
                availableIncrementTypeDetails={incrementTypeVersionDetails}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Implement delete functionality
                }}
                data-testid={formatDataTestId(dataTestId, `delete-row-button-${row.original.id}`)}
              >
                <TrashIcon className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          )
        }
      }
    ],
    [dataTestId, incrementTypeVersionDetails, incrementTypeVersionId, accessToken, timeTypes, refetch]
  )

  if (error) {
    return (
      <Card>
        <CardContent className="gba:py-8">
          <div className="gba:text-center gba:text-destructive">
            Error loading increment type details: {error.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle>Increment Details</CardTitle>
          <IncrementTypeDetailsForm
            incrementTypeVersionId={incrementTypeVersionId || ''}
            accessToken={accessToken}
            prefixDataTestId={dataTestId}
            childAddButton={
              <Button
                onClick={event => event.stopPropagation()}
                disabled={!incrementTypeVersionId || loading}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PlusIcon className="gba:h-4 gba:w-4" />
                Add Row
              </Button>
            }
            refetch={refetch}
            availableIncrementTypeDetails={incrementTypeVersionDetails}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">Loading...</div>
          </div>
        ) : incrementTypeVersionDetails.length > 0 ? (
          <DataTable
            data={incrementTypeVersionDetails}
            columns={incrementTypeDetailsColumns}
            enablePagination={false}
            sorting={sorting}
            onSortingChange={setSorting}
            enableSorting
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-muted-foreground gba:mb-2">No increment details configured yet</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              Click "Add Row" to create your first increment detail
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default IncrementTypeDetails
