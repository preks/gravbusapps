import React, { useCallback, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, DataTable } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { PlusIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useDayTypeVersionDetailsData } from '../hooks/useDayTypeVersionDetailsData'
import DayTypeDetailsForm, { APPLIED_DAYS_OPTIONS } from '@/business-apps/mdm/forms/time-attendance/DayTypeDetailsForm'
import { FieldTypeOption, TransformedDayTypeVersionDetail } from '../types/day-type-version-details'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DeleteDialog } from './DeleteDialog'

export interface DayTypeSetupProps {
  dayTypeVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
  fieldTypeOptions: FieldTypeOption[]
}

const DATA_TEST_ID_PREFIX = 'DayTypeSetup'

interface DayTypeSetupActionsCellProps {
  row: { original: TransformedDayTypeVersionDetail }
  dayTypeVersionId: string | null
  accessToken: string
  dataTestId: string
  dayTypeVersionDetails: TransformedDayTypeVersionDetail[]
  fieldTypeOptions: FieldTypeOption[]
  refetch: () => Promise<void>
  onDeleteClick: (dayTypeDetail: TransformedDayTypeVersionDetail) => void
}

const DayTypeSetupActionsCell: React.FC<DayTypeSetupActionsCellProps> = ({
  row,
  dayTypeVersionId,
  accessToken,
  dataTestId,
  dayTypeVersionDetails,
  fieldTypeOptions,
  refetch,
  onDeleteClick
}) => {
  const targetDayTypeDetail = dayTypeVersionDetails.find(dayTypeDetail => dayTypeDetail.id === row.original.id)

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <DayTypeDetailsForm
        dayTypeVersionId={dayTypeVersionId || ''}
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
        dayTypeDetails={targetDayTypeDetail}
        fieldTypeOptions={fieldTypeOptions}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={event => {
          event.stopPropagation()
          onDeleteClick(row.original)
        }}
        data-testid={formatDataTestId(dataTestId, `delete-row-button-${row.original.id}`)}
      >
        <TrashIcon className="gba:h-4 gba:w-4" />
      </Button>
    </div>
  )
}

const createActionsCellRenderer = (
  dayTypeVersionId: string | null,
  accessToken: string,
  dataTestId: string,
  dayTypeVersionDetails: TransformedDayTypeVersionDetail[],
  fieldTypeOptions: FieldTypeOption[],
  refetch: () => Promise<void>,
  onDeleteClick: (dayTypeDetail: TransformedDayTypeVersionDetail) => void
) => {
  return ({ row }: { row: { original: TransformedDayTypeVersionDetail } }) => (
    <DayTypeSetupActionsCell
      row={row}
      dayTypeVersionId={dayTypeVersionId}
      accessToken={accessToken}
      dataTestId={dataTestId}
      dayTypeVersionDetails={dayTypeVersionDetails}
      fieldTypeOptions={fieldTypeOptions}
      refetch={refetch}
      onDeleteClick={onDeleteClick}
    />
  )
}

export const DayTypeSetup: React.FC<DayTypeSetupProps> = ({
  dayTypeVersionId,
  accessToken,
  prefixDataTestId = '',
  fieldTypeOptions
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [sorting, setSorting] = useState<SortingState>([])
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [selectedDayTypeDetail, setSelectedDayTypeDetail] = useState<TransformedDayTypeVersionDetail | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch day type version details using the hook
  const { dayTypeVersionDetails, loading, error, refetch } = useDayTypeVersionDetailsData({
    accessToken,
    dayTypeVersionId: dayTypeVersionId || null
  })

  const findFieldTypeOption = (code: string) => {
    return fieldTypeOptions.find(option => option.code === code)
  }

  const findAppliedDayOption = (code: string) => {
    return APPLIED_DAYS_OPTIONS.find(option => option.code === code)
  }

  const handleDeleteDayTypeDetail = useCallback(
    async (dayTypeDetail?: TransformedDayTypeVersionDetail | null) => {
      if (!dayTypeDetail) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteDayTypeVersionDetail',
          {
            changeMode: 'DELETE',
            dayTypeVersionDetail: {
              id: dayTypeDetail.id,
              version: dayTypeDetail.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
      } catch (error) {
        console.error('Error deleting day type detail:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedDayTypeDetail(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  // Table columns
  const dayTypeSetupColumns: ColumnDef<TransformedDayTypeVersionDetail>[] = useMemo(
    () => [
      {
        accessorKey: 'fieldType',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.field_type',
          'Field Type'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const fieldTypeOption = findFieldTypeOption(row.original.fieldType)
          return fieldTypeOption?.displayValue || ''
        }
      },
      {
        accessorKey: 'appliedDay',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.applied_day',
          'Applied Day'
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const appliedDayOption = findAppliedDayOption(row.original.appliedDay)
          return appliedDayOption?.displayValue || ''
        }
      },
      {
        accessorKey: 'timeValue',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.time_value',
          'Time Value'
        ),
        enableSorting: true
      },
      {
        id: 'actions',
        header: getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions'),
        cell: createActionsCellRenderer(
          dayTypeVersionId,
          accessToken,
          dataTestId,
          dayTypeVersionDetails,
          fieldTypeOptions,
          refetch,
          dayTypeDetail => {
            setSelectedDayTypeDetail(dayTypeDetail)
            setIsDeleteDialogOpen(true)
          }
        )
      }
    ],
    [dataTestId, dayTypeVersionDetails, fieldTypeOptions, dayTypeVersionId, accessToken, refetch]
  )

  if (error) {
    return (
      <Card>
        <CardContent className="gba:py-8">
          <div className="gba:text-center gba:text-destructive">
            {`${getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_type_versions.error_loading_day_type_setup', 'Error loading day type setup')}: ${error.message}`}
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
              'master-data:hr.time_attendance.day_type_versions.day_type_setup',
              'Day Type Setup'
            )}
          </CardTitle>
          <DayTypeDetailsForm
            dayTypeVersionId={dayTypeVersionId || ''}
            accessToken={accessToken}
            prefixDataTestId={dataTestId}
            childAddButton={
              <Button
                onClick={event => event.stopPropagation()}
                disabled={!dayTypeVersionId || loading}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PlusIcon className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.actions.add_row',
                  'Add Row'
                )}
              </Button>
            }
            refetch={refetch}
            fieldTypeOptions={fieldTypeOptions}
          />
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          if (loading) {
            return (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
                <div className="gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.add_skill_form.loading_text',
                    'Loading...'
                  )}
                </div>
              </div>
            )
          }
          if (dayTypeVersionDetails.length > 0) {
            return (
              <DataTable
                data={dayTypeVersionDetails}
                columns={dayTypeSetupColumns}
                enablePagination={false}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
              />
            )
          }
          return (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <div className="gba:text-muted-foreground gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.empty_state_day_type_setup',
                  'No day type details configured yet'
                )}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.empty_state_day_type_setup_description',
                  'Click "Add Row" to create your first day type detail'
                )}
              </div>
            </div>
          )
        })()}
      </CardContent>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteDayTypeDetail(selectedDayTypeDetail)}
        isDeleting={isDeleting}
        titleKey={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.actions.delete_day_type_detail',
          'Delete Day Type Detail'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.actions.delete_day_type_detail_message',
          'Are you sure you want to delete this day type detail?'
        )}
      />
    </Card>
  )
}

export default DayTypeSetup
