import React, { useCallback, useMemo, useState } from 'react'
import { TableRow, TableCell, Input, Combobox } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { RowActionsCell } from '@/components/table-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { FieldTypeOption, TransformedDayTypeVersionDetail } from '../types/day-type-version-details'
import { APPLIED_DAYS_OPTIONS, dayTypeDetailRowSchema, DayTypeDetailRowFormData } from '../constants/day-type-constants'
import { FieldErrorTooltip } from '../components/FieldErrorTooltip'
import { RequiredIndicator } from '../components'

// Special key for new row
const NEW_ROW_KEY = '__new__'

export interface UseDayTypeDetailRowsProps {
  details: TransformedDayTypeVersionDetail[]
  fieldTypeOptions: FieldTypeOption[]
  dayTypeVersionId: string | null
  accessToken: string
  onRefetch: () => Promise<void>
  dataTestId: string
}

export interface UseDayTypeDetailRowsReturn {
  // State
  isAddingNewRow: boolean
  editingRowsCount: number
  // Actions
  handleAddRow: () => void
  handleDeleteRequest: (detail: TransformedDayTypeVersionDetail) => void
  // Render functions
  renderDataRow: (detail: TransformedDayTypeVersionDetail) => React.ReactNode
  renderNewRow: () => React.ReactNode | null
  // Delete dialog state
  selectedDetailForDelete: TransformedDayTypeVersionDetail | null
  isDeleteDialogOpen: boolean
  setIsDeleteDialogOpen: (open: boolean) => void
  handleConfirmDelete: () => Promise<void>
  isDeleting: boolean
}

export const useDayTypeDetailRows = ({
  fieldTypeOptions,
  dayTypeVersionId,
  accessToken,
  onRefetch,
  dataTestId
}: UseDayTypeDetailRowsProps): UseDayTypeDetailRowsReturn => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Multi-edit state: Map of rowId -> form values
  const [editingRows, setEditingRows] = useState<Record<string, DayTypeDetailRowFormData>>({})
  // Track which rows are currently saving
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  // Track which rows have attempted to save (to show errors)
  const [attemptedSave, setAttemptedSave] = useState<Set<string>>(new Set())

  // State for delete dialog
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<TransformedDayTypeVersionDetail | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Helper functions
  const findFieldTypeOption = useCallback(
    (code: string) => fieldTypeOptions.find(option => option.code === code),
    [fieldTypeOptions]
  )

  const findAppliedDayOption = useCallback(
    (code: string) => APPLIED_DAYS_OPTIONS.find(option => option.code === code),
    []
  )

  // Check if a row is being edited
  const isRowEditing = useCallback((rowId: string) => rowId in editingRows, [editingRows])

  // Check if we're adding a new row
  const isAddingNewRow = useMemo(() => NEW_ROW_KEY in editingRows, [editingRows])

  // Count editing rows
  const editingRowsCount = useMemo(() => Object.keys(editingRows).length, [editingRows])

  // Validate a row
  const isRowValid = useCallback(
    (rowId: string) => {
      const values = editingRows[rowId]
      if (!values) return false
      return dayTypeDetailRowSchema.safeParse(values).success
    },
    [editingRows]
  )

  // Get validation errors for a row
  const getRowErrors = useCallback(
    (rowId: string): Record<string, string> => {
      const values = editingRows[rowId]
      if (!values) return {}

      const result = dayTypeDetailRowSchema.safeParse(values)
      if (result.success) return {}

      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string
        if (path && !errors[path]) {
          errors[path] = issue.message
        }
      }
      return errors
    },
    [editingRows]
  )

  // Check if a row is saving
  const isRowSaving = useCallback((rowId: string) => savingRows.has(rowId), [savingRows])

  // Check if a row has been modified (dirty) compared to original values
  const isRowDirty = useCallback(
    (rowId: string, originalDetail?: TransformedDayTypeVersionDetail) => {
      const values = editingRows[rowId]
      if (!values) return false

      // For new rows, check if any field has been filled
      if (rowId === NEW_ROW_KEY) {
        return values.fieldType !== '' || values.appliedDay !== '' || values.timeValue !== ''
      }

      // For existing rows, compare with original values
      if (!originalDetail) return false
      return (
        values.fieldType !== originalDetail.fieldType ||
        values.appliedDay !== originalDetail.appliedDay ||
        values.timeValue !== originalDetail.timeValue
      )
    },
    [editingRows]
  )

  // Start editing a row
  const handleStartEdit = useCallback((detail: TransformedDayTypeVersionDetail) => {
    setEditingRows(prev => ({
      ...prev,
      [detail.id]: {
        fieldType: detail.fieldType,
        appliedDay: detail.appliedDay,
        timeValue: detail.timeValue
      }
    }))
  }, [])

  // Start adding a new row
  const handleAddRow = useCallback(() => {
    setEditingRows(prev => ({
      ...prev,
      [NEW_ROW_KEY]: {
        fieldType: '',
        appliedDay: '',
        timeValue: ''
      }
    }))
  }, [])

  // Update a field in an editing row
  const handleFieldChange = useCallback((rowId: string, field: keyof DayTypeDetailRowFormData, value: string) => {
    setEditingRows(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value
      }
    }))
  }, [])

  // Cancel editing a row
  const handleCancelRowEdit = useCallback((rowId: string) => {
    setEditingRows(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [rowId]: _, ...rest } = prev
      return rest
    })
    // Clear attempted save state
    setAttemptedSave(prev => {
      const next = new Set(prev)
      next.delete(rowId)
      return next
    })
  }, [])

  // Save a row (create or update)
  const handleSaveRow = useCallback(
    async (rowId: string, existingDetail?: TransformedDayTypeVersionDetail) => {
      const values = editingRows[rowId]
      if (!values) return

      // Mark that save was attempted (to show errors)
      setAttemptedSave(prev => new Set(prev).add(rowId))

      // Validate - if invalid, return early (errors will now be shown)
      const result = dayTypeDetailRowSchema.safeParse(values)
      if (!result.success) return

      // Mark as saving
      setSavingRows(prev => new Set(prev).add(rowId))

      try {
        const payload = {
          changeMode: 'INSERT',
          dayTypeVersionDetail: {
            dayTypeVersion: dayTypeVersionId,
            fieldType: values.fieldType,
            appliedDay: values.appliedDay,
            timeValue: values.timeValue,
            ...(existingDetail?.id ? { id: existingDetail.id, version: existingDetail.version } : {})
          }
        }

        const endpoint = existingDetail?.id ? 'updateDayTypeVersionDetail' : 'createDayTypeVersionDetail'
        await restClient.post(`/employee-time/${endpoint}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        await onRefetch()
        handleCancelRowEdit(rowId)
      } catch (error) {
        console.error('Error saving day type detail:', error)
      } finally {
        setSavingRows(prev => {
          const next = new Set(prev)
          next.delete(rowId)
          return next
        })
      }
    },
    [editingRows, dayTypeVersionId, restClient, accessToken, onRefetch, handleCancelRowEdit]
  )

  // Request delete (opens dialog)
  const handleDeleteRequest = useCallback((detail: TransformedDayTypeVersionDetail) => {
    setSelectedDetailForDelete(detail)
    setIsDeleteDialogOpen(true)
  }, [])

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedDetailForDelete) return
    setIsDeleting(true)

    try {
      await restClient.post(
        '/employee-time/deleteDayTypeVersionDetail',
        {
          changeMode: 'DELETE',
          dayTypeVersionDetail: {
            id: selectedDetailForDelete.id,
            version: selectedDetailForDelete.version
          }
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      // Also remove from editing if it was being edited
      if (isRowEditing(selectedDetailForDelete.id)) {
        handleCancelRowEdit(selectedDetailForDelete.id)
      }

      await onRefetch()
    } catch (error) {
      console.error('Error deleting day type detail:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setSelectedDetailForDelete(null)
    }
  }, [selectedDetailForDelete, restClient, accessToken, onRefetch, isRowEditing, handleCancelRowEdit])

  // Render a data row
  const renderDataRow = useCallback(
    (detail: TransformedDayTypeVersionDetail): React.ReactNode => {
      const rowId = detail.id
      const isEditing = isRowEditing(rowId)
      const isSaving = isRowSaving(rowId)
      const values = editingRows[rowId]

      // Get validation errors for the row (only show after save attempt)
      const errors = isEditing && attemptedSave.has(rowId) ? getRowErrors(rowId) : {}

      return (
        <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, `row-${rowId}`)}>
          {/* Field Type */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={fieldTypeOptions.map(ft => ({ value: ft.code, label: ft.displayValue }))}
                    value={values?.fieldType || ''}
                    onValueChange={value => handleFieldChange(rowId, 'fieldType', value)}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.day_type_versions.actions.select_field_type',
                      'Select field type'
                    )}
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  <RequiredIndicator />
                </div>
                <FieldErrorTooltip error={errors.fieldType} />
              </div>
            ) : (
              <span>{findFieldTypeOption(detail.fieldType)?.displayValue || detail.fieldType}</span>
            )}
          </TableCell>

          {/* Applied Day */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <Combobox
                  options={APPLIED_DAYS_OPTIONS.map(ad => ({ value: ad.code, label: ad.displayValue }))}
                  value={values?.appliedDay || ''}
                  onValueChange={value => handleFieldChange(rowId, 'appliedDay', value)}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.day_type_versions.actions.select_applied_day',
                    'Select applied day'
                  )}
                  className="gba:w-full"
                  disabled={isSaving}
                />
                <FieldErrorTooltip error={errors.appliedDay} />
              </div>
            ) : (
              <span>{findAppliedDayOption(detail.appliedDay)?.displayValue || detail.appliedDay}</span>
            )}
          </TableCell>

          {/* Time Value */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <Input
                  type="time"
                  value={values?.timeValue || ''}
                  onChange={e => handleFieldChange(rowId, 'timeValue', e.target.value)}
                  className="gba:w-[120px]"
                  disabled={isSaving}
                  data-testid={formatDataTestId(dataTestId, `time-value-input-${rowId}`)}
                />
                <FieldErrorTooltip error={errors.timeValue} />
              </div>
            ) : (
              <span>{detail.timeValue}</span>
            )}
          </TableCell>

          {/* Actions - isValid/isDirty forced to true so Save is always clickable, validation happens on click */}
          <RowActionsCell
            isEditing={isEditing}
            isSaving={isSaving}
            isValid={true}
            isDirty={true}
            onSave={() => handleSaveRow(rowId, detail)}
            onCancel={() => handleCancelRowEdit(rowId)}
            onEdit={() => handleStartEdit(detail)}
            onDelete={() => handleDeleteRequest(detail)}
            dataTestId={dataTestId}
            rowId={rowId}
          />
        </TableRow>
      )
    },
    [
      editingRows,
      isRowEditing,
      isRowSaving,
      isRowValid,
      isRowDirty,
      getRowErrors,
      attemptedSave,
      fieldTypeOptions,
      findFieldTypeOption,
      findAppliedDayOption,
      handleFieldChange,
      handleSaveRow,
      handleCancelRowEdit,
      handleStartEdit,
      handleDeleteRequest,
      dataTestId
    ]
  )

  // Render new row being added
  const renderNewRow = useCallback((): React.ReactNode | null => {
    if (!isAddingNewRow) return null

    const rowId = NEW_ROW_KEY
    const isSaving = isRowSaving(rowId)
    const values = editingRows[rowId]

    // Get validation errors for the new row (only show after save attempt)
    const errors = attemptedSave.has(rowId) ? getRowErrors(rowId) : {}

    return (
      <TableRow key="new-row" data-testid={formatDataTestId(dataTestId, 'new-row')}>
        {/* Field Type */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={fieldTypeOptions.map(ft => ({ value: ft.code, label: ft.displayValue }))}
                value={values?.fieldType || ''}
                onValueChange={value => handleFieldChange(rowId, 'fieldType', value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.actions.select_field_type',
                  'Select field type'
                )}
                className="gba:w-full"
                disabled={isSaving}
              />
              <RequiredIndicator />
            </div>
            <FieldErrorTooltip error={errors.fieldType} />
          </div>
        </TableCell>

        {/* Applied Day */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={APPLIED_DAYS_OPTIONS.map(ad => ({ value: ad.code, label: ad.displayValue }))}
                value={values?.appliedDay || ''}
                onValueChange={value => handleFieldChange(rowId, 'appliedDay', value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.actions.select_applied_day',
                  'Select applied day'
                )}
                className="gba:w-full"
                disabled={isSaving}
              />
              <RequiredIndicator />
            </div>
            <FieldErrorTooltip error={errors.appliedDay} />
          </div>
        </TableCell>

        {/* Time Value */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Input
                type="time"
                value={values?.timeValue || ''}
                onChange={e => handleFieldChange(rowId, 'timeValue', e.target.value)}
                className="gba:w-[120px]"
                disabled={isSaving}
                data-testid={formatDataTestId(dataTestId, 'time-value-input-new')}
              />
              <RequiredIndicator />
            </div>
            <FieldErrorTooltip error={errors.timeValue} />
          </div>
        </TableCell>

        {/* Actions - isValid forced to true so Save is always clickable, validation happens on click */}
        <RowActionsCell
          isEditing={true}
          isSaving={isSaving}
          isValid={true}
          isNewRow={true}
          onSave={() => handleSaveRow(rowId)}
          onCancel={() => handleCancelRowEdit(rowId)}
          onEdit={() => {}} // Not used for new row
          onDelete={() => {}} // Not used for new row
          dataTestId={dataTestId}
          rowId={rowId}
        />
      </TableRow>
    )
  }, [
    isAddingNewRow,
    editingRows,
    isRowSaving,
    isRowValid,
    getRowErrors,
    attemptedSave,
    fieldTypeOptions,
    handleFieldChange,
    handleSaveRow,
    handleCancelRowEdit,
    dataTestId
  ])

  return {
    // State
    isAddingNewRow,
    editingRowsCount,
    // Actions
    handleAddRow,
    handleDeleteRequest,
    // Render functions
    renderDataRow,
    renderNewRow,
    // Delete dialog state
    selectedDetailForDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleConfirmDelete,
    isDeleting
  }
}
