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
import { useDayTypeVersionDetailsData } from '../hooks/useDayTypeVersionDetailsData'
import { useDayTypeDetailRows } from '../hooks/useDayTypeDetailRows'
import { FieldTypeOption } from '../types/day-type-version-details'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DeleteDialog } from './DeleteDialog'

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

  // Fetch day type version details
  const { dayTypeVersionDetails, loading, error, refetch } = useDayTypeVersionDetailsData({
    accessToken,
    dayTypeVersionId: dayTypeVersionId || null
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
  } = useDayTypeDetailRows({
    details: dayTypeVersionDetails,
    fieldTypeOptions,
    dayTypeVersionId,
    accessToken,
    onRefetch: refetch,
    dataTestId
  })

  // Memoized columns - fixed widths to prevent flicker
  const tableColumns = useMemo(
    () => (
      <>
        <TableHead className="gba:w-[35%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_type_versions.field_type',
            'Field Type'
          )}
        </TableHead>
        <TableHead className="gba:w-[25%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_type_versions.applied_day',
            'Applied Day'
          )}
        </TableHead>
        <TableHead className="gba:w-[20%]">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_type_versions.time_value',
            'Time Value'
          )}
        </TableHead>
        <TableHead className="gba:w-[20%]">
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
          <Button
            onClick={handleAddRow}
            disabled={!dayTypeVersionId || loading || isAddingNewRow}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={formatDataTestId(dataTestId, 'add-row-button')}
          >
            <PlusIcon className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.actions.add_row',
              'Add Row'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.loading_text',
                'Loading...'
              )}
            </div>
          </div>
        ) : dayTypeVersionDetails.length === 0 && !isAddingNewRow ? (
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
        ) : (
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{tableColumns}</TableRow>
              </TableHeader>
              <TableBody>
                {dayTypeVersionDetails.map(renderDataRow)}
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
