import React, { useCallback, useMemo, useState } from 'react'
import { TableRow, TableCell, Input, Combobox, Checkbox, Badge } from '@newwork/nw-design-system'
import { CheckIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { RowActionsCell } from '@/components/table-form'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedIncrementTypeVersionDetail } from '../types/increment-type-version-details'
import { TransformedTimeType } from '../types/time-types'
import {
  INCREMENT_APPLIED_DAYS_OPTIONS,
  TIME_ISSUE_TYPE_OPTIONS,
  INCREMENT_CALCULATION_TYPE_OPTIONS,
  incrementTypeDetailRowSchema,
  IncrementTypeDetailRowFormData,
  getDefaultIncrementTypeDetailValues,
  getRequiredFieldsForIncrementType,
  isFixedValueEnabled
} from '../constants/increment-type-constants'
import { RequiredIndicator } from '../components/RequiredIndicator'
import { FieldErrorTooltip } from '../components/FieldErrorTooltip'
import { calculateSumTime } from '../utils/calculateSumTime'
import { convertMinutesToHHMM } from '../utils/convertMinutesToHHMM'

// Special key for new row
const NEW_ROW_KEY = '__new__'

export interface UseIncrementTypeDetailRowsProps {
  details: TransformedIncrementTypeVersionDetail[]
  timeTypes: TransformedTimeType[]
  incrementTypeVersionId: string | null
  accessToken: string
  onRefetch: () => Promise<void>
  dataTestId: string
}

export interface UseIncrementTypeDetailRowsReturn {
  // State
  isAddingNewRow: boolean
  editingRowsCount: number
  // Actions
  handleAddRow: () => void
  // Render functions
  renderDataRow: (detail: TransformedIncrementTypeVersionDetail) => React.ReactNode
  renderNewRow: () => React.ReactNode | null
  // Delete dialog state
  selectedDetailForDelete: TransformedIncrementTypeVersionDetail | null
  isDeleteDialogOpen: boolean
  setIsDeleteDialogOpen: (open: boolean) => void
  handleConfirmDelete: () => Promise<void>
  isDeleting: boolean
}

export const useIncrementTypeDetailRows = ({
  details,
  timeTypes,
  incrementTypeVersionId,
  accessToken,
  onRefetch,
  dataTestId
}: UseIncrementTypeDetailRowsProps): UseIncrementTypeDetailRowsReturn => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Multi-edit state: Map of rowId -> form values
  const [editingRows, setEditingRows] = useState<Record<string, IncrementTypeDetailRowFormData>>({})
  // Track which rows are currently saving
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  // Track which rows have attempted to save (to show errors)
  const [attemptedSave, setAttemptedSave] = useState<Set<string>>(new Set())

  // State for delete dialog
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<TransformedIncrementTypeVersionDetail | null>(
    null
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Helper functions
  const findTimeIssueTypeOption = useCallback(
    (code: string) => TIME_ISSUE_TYPE_OPTIONS.find(option => option.code === code),
    []
  )

  const findAppliedDayOption = useCallback(
    (code: string) => INCREMENT_APPLIED_DAYS_OPTIONS.find(option => option.code === code),
    []
  )

  const findCalculationTypeOption = useCallback(
    (code: string) => INCREMENT_CALCULATION_TYPE_OPTIONS.find(option => option.code === code),
    []
  )

  const findTimeType = useCallback((timeTypeId: string) => timeTypes.find(t => t.id === timeTypeId), [timeTypes])

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
      return incrementTypeDetailRowSchema.safeParse(values).success
    },
    [editingRows]
  )

  // Get validation errors for a row
  const getRowErrors = useCallback(
    (rowId: string): Record<string, string> => {
      const values = editingRows[rowId]
      if (!values) return {}

      const result = incrementTypeDetailRowSchema.safeParse(values)
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
    (rowId: string, originalDetail?: TransformedIncrementTypeVersionDetail) => {
      const values = editingRows[rowId]
      if (!values) return false

      // For new rows, check if any required field has been filled
      if (rowId === NEW_ROW_KEY) {
        return values.timeIssueType !== '' || values.fromAppliedDay !== '' || values.timeTypeId !== ''
      }

      // For existing rows, compare with original values
      if (!originalDetail) return false
      return (
        values.timeIssueType !== originalDetail.timeIssueType ||
        values.displayOrder !== originalDetail.displayOrder ||
        values.includeBreaks !== originalDetail.includeBreaks ||
        values.fromAppliedDay !== originalDetail.fromAppliedDay ||
        values.startTime !== originalDetail.startTime ||
        values.toAppliedDate !== originalDetail.toAppliedDate ||
        values.endTime !== originalDetail.endTime ||
        values.timeTypeId !== originalDetail.timeTypeId ||
        values.incrementCalculationType !== originalDetail.incrementCalculationType ||
        values.fixedValue !== originalDetail.fixedValue ||
        values.includeExcludeOption !== originalDetail.includeExcludeOption ||
        values.alternativeIncrementTypeVersionDetailId !== originalDetail.alternativeIncrementTypeVersionDetailId ||
        values.checkStartBefore !== originalDetail.checkStartBefore ||
        values.startBeforeTime !== originalDetail.startBeforeTime
      )
    },
    [editingRows]
  )

  // Start editing a row
  const handleStartEdit = useCallback((detail: TransformedIncrementTypeVersionDetail) => {
    setEditingRows(prev => ({
      ...prev,
      [detail.id]: {
        timeIssueType: detail.timeIssueType,
        displayOrder: detail.displayOrder,
        includeBreaks: detail.includeBreaks,
        fromAppliedDay: detail.fromAppliedDay,
        startTime: detail.startTime,
        toAppliedDate: detail.toAppliedDate,
        endTime: detail.endTime,
        sumTime: detail.sumTime,
        timeTypeId: detail.timeTypeId,
        incrementCalculationType: detail.incrementCalculationType,
        fixedValue: detail.fixedValue ? convertMinutesToHHMM(detail.fixedValue) : null,
        includeExcludeOption: detail.includeExcludeOption,
        alternativeIncrementTypeVersionDetailId: detail.alternativeIncrementTypeVersionDetailId,
        checkStartBefore: detail.checkStartBefore,
        startBeforeTime: detail.startBeforeTime
      }
    }))
  }, [])

  // Start adding a new row
  const handleAddRow = useCallback(() => {
    const newValues = getDefaultIncrementTypeDetailValues()
    // Set displayOrder to the next available position
    newValues.displayOrder = details.length + 1
    setEditingRows(prev => ({
      ...prev,
      [NEW_ROW_KEY]: newValues
    }))
  }, [details.length])

  // Update a field in an editing row
  const handleFieldChange = useCallback(
    (rowId: string, field: keyof IncrementTypeDetailRowFormData, value: string | number | boolean | null) => {
      setEditingRows(prev => {
        const currentValues = prev[rowId]
        if (!currentValues) return prev

        const newValues = {
          ...currentValues,
          [field]: value
        }

        // Auto-calculate sumTime when time fields change
        if (field === 'fromAppliedDay' || field === 'startTime' || field === 'toAppliedDate' || field === 'endTime') {
          if (newValues.fromAppliedDay && newValues.startTime && newValues.toAppliedDate && newValues.endTime) {
            newValues.sumTime = calculateSumTime(
              newValues.fromAppliedDay,
              newValues.startTime,
              newValues.toAppliedDate,
              newValues.endTime
            )
          }
        }

        // Reset fixedValue when calculation type changes to non-enabled value
        if (field === 'incrementCalculationType' && !isFixedValueEnabled(value as string)) {
          newValues.fixedValue = null
        }

        return {
          ...prev,
          [rowId]: newValues
        }
      })
    },
    []
  )

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

  // Convert fixedValue from HH:mm string to number (minutes) for backend
  const convertFixedValueToNumber = (value: string | null | undefined): number | null => {
    if (!value || value === '') return null
    const parts = value.split(':')
    if (parts.length === 2) {
      const hours = Number.parseInt(parts[0], 10)
      const minutes = Number.parseInt(parts[1], 10)
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        return hours * 60 + minutes
      }
    }
    return null
  }

  // Save a row (create or update)
  const handleSaveRow = useCallback(
    async (rowId: string, existingDetail?: TransformedIncrementTypeVersionDetail) => {
      const values = editingRows[rowId]
      if (!values) return

      // Mark that save was attempted (to show errors)
      setAttemptedSave(prev => new Set(prev).add(rowId))

      // Validate - if invalid, return early (errors will now be shown)
      const result = incrementTypeDetailRowSchema.safeParse(values)
      if (!result.success) return

      // Mark as saving
      setSavingRows(prev => new Set(prev).add(rowId))

      try {
        const isUpdate = !!existingDetail?.id
        const newDisplayOrder = values.displayOrder
        const oldDisplayOrder = existingDetail?.displayOrder ?? -1

        // Calculate which details need to be updated for displayOrder changes
        const detailsToUpdate: Array<{ id: string; version: number; newDisplayOrder: number }> = []

        if (isUpdate) {
          if (newDisplayOrder !== oldDisplayOrder) {
            if (newDisplayOrder < oldDisplayOrder) {
              details.forEach(detail => {
                if (
                  detail.id !== existingDetail.id &&
                  detail.displayOrder >= newDisplayOrder &&
                  detail.displayOrder < oldDisplayOrder
                ) {
                  detailsToUpdate.push({
                    id: detail.id,
                    version: detail.version,
                    newDisplayOrder: detail.displayOrder + 1
                  })
                }
              })
            } else {
              details.forEach(detail => {
                if (
                  detail.id !== existingDetail.id &&
                  detail.displayOrder > oldDisplayOrder &&
                  detail.displayOrder <= newDisplayOrder
                ) {
                  detailsToUpdate.push({
                    id: detail.id,
                    version: detail.version,
                    newDisplayOrder: detail.displayOrder - 1
                  })
                }
              })
            }
          }
        } else {
          details.forEach(detail => {
            if (detail.displayOrder >= newDisplayOrder) {
              detailsToUpdate.push({
                id: detail.id,
                version: detail.version,
                newDisplayOrder: detail.displayOrder + 1
              })
            }
          })
        }

        // Update affected details first
        for (const detailUpdate of detailsToUpdate) {
          const updatePayload = {
            changeMode: 'INSERT',
            incrementTypeVersionDetail: {
              id: detailUpdate.id,
              version: detailUpdate.version,
              incrementTypeVersion: incrementTypeVersionId,
              displayOrder: detailUpdate.newDisplayOrder
            }
          }
          await restClient.post(`/employee-time/updateIncrementTypeVersionDetail`, updatePayload, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        }

        // Now create/update the current detail
        const payload = {
          changeMode: 'INSERT',
          incrementTypeVersionDetail: {
            incrementTypeVersion: incrementTypeVersionId,
            timeIssueType: values.timeIssueType,
            displayOrder: values.displayOrder,
            includeBreaks: values.includeBreaks,
            fromAppliedDay: values.fromAppliedDay,
            startTime: values.startTime,
            toAppliedDate: values.toAppliedDate,
            endTime: values.endTime,
            sumTime: values.sumTime || '',
            timeType: values.timeTypeId,
            incrementCalculationType: values.incrementCalculationType,
            fixedValue: convertFixedValueToNumber(values.fixedValue),
            includeExcludeOption: values.includeExcludeOption,
            alternativeIncrementTypeVersionDetail: values.alternativeIncrementTypeVersionDetailId ?? null,
            checkStartBefore: values.checkStartBefore ?? false,
            startBeforeTime: values.startBeforeTime ?? null,
            ...(existingDetail?.id ? { id: existingDetail.id, version: existingDetail.version } : {})
          }
        }

        const endpoint = existingDetail?.id ? 'updateIncrementTypeVersionDetail' : 'createIncrementTypeVersionDetail'
        await restClient.post(`/employee-time/${endpoint}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        await onRefetch()
        handleCancelRowEdit(rowId)
      } catch (error) {
        console.error('Error saving increment type detail:', error)
      } finally {
        setSavingRows(prev => {
          const next = new Set(prev)
          next.delete(rowId)
          return next
        })
      }
    },
    [editingRows, details, incrementTypeVersionId, restClient, accessToken, onRefetch, handleCancelRowEdit]
  )

  // Request delete (opens dialog)
  const handleDeleteRequest = useCallback((detail: TransformedIncrementTypeVersionDetail) => {
    setSelectedDetailForDelete(detail)
    setIsDeleteDialogOpen(true)
  }, [])

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedDetailForDelete) return
    setIsDeleting(true)

    try {
      await restClient.post(
        '/employee-time/deleteIncrementTypeVersionDetail',
        {
          changeMode: 'DELETE',
          incrementTypeVersionDetail: {
            id: selectedDetailForDelete.id,
            version: selectedDetailForDelete.version
          }
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      if (isRowEditing(selectedDetailForDelete.id)) {
        handleCancelRowEdit(selectedDetailForDelete.id)
      }

      await onRefetch()
    } catch (error) {
      console.error('Error deleting increment type detail:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setSelectedDetailForDelete(null)
    }
  }, [selectedDetailForDelete, restClient, accessToken, onRefetch, isRowEditing, handleCancelRowEdit])

  // Get alternative options (exclude current, only those with checkStartBefore = true)
  const getAlternativeOptions = useCallback(
    (currentId?: string) => {
      return details.filter(detail => detail.id !== currentId && detail.checkStartBefore === true)
    },
    [details]
  )

  // Render a data row
  const renderDataRow = useCallback(
    (detail: TransformedIncrementTypeVersionDetail): React.ReactNode => {
      const rowId = detail.id
      const isEditing = isRowEditing(rowId)
      const isSaving = isRowSaving(rowId)
      const values = editingRows[rowId]
      const alternativeOptions = getAlternativeOptions(detail.id)

      // Get required fields based on current values
      const currentCalcType = isEditing ? values?.incrementCalculationType : detail.incrementCalculationType
      const currentCheckStartBefore = isEditing ? values?.checkStartBefore : detail.checkStartBefore
      const requiredFields = getRequiredFieldsForIncrementType(currentCalcType, currentCheckStartBefore)

      // Get validation errors for the row (only show after save attempt)
      const errors = isEditing && attemptedSave.has(rowId) ? getRowErrors(rowId) : {}

      return (
        <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, `row-${rowId}`)}>
          {/* Display Order */}
          <TableCell>{detail.displayOrder}</TableCell>

          {/* Time Issue Type */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={TIME_ISSUE_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                    value={values?.timeIssueType || ''}
                    onValueChange={value => handleFieldChange(rowId, 'timeIssueType', value)}
                    placeholder="Select"
                    className="gba:w-[150px] gba:overflow-hidden gba:[&_span]:truncate"
                    disabled={isSaving}
                  />
                  {requiredFields.timeIssueType && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.timeIssueType} />
              </div>
            ) : (
              <Badge variant="outline">
                {findTimeIssueTypeOption(detail.timeIssueType)?.displayValue || detail.timeIssueType}
              </Badge>
            )}
          </TableCell>

          {/* Include Breaks */}
          <TableCell>
            {isEditing ? (
              <Checkbox
                checked={values?.includeBreaks || false}
                onCheckedChange={checked => handleFieldChange(rowId, 'includeBreaks', checked as boolean)}
                disabled={isSaving}
              />
            ) : detail.includeBreaks ? (
              <CheckIcon className="gba:h-4 gba:w-4" />
            ) : (
              '-'
            )}
          </TableCell>

          {/* Day From */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                    value={values?.fromAppliedDay || ''}
                    onValueChange={value => handleFieldChange(rowId, 'fromAppliedDay', value)}
                    placeholder="Select"
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.fromAppliedDay && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.fromAppliedDay} />
              </div>
            ) : (
              <span>{findAppliedDayOption(detail.fromAppliedDay)?.displayValue || detail.fromAppliedDay}</span>
            )}
          </TableCell>

          {/* Start Time */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Input
                    type="time"
                    value={values?.startTime || ''}
                    onChange={e => handleFieldChange(rowId, 'startTime', e.target.value)}
                    className="gba:w-[100px]"
                    disabled={isSaving}
                  />
                  {requiredFields.startTime && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.startTime} />
              </div>
            ) : (
              <span>{detail.startTime}</span>
            )}
          </TableCell>

          {/* Day To */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                    value={values?.toAppliedDate || ''}
                    onValueChange={value => handleFieldChange(rowId, 'toAppliedDate', value)}
                    placeholder="Select"
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.toAppliedDate && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.toAppliedDate} />
              </div>
            ) : (
              <span>{findAppliedDayOption(detail.toAppliedDate)?.displayValue || detail.toAppliedDate}</span>
            )}
          </TableCell>

          {/* End Time */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Input
                    type="time"
                    value={values?.endTime || ''}
                    onChange={e => handleFieldChange(rowId, 'endTime', e.target.value)}
                    className="gba:w-[100px]"
                    disabled={isSaving}
                  />
                  {requiredFields.endTime && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.endTime} />
              </div>
            ) : (
              <span>{detail.endTime}</span>
            )}
          </TableCell>

          {/* Sum Time */}
          <TableCell>
            <span>{isEditing ? values?.sumTime || '-' : detail.sumTime || '-'}</span>
          </TableCell>

          {/* Time Type */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={timeTypes.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                    value={values?.timeTypeId || ''}
                    onValueChange={value => handleFieldChange(rowId, 'timeTypeId', value)}
                    placeholder="Select"
                    className="gba:w-[170px] gba:overflow-hidden gba:[&_span]:truncate"
                    disabled={isSaving}
                  />
                  {requiredFields.timeTypeId && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.timeTypeId} />
              </div>
            ) : (
              <span>
                {findTimeType(detail.timeTypeId)
                  ? `${findTimeType(detail.timeTypeId)?.code} - ${findTimeType(detail.timeTypeId)?.name}`
                  : 'N/A'}
              </span>
            )}
          </TableCell>

          {/* Calculation Type */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={INCREMENT_CALCULATION_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                    value={values?.incrementCalculationType || ''}
                    onValueChange={value => handleFieldChange(rowId, 'incrementCalculationType', value)}
                    placeholder="Select"
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.incrementCalculationType && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.incrementCalculationType} />
              </div>
            ) : (
              <Badge variant="outline">
                {findCalculationTypeOption(detail.incrementCalculationType)?.displayValue ||
                  detail.incrementCalculationType}
              </Badge>
            )}
          </TableCell>

          {/* Fixed Value */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Input
                    type="text"
                    placeholder="HH:mm"
                    value={values?.fixedValue || ''}
                    onChange={e => handleFieldChange(rowId, 'fixedValue', e.target.value || null)}
                    className="gba:w-[80px]"
                    disabled={isSaving || !isFixedValueEnabled(values?.incrementCalculationType)}
                  />
                  {requiredFields.fixedValue && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.fixedValue} />
              </div>
            ) : detail.fixedValue === null ? (
              '-'
            ) : (
              <span>{convertMinutesToHHMM(detail.fixedValue) || '-'}</span>
            )}
          </TableCell>

          {/* Check Start Before */}
          <TableCell>
            {isEditing ? (
              <Checkbox
                checked={values?.checkStartBefore || false}
                onCheckedChange={checked => handleFieldChange(rowId, 'checkStartBefore', checked as boolean)}
                disabled={isSaving}
              />
            ) : detail.checkStartBefore ? (
              <CheckIcon className="gba:h-4 gba:w-4" />
            ) : (
              '-'
            )}
          </TableCell>

          {/* Start Before Time */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Input
                    type="time"
                    value={values?.startBeforeTime || ''}
                    onChange={e => handleFieldChange(rowId, 'startBeforeTime', e.target.value || null)}
                    className="gba:w-[100px]"
                    disabled={isSaving || !values?.checkStartBefore}
                  />
                  {requiredFields.startBeforeTime && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.startBeforeTime} />
              </div>
            ) : (
              <span>{detail.startBeforeTime || '-'}</span>
            )}
          </TableCell>

          {/* Alternative To */}
          <TableCell>
            {isEditing ? (
              alternativeOptions.length > 0 ? (
                <Combobox
                  options={alternativeOptions.map(o => ({ value: o.id, label: `Order: ${o.displayOrder}` }))}
                  value={values?.alternativeIncrementTypeVersionDetailId || ''}
                  onValueChange={value =>
                    handleFieldChange(rowId, 'alternativeIncrementTypeVersionDetailId', value || null)
                  }
                  placeholder="None"
                  className="gba:w-full"
                  disabled={isSaving}
                  allowClear
                />
              ) : (
                <span>None</span>
              )
            ) : (
              <span>
                {detail.alternativeIncrementTypeVersionDetailId
                  ? (details.find(d => d.id === detail.alternativeIncrementTypeVersionDetailId)?.displayOrder ?? 'N/A')
                  : 'None'}
              </span>
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
      details,
      timeTypes,
      isRowEditing,
      isRowSaving,
      isRowValid,
      isRowDirty,
      getRowErrors,
      attemptedSave,
      findTimeIssueTypeOption,
      findAppliedDayOption,
      findCalculationTypeOption,
      findTimeType,
      getAlternativeOptions,
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
    const alternativeOptions = getAlternativeOptions()

    // Get required fields based on current values
    const requiredFields = getRequiredFieldsForIncrementType(values?.incrementCalculationType, values?.checkStartBefore)

    // Get validation errors for the new row (only show after save attempt)
    const errors = attemptedSave.has(rowId) ? getRowErrors(rowId) : {}

    return (
      <TableRow key="new-row" data-testid={formatDataTestId(dataTestId, 'new-row')}>
        {/* Display Order */}
        <TableCell>{values?.displayOrder ?? 0}</TableCell>

        {/* Time Issue Type */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={TIME_ISSUE_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.timeIssueType || ''}
                onValueChange={value => handleFieldChange(rowId, 'timeIssueType', value)}
                placeholder="Select"
                className="gba:w-[150px] gba:overflow-hidden gba:[&_span]:truncate"
                disabled={isSaving}
              />
              {requiredFields.timeIssueType && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.timeIssueType} />
          </div>
        </TableCell>

        {/* Include Breaks */}
        <TableCell>
          <Checkbox
            checked={values?.includeBreaks || false}
            onCheckedChange={checked => handleFieldChange(rowId, 'includeBreaks', checked as boolean)}
            disabled={isSaving}
          />
        </TableCell>

        {/* Day From */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.fromAppliedDay || ''}
                onValueChange={value => handleFieldChange(rowId, 'fromAppliedDay', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.fromAppliedDay && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.fromAppliedDay} />
          </div>
        </TableCell>

        {/* Start Time */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Input
                type="time"
                value={values?.startTime || ''}
                onChange={e => handleFieldChange(rowId, 'startTime', e.target.value)}
                className="gba:w-[100px]"
                disabled={isSaving}
              />
              {requiredFields.startTime && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.startTime} />
          </div>
        </TableCell>

        {/* Day To */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.toAppliedDate || ''}
                onValueChange={value => handleFieldChange(rowId, 'toAppliedDate', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.toAppliedDate && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.toAppliedDate} />
          </div>
        </TableCell>

        {/* End Time */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Input
                type="time"
                value={values?.endTime || ''}
                onChange={e => handleFieldChange(rowId, 'endTime', e.target.value)}
                className="gba:w-[100px]"
                disabled={isSaving}
              />
              {requiredFields.endTime && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.endTime} />
          </div>
        </TableCell>

        {/* Sum Time */}
        <TableCell>
          <span>{values?.sumTime || '-'}</span>
        </TableCell>

        {/* Time Type */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={timeTypes.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                value={values?.timeTypeId || ''}
                onValueChange={value => handleFieldChange(rowId, 'timeTypeId', value)}
                placeholder="Select"
                className="gba:w-[170px] gba:overflow-hidden gba:[&_span]:truncate"
                disabled={isSaving}
              />
              {requiredFields.timeTypeId && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.timeTypeId} />
          </div>
        </TableCell>

        {/* Calculation Type */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={INCREMENT_CALCULATION_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.incrementCalculationType || ''}
                onValueChange={value => handleFieldChange(rowId, 'incrementCalculationType', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.incrementCalculationType && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.incrementCalculationType} />
          </div>
        </TableCell>

        {/* Fixed Value */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Input
                type="text"
                placeholder="HH:mm"
                value={values?.fixedValue || ''}
                onChange={e => handleFieldChange(rowId, 'fixedValue', e.target.value || null)}
                className="gba:w-[80px]"
                disabled={isSaving || !isFixedValueEnabled(values?.incrementCalculationType)}
              />
              {requiredFields.fixedValue && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.fixedValue} />
          </div>
        </TableCell>

        {/* Check Start Before */}
        <TableCell>
          <Checkbox
            checked={values?.checkStartBefore || false}
            onCheckedChange={checked => handleFieldChange(rowId, 'checkStartBefore', checked as boolean)}
            disabled={isSaving}
          />
        </TableCell>

        {/* Start Before Time */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Input
                type="time"
                value={values?.startBeforeTime || ''}
                onChange={e => handleFieldChange(rowId, 'startBeforeTime', e.target.value || null)}
                className="gba:w-[100px]"
                disabled={isSaving || !values?.checkStartBefore}
              />
              {requiredFields.startBeforeTime && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.startBeforeTime} />
          </div>
        </TableCell>

        {/* Alternative To */}
        <TableCell>
          {alternativeOptions.length > 0 ? (
            <Combobox
              options={alternativeOptions.map(o => ({ value: o.id, label: `Order: ${o.displayOrder}` }))}
              value={values?.alternativeIncrementTypeVersionDetailId || ''}
              onValueChange={value =>
                handleFieldChange(rowId, 'alternativeIncrementTypeVersionDetailId', value || null)
              }
              placeholder="None"
              className="gba:w-full"
              disabled={isSaving}
              allowClear
            />
          ) : (
            <span>None</span>
          )}
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
    details,
    timeTypes,
    isRowSaving,
    isRowValid,
    getRowErrors,
    attemptedSave,
    getAlternativeOptions,
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
