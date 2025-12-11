import React, { useCallback, useMemo, useState } from 'react'
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
import { TransformedTimeType } from '../types/time-types'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { convertMinutesToHHMM } from '../utils/convertMinutesToHHMM'
import { env } from '@/common/env/EnvUtils'
import { DeleteDialog } from './DeleteDialog'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface IncrementTypeDetailsProps {
  incrementTypeVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
  timeTypes: TransformedTimeType[]
}

const DATA_TEST_ID_PREFIX = 'IncrementTypeDetails'

export const IncrementTypeDetails: React.FC<IncrementTypeDetailsProps> = ({
  incrementTypeVersionId,
  accessToken,
  prefixDataTestId = '',
  timeTypes
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [sorting, setSorting] = useState<SortingState>([])
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [selectedIncrementTypeVersionDetail, setSelectedIncrementTypeVersionDetail] =
    useState<TransformedIncrementTypeVersionDetail | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch increment type version details using the hook
  const { incrementTypeVersionDetails, loading, error, refetch } = useIncrementTypeVersionDetailsData({
    accessToken,
    incrementTypeVersionId: incrementTypeVersionId || null
  })

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

  const handleDeleteIncrementTypeVersionDetail = useCallback(
    async (incrementTypeVersionDetail?: TransformedIncrementTypeVersionDetail | null) => {
      if (!incrementTypeVersionDetail) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteIncrementTypeVersionDetail',
          {
            changeMode: 'DELETE',
            incrementTypeVersionDetail: {
              id: incrementTypeVersionDetail.id,
              version: incrementTypeVersionDetail.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
      } catch (error) {
        console.error('Error deleting increment type version detail:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedIncrementTypeVersionDetail(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  // Table columns
  const incrementTypeDetailsColumns: ColumnDef<TransformedIncrementTypeVersionDetail>[] = useMemo(
    () => [
      {
        accessorKey: 'displayOrder',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.display_order',
          'Display Order'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          return <span>{row.original.displayOrder}</span>
        }
      },
      {
        accessorKey: 'timeIssueType',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.time_issue',
          'Time Issue'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const option = findTimeIssueTypeOption(row.original.timeIssueType)
          return <Badge variant="outline">{option?.displayValue || row.original.timeIssueType}</Badge>
        }
      },
      {
        accessorKey: 'includeBreaks',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.include_breaks',
          'Include Breaks'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.includeBreaks ? <CheckIcon className="gba:h-4 gba:w-4" /> : '-'
        }
      },
      {
        accessorKey: 'fromAppliedDay',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.day_from',
          'Day From'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const option = findAppliedDayOption(row.original.fromAppliedDay)
          return option?.displayValue || row.original.fromAppliedDay
        }
      },
      {
        accessorKey: 'startTime',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.start',
          'Start'
        ),
        enableSorting: true
      },
      {
        accessorKey: 'toAppliedDate',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.day_to',
          'Day To'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const option = findAppliedDayOption(row.original.toAppliedDate)
          return option?.displayValue || row.original.toAppliedDate
        }
      },
      {
        accessorKey: 'endTime',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.to',
          'To'
        ),
        enableSorting: true
      },
      {
        accessorKey: 'sumTime',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.sum',
          'Sum'
        ),
        enableSorting: true
      },
      {
        accessorKey: 'timeTypeId',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.time_type',
          'Time Type'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const timeType = findTimeType(row.original.timeTypeId)
          return timeType ? `${timeType.code} - ${timeType.name}` : 'N/A'
        }
      },
      {
        accessorKey: 'incrementCalculationType',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.calculation',
          'Calculation'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const option = findCalculationTypeOption(row.original.incrementCalculationType)
          return <Badge variant="outline">{option?.displayValue || row.original.incrementCalculationType}</Badge>
        }
      },
      {
        accessorKey: 'fixedValue',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.value',
          'Value'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          if (row.original.fixedValue === null) {
            return '-'
          }
          // Convert minutes to HH:MM format for display
          const formattedValue = convertMinutesToHHMM(row.original.fixedValue)
          return formattedValue || '-'
        }
      },
      {
        accessorKey: 'checkStartBefore',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.check_start_before',
          'Start Before'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.checkStartBefore ? <CheckIcon className="gba:h-4 gba:w-4" /> : '-'
        }
      },
      {
        accessorKey: 'startBeforeTime',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.start_before_time',
          'Start Before Time'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.startBeforeTime || '-'
        }
      },
      {
        accessorKey: 'includeExcludeOption',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.include_exclude_option',
          'Include Exclude Option'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const option = findIncludeExcludeOption(row.original.includeExcludeOption)
          return <Badge variant="outline">{option?.displayValue || row.original.includeExcludeOption}</Badge>
        }
      },
      {
        accessorKey: 'alternativeIncrementTypeVersionDetailId',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.alternative_to',
          'Alternative to'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          if (!row.original.alternativeIncrementTypeVersionDetailId) {
            return 'None'
          }
          // Find the alternative detail and show its displayOrder
          const alternativeDetail = incrementTypeVersionDetails.find(
            detail => detail.id === row.original.alternativeIncrementTypeVersionDetailId
          )
          return alternativeDetail ? alternativeDetail.displayOrder : 'N/A'
        }
      },
      {
        id: 'actions',
        header: getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions'),
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
                timeTypes={timeTypes}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={event => {
                  event.stopPropagation()
                  setSelectedIncrementTypeVersionDetail(row.original)
                  setIsDeleteDialogOpen(true)
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
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.error_loading_details',
              'Error loading increment type details:'
            )}{' '}
            {error.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.increment_details',
              'Increment Details'
            )}
          </CardTitle>
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
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.increment_type_versions.actions.add_row',
                  'Add Row'
                )}
              </Button>
            }
            refetch={refetch}
            availableIncrementTypeDetails={incrementTypeVersionDetails}
            timeTypes={timeTypes}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('translation:common.loading', 'Loading...')}
            </div>
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
            <div className="gba:text-muted-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_type_versions.empty_state',
                'No increment details configured yet'
              )}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_type_versions.empty_state_description',
                'Click "Add Row" to create your first increment detail'
              )}
            </div>
          </div>
        )}
      </CardContent>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteIncrementTypeVersionDetail(selectedIncrementTypeVersionDetail)}
        isDeleting={isDeleting}
        titleKey={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_details.actions.delete_increment_type_detail',
          'Delete Increment Type Detail'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_details.actions.delete_increment_type_detail_message',
          'Are you sure you want to delete this increment type detail?'
        )}
      />
    </Card>
  )
}

export default IncrementTypeDetails
