import React, { useCallback, useMemo, useState } from 'react'
import { TableRow, TableCell, Button, Input, Combobox, Checkbox, Badge } from '@newwork/nw-design-system'
import { PencilSimpleLineIcon, TrashIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedIncrementTypeVersionDetail } from '../types/increment-type-version-details'
import { TransformedTimeType } from '../types/time-types'
import {
  INCREMENT_APPLIED_DAYS_OPTIONS,
  TIME_ISSUE_TYPE_OPTIONS,
  INCREMENT_CALCULATION_TYPE_OPTIONS,
  INCLUDE_EXCLUDE_OPTIONS,
  incrementTypeDetailRowSchema,
  IncrementTypeDetailRowFormData,
  getDefaultIncrementTypeDetailValues
} from '../constants/increment-type-constants'
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

  const findIncludeExcludeOption = useCallback(
    (code: string) => INCLUDE_EXCLUDE_OPTIONS.find(option => option.code === code),
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
        fixedValue: detail.fixedValue,
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
    newValues.displayOrder = details.length
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
      const { [rowId]: _removed, ...rest } = prev
      void _removed
      return rest
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

      // Validate
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
      const isValid = isRowValid(rowId)
      const isDirty = isRowDirty(rowId, detail)
      const values = editingRows[rowId]
      const alternativeOptions = getAlternativeOptions(detail.id)

      return (
        <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, `row-${rowId}`)}>
          {/* Display Order */}
          <TableCell>
            {isEditing ? (
              <Input
                type="number"
                min={0}
                max={details.length - 1}
                value={values?.displayOrder ?? 0}
                onChange={e => handleFieldChange(rowId, 'displayOrder', Number.parseInt(e.target.value) || 0)}
                className="gba:w-[60px]"
                disabled={isSaving}
              />
            ) : (
              <span>{detail.displayOrder}</span>
            )}
          </TableCell>

          {/* Time Issue Type */}
          <TableCell>
            {isEditing ? (
              <Combobox
                options={TIME_ISSUE_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.timeIssueType || ''}
                onValueChange={value => handleFieldChange(rowId, 'timeIssueType', value)}
                placeholder="Select"
                className="gba:w-[150px] gba:overflow-hidden gba:[&_span]:truncate"
                disabled={isSaving}
              />
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
              <Combobox
                options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.fromAppliedDay || ''}
                onValueChange={value => handleFieldChange(rowId, 'fromAppliedDay', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
            ) : (
              <span>{findAppliedDayOption(detail.fromAppliedDay)?.displayValue || detail.fromAppliedDay}</span>
            )}
          </TableCell>

          {/* Start Time */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.startTime || ''}
                onChange={e => handleFieldChange(rowId, 'startTime', e.target.value)}
                className="gba:w-[100px]"
                disabled={isSaving}
              />
            ) : (
              <span>{detail.startTime}</span>
            )}
          </TableCell>

          {/* Day To */}
          <TableCell>
            {isEditing ? (
              <Combobox
                options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.toAppliedDate || ''}
                onValueChange={value => handleFieldChange(rowId, 'toAppliedDate', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
            ) : (
              <span>{findAppliedDayOption(detail.toAppliedDate)?.displayValue || detail.toAppliedDate}</span>
            )}
          </TableCell>

          {/* End Time */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.endTime || ''}
                onChange={e => handleFieldChange(rowId, 'endTime', e.target.value)}
                className="gba:w-[100px]"
                disabled={isSaving}
              />
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
              <Combobox
                options={timeTypes.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                value={values?.timeTypeId || ''}
                onValueChange={value => handleFieldChange(rowId, 'timeTypeId', value)}
                placeholder="Select"
                className="gba:w-[170px] gba:overflow-hidden gba:[&_span]:truncate"
                disabled={isSaving}
              />
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
              <Combobox
                options={INCREMENT_CALCULATION_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.incrementCalculationType || ''}
                onValueChange={value => handleFieldChange(rowId, 'incrementCalculationType', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
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
              values?.incrementCalculationType !== 'CALCULATED_INC_CALC_TYPE' ? (
                <Input
                  type="text"
                  placeholder="HH:mm"
                  value={values?.fixedValue || ''}
                  onChange={e => handleFieldChange(rowId, 'fixedValue', e.target.value || null)}
                  className="gba:w-[80px]"
                  disabled={isSaving}
                />
              ) : (
                <span>-</span>
              )
            ) : detail.fixedValue !== null ? (
              <span>{convertMinutesToHHMM(detail.fixedValue as unknown as number) || '-'}</span>
            ) : (
              '-'
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
              values?.checkStartBefore ? (
                <Input
                  type="time"
                  value={values?.startBeforeTime || ''}
                  onChange={e => handleFieldChange(rowId, 'startBeforeTime', e.target.value || null)}
                  className="gba:w-[100px]"
                  disabled={isSaving}
                />
              ) : (
                <span>-</span>
              )
            ) : (
              <span>{detail.startBeforeTime || '-'}</span>
            )}
          </TableCell>

          {/* Include/Exclude Option */}
          <TableCell>
            {isEditing ? (
              <Combobox
                options={INCLUDE_EXCLUDE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.includeExcludeOption || ''}
                onValueChange={value => handleFieldChange(rowId, 'includeExcludeOption', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
            ) : (
              <Badge variant="outline">
                {findIncludeExcludeOption(detail.includeExcludeOption)?.displayValue || detail.includeExcludeOption}
              </Badge>
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

          {/* Actions */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveRow(rowId, detail)}
                  disabled={!isValid || !isDirty || isSaving}
                  data-testid={formatDataTestId(dataTestId, `save-row-button-${rowId}`)}
                >
                  <CheckIcon className="gba:h-4 gba:w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelRowEdit(rowId)}
                  disabled={isSaving}
                  data-testid={formatDataTestId(dataTestId, `cancel-row-button-${rowId}`)}
                >
                  <XIcon className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            ) : (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(detail)}
                  data-testid={formatDataTestId(dataTestId, `edit-row-button-${rowId}`)}
                >
                  <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteRequest(detail)}
                  data-testid={formatDataTestId(dataTestId, `delete-row-button-${rowId}`)}
                >
                  <TrashIcon className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            )}
          </TableCell>
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
      findTimeIssueTypeOption,
      findAppliedDayOption,
      findCalculationTypeOption,
      findIncludeExcludeOption,
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
    const isValid = isRowValid(rowId)
    const values = editingRows[rowId]
    const alternativeOptions = getAlternativeOptions()

    return (
      <TableRow key="new-row" data-testid={formatDataTestId(dataTestId, 'new-row')}>
        {/* Display Order */}
        <TableCell>
          <Input
            type="number"
            min={0}
            max={details.length}
            value={values?.displayOrder ?? 0}
            onChange={e => handleFieldChange(rowId, 'displayOrder', Number.parseInt(e.target.value) || 0)}
            className="gba:w-[60px]"
            disabled={isSaving}
          />
        </TableCell>

        {/* Time Issue Type */}
        <TableCell>
          <Combobox
            options={TIME_ISSUE_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
            value={values?.timeIssueType || ''}
            onValueChange={value => handleFieldChange(rowId, 'timeIssueType', value)}
            placeholder="Select"
            className="gba:w-[150px] gba:overflow-hidden gba:[&_span]:truncate"
            disabled={isSaving}
          />
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
          <Combobox
            options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
            value={values?.fromAppliedDay || ''}
            onValueChange={value => handleFieldChange(rowId, 'fromAppliedDay', value)}
            placeholder="Select"
            className="gba:w-full"
            disabled={isSaving}
          />
        </TableCell>

        {/* Start Time */}
        <TableCell>
          <Input
            type="time"
            value={values?.startTime || ''}
            onChange={e => handleFieldChange(rowId, 'startTime', e.target.value)}
            className="gba:w-[100px]"
            disabled={isSaving}
          />
        </TableCell>

        {/* Day To */}
        <TableCell>
          <Combobox
            options={INCREMENT_APPLIED_DAYS_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
            value={values?.toAppliedDate || ''}
            onValueChange={value => handleFieldChange(rowId, 'toAppliedDate', value)}
            placeholder="Select"
            className="gba:w-full"
            disabled={isSaving}
          />
        </TableCell>

        {/* End Time */}
        <TableCell>
          <Input
            type="time"
            value={values?.endTime || ''}
            onChange={e => handleFieldChange(rowId, 'endTime', e.target.value)}
            className="gba:w-[100px]"
            disabled={isSaving}
          />
        </TableCell>

        {/* Sum Time */}
        <TableCell>
          <span>{values?.sumTime || '-'}</span>
        </TableCell>

        {/* Time Type */}
        <TableCell>
          <Combobox
            options={timeTypes.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
            value={values?.timeTypeId || ''}
            onValueChange={value => handleFieldChange(rowId, 'timeTypeId', value)}
            placeholder="Select"
            className="gba:w-[170px] gba:overflow-hidden gba:[&_span]:truncate"
            disabled={isSaving}
          />
        </TableCell>

        {/* Calculation Type */}
        <TableCell>
          <Combobox
            options={INCREMENT_CALCULATION_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
            value={values?.incrementCalculationType || ''}
            onValueChange={value => handleFieldChange(rowId, 'incrementCalculationType', value)}
            placeholder="Select"
            className="gba:w-full"
            disabled={isSaving}
          />
        </TableCell>

        {/* Fixed Value */}
        <TableCell>
          {values?.incrementCalculationType !== 'CALCULATED_INC_CALC_TYPE' ? (
            <Input
              type="text"
              placeholder="HH:mm"
              value={values?.fixedValue || ''}
              onChange={e => handleFieldChange(rowId, 'fixedValue', e.target.value || null)}
              className="gba:w-[80px]"
              disabled={isSaving}
            />
          ) : (
            <span>-</span>
          )}
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
          {values?.checkStartBefore ? (
            <Input
              type="time"
              value={values?.startBeforeTime || ''}
              onChange={e => handleFieldChange(rowId, 'startBeforeTime', e.target.value || null)}
              className="gba:w-[100px]"
              disabled={isSaving}
            />
          ) : (
            <span>-</span>
          )}
        </TableCell>

        {/* Include/Exclude Option */}
        <TableCell>
          <Combobox
            options={INCLUDE_EXCLUDE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
            value={values?.includeExcludeOption || ''}
            onValueChange={value => handleFieldChange(rowId, 'includeExcludeOption', value)}
            placeholder="Select"
            className="gba:w-full"
            disabled={isSaving}
          />
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

        {/* Actions */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSaveRow(rowId)}
              disabled={!isValid || isSaving}
              data-testid={formatDataTestId(dataTestId, 'create-row-button')}
            >
              <CheckIcon className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleCancelRowEdit(rowId)}
              disabled={isSaving}
              data-testid={formatDataTestId(dataTestId, 'cancel-new-row-button')}
            >
              <XIcon className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }, [
    isAddingNewRow,
    editingRows,
    details,
    timeTypes,
    isRowSaving,
    isRowValid,
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
