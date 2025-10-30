import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, DataTable } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { PlusIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useDayTypeVersionDetailsData } from '../hooks/useDayTypeVersionDetailsData'
import DayTypeDetailsForm, { APPLIED_DAYS_OPTIONS } from '@/business-apps/mdm/forms/time-attendance/DayTypeDetailsForm'
import { FieldTypeOption, TransformedDayTypeVersionDetail } from '../types/day-type-version-details'

export interface DayTypeSetupProps {
  dayTypeVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
  fieldTypeOptions: FieldTypeOption[]
}

const DATA_TEST_ID_PREFIX = 'DayTypeSetup'

export const DayTypeSetup: React.FC<DayTypeSetupProps> = ({
  dayTypeVersionId,
  accessToken,
  prefixDataTestId = '',
  fieldTypeOptions
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [sorting, setSorting] = useState<SortingState>([])

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

  // Table columns
  const dayTypeSetupColumns: ColumnDef<TransformedDayTypeVersionDetail>[] = useMemo(
    () => [
      {
        accessorKey: 'fieldType',
        header: 'Field Type',
        enableSorting: true,
        cell: ({ row }) => {
          const fieldTypeOption = findFieldTypeOption(row.original.fieldType)
          return fieldTypeOption?.displayValue || ''
        }
      },
      {
        accessorKey: 'appliedDay',
        header: 'Applied Day',
        enableSorting: true,
        cell: ({ row }) => {
          const appliedDayOption = findAppliedDayOption(row.original.appliedDay)
          return appliedDayOption?.displayValue || ''
        }
      },
      {
        accessorKey: 'timeValue',
        header: 'Time Value',
        enableSorting: true
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
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
    [dataTestId, dayTypeVersionDetails]
  )

  if (error) {
    return (
      <Card>
        <CardContent className="gba:py-8">
          <div className="gba:text-center gba:text-destructive">Error loading day type setup: {error.message}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle>Day Type Setup</CardTitle>
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
                Add Row
              </Button>
            }
            refetch={refetch}
            fieldTypeOptions={fieldTypeOptions}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">Loading...</div>
          </div>
        ) : dayTypeVersionDetails.length > 0 ? (
          <DataTable
            data={dayTypeVersionDetails}
            columns={dayTypeSetupColumns}
            enablePagination={false}
            sorting={sorting}
            onSortingChange={setSorting}
            enableSorting
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-muted-foreground gba:mb-2">No day type details configured yet</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              Click "Add Row" to create your first day type detail
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DayTypeSetup
