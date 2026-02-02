import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  TableRow,
  TableHead,
  Table,
  TableHeader,
  TableBody
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useIncrementTypeVersionDetailsData } from '../hooks/useIncrementTypeVersionDetailsData'
import { useIncrementTypeDetailRows } from '../hooks/useIncrementTypeDetailRows'
import { TransformedTimeType } from '../types/time-types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DeleteDialog } from './DeleteDialog'

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

  // Fetch increment type version details
  const { incrementTypeVersionDetails, loading, error, refetch } = useIncrementTypeVersionDetailsData({
    accessToken,
    incrementTypeVersionId: incrementTypeVersionId || null
  })

  // Use the hook for row management
  const {
    isAddingNewRow,
    handleAddRow,
    renderDataRow,
    renderNewRow,
    // Delete dialog state
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleConfirmDelete,
    isDeleting
  } = useIncrementTypeDetailRows({
    details: incrementTypeVersionDetails,
    timeTypes,
    incrementTypeVersionId,
    accessToken,
    onRefetch: refetch,
    dataTestId
  })

  // Memoized columns
  const tableColumns = useMemo(
    () => (
      <>
        <TableHead className="gba:w-[5%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.display_order',
            'Priority'
          )}
        </TableHead>
        <TableHead className="gba:w-[10%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.time_issue',
            'Time Issue'
          )}
        </TableHead>
        <TableHead className="gba:w-[4%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.include_breaks',
            'Breaks'
          )}
        </TableHead>
        <TableHead className="gba:w-[6%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.day_from',
            'Day From'
          )}
        </TableHead>
        <TableHead className="gba:w-[6%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.start',
            'Start'
          )}
        </TableHead>
        <TableHead className="gba:w-[6%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.day_to',
            'Day To'
          )}
        </TableHead>
        <TableHead className="gba:w-[5%]">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.increment_type_versions.fields.to', 'To')}
        </TableHead>
        <TableHead className="gba:w-[5%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.sum',
            'Sum'
          )}
        </TableHead>
        <TableHead className="gba:w-[12%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.time_type',
            'Time Type'
          )}
        </TableHead>
        <TableHead className="gba:w-[8%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.calculation',
            'Calculation'
          )}
        </TableHead>
        <TableHead className="gba:w-[5%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.value',
            'Value'
          )}
        </TableHead>
        <TableHead className="gba:w-[4%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.check_start_before',
            'Start Before'
          )}
        </TableHead>
        <TableHead className="gba:w-[6%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.start_before_time',
            'Before Time'
          )}
        </TableHead>
        <TableHead className="gba:w-[6%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.alternative_to',
            'Alt To'
          )}
        </TableHead>
        <TableHead className="gba:w-[6%]">
          {getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions')}
        </TableHead>
      </>
    ),
    []
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
          <Button
            onClick={handleAddRow}
            disabled={!incrementTypeVersionId || loading || isAddingNewRow}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={formatDataTestId(dataTestId, 'add-row-button')}
          >
            <PlusIcon className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.actions.add_row',
              'Add Row'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('translation:common.loading', 'Loading...')}
            </div>
          </div>
        ) : incrementTypeVersionDetails.length === 0 && !isAddingNewRow ? (
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
        ) : (
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{tableColumns}</TableRow>
              </TableHeader>
              <TableBody>
                {incrementTypeVersionDetails.map(renderDataRow)}
                {renderNewRow()}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
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
