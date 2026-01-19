import React, { useCallback, useState } from 'react'
import { Input, Combobox, Checkbox, Badge, TableRow, TableCell } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedRoundingRuleVersionDetail } from '../types/rounding-rule-version-details'
import {
  RoundingRuleDetailRowFormData,
  roundingRuleDetailRowSchema,
  getDefaultRoundingRuleDetailValues,
  CLOCKING_TYPE_OPTIONS,
  ROUNDING_TYPE_OPTIONS,
  getRequiredFieldsForRoundingRule,
  isRoundingValueEnabled
} from '../constants/rounding-rule-constants'
import { RowActionsCell } from '@/components/table-form'
import { RequiredIndicator } from '../components/RequiredIndicator'
import { FieldErrorTooltip } from '../components/FieldErrorTooltip'

const NEW_ROW_KEY = '__new__'

export interface UseRoundingRuleDetailRowsProps {
  roundingRuleVersionId: string | null
  roundingRuleVersionDetails: TransformedRoundingRuleVersionDetail[]
  accessToken: string
  refetch: () => Promise<void>
  dataTestId: string
  onDeleteClick: (detail: TransformedRoundingRuleVersionDetail) => void
}

export interface UseRoundingRuleDetailRowsReturn {
  editingRows: Record<string, RoundingRuleDetailRowFormData>
  savingRows: Record<string, boolean>
  isAddingNew: boolean
  handleStartEdit: (detail: TransformedRoundingRuleVersionDetail) => void
  handleAddRow: () => void
  handleCancelRowEdit: (rowId: string) => void
  handleFieldChange: (
    rowId: string,
    field: keyof RoundingRuleDetailRowFormData,
    value: string | number | boolean | null
  ) => void
  handleSaveRow: (rowId: string, originalDetail?: TransformedRoundingRuleVersionDetail) => Promise<void>
  isRowValid: (rowId: string) => boolean
  isRowDirty: (rowId: string, originalDetail?: TransformedRoundingRuleVersionDetail) => boolean
  renderDataRow: (detail: TransformedRoundingRuleVersionDetail) => React.ReactNode
  renderNewRow: () => React.ReactNode | null
}

export const useRoundingRuleDetailRows = ({
  roundingRuleVersionId,
  roundingRuleVersionDetails,
  accessToken,
  refetch,
  dataTestId,
  onDeleteClick
}: UseRoundingRuleDetailRowsProps): UseRoundingRuleDetailRowsReturn => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Multi-edit state: map of rowId -> form values
  const [editingRows, setEditingRows] = useState<Record<string, RoundingRuleDetailRowFormData>>({})
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({})
  // Track which rows have attempted to save (to show errors)
  const [attemptedSave, setAttemptedSave] = useState<Set<string>>(new Set())

  const isAddingNew = NEW_ROW_KEY in editingRows

  // Find option helpers
  const findClockingTypeOption = useCallback((code: string) => {
    return CLOCKING_TYPE_OPTIONS.find(option => option.code === code)
  }, [])

  const findRoundingTypeOption = useCallback((code: string) => {
    return ROUNDING_TYPE_OPTIONS.find(option => option.code === code)
  }, [])

  // Validate a row
  const isRowValid = useCallback(
    (rowId: string) => {
      const values = editingRows[rowId]
      if (!values) return false
      const result = roundingRuleDetailRowSchema.safeParse(values)
      return result.success
    },
    [editingRows]
  )

  // Get validation errors for a row
  const getRowErrors = useCallback(
    (rowId: string): Record<string, string> => {
      const values = editingRows[rowId]
      if (!values) return {}

      const result = roundingRuleDetailRowSchema.safeParse(values)
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

  // Check if row has been modified
  const isRowDirty = useCallback(
    (rowId: string, originalDetail?: TransformedRoundingRuleVersionDetail) => {
      const values = editingRows[rowId]
      if (!values) return false

      // For new rows, check if any field has been filled
      if (rowId === NEW_ROW_KEY) {
        return (
          values.clockingType !== '' ||
          values.roundingType !== '' ||
          values.startTime !== '' ||
          values.endTime !== '' ||
          values.roundingValue !== '' ||
          values.gracePeriod !== null ||
          values.onlyFirstLast !== false
        )
      }

      // For existing rows, compare with original values
      if (!originalDetail) return false
      return (
        values.clockingType !== originalDetail.clockingType ||
        values.roundingType !== originalDetail.roundingType ||
        values.startTime !== (originalDetail.startTime || '') ||
        values.endTime !== (originalDetail.endTime || '') ||
        values.gracePeriod !== originalDetail.gracePeriod ||
        values.roundingValue !== (originalDetail.roundingValue || '') ||
        values.onlyFirstLast !== originalDetail.onlyFirstLast
      )
    },
    [editingRows]
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

  // Handle field change for a specific row
  const handleFieldChange = useCallback(
    (rowId: string, field: keyof RoundingRuleDetailRowFormData, value: string | number | boolean | null) => {
      setEditingRows(prev => {
        const currentRow = prev[rowId]
        if (!currentRow) return prev

        const updatedRow = { ...currentRow, [field]: value }

        // Reset roundingValue when roundingType changes to START or END
        if (field === 'roundingType') {
          const newType = value as string
          if (newType === 'START_ROUNDING_TYPE' || newType === 'END_ROUNDING_TYPE') {
            updatedRow.roundingValue = null
          }
        }

        return { ...prev, [rowId]: updatedRow }
      })
    },
    []
  )

  // Start editing an existing row
  const handleStartEdit = useCallback((detail: TransformedRoundingRuleVersionDetail) => {
    setEditingRows(prev => ({
      ...prev,
      [detail.id]: {
        displayOrder: detail.displayOrder,
        clockingType: detail.clockingType,
        roundingType: detail.roundingType,
        startTime: detail.startTime || '',
        endTime: detail.endTime || '',
        gracePeriod: detail.gracePeriod,
        roundingValue: detail.roundingValue || '',
        onlyFirstLast: detail.onlyFirstLast
      }
    }))
  }, [])

  // Start adding a new row
  const handleAddRow = useCallback(() => {
    const nextOrder = roundingRuleVersionDetails.length + 1
    setEditingRows(prev => ({
      ...prev,
      [NEW_ROW_KEY]: {
        ...getDefaultRoundingRuleDetailValues(),
        displayOrder: nextOrder
      }
    }))
  }, [roundingRuleVersionDetails.length])

  // Save a row (create or update)
  const handleSaveRow = useCallback(
    async (rowId: string, originalDetail?: TransformedRoundingRuleVersionDetail) => {
      const values = editingRows[rowId]
      if (!values || !roundingRuleVersionId) return

      // Mark that save was attempted (to show errors)
      setAttemptedSave(prev => new Set(prev).add(rowId))

      // Validate - if invalid, return early (errors will now be shown)
      const result = roundingRuleDetailRowSchema.safeParse(values)
      if (!result.success) return

      setSavingRows(prev => ({ ...prev, [rowId]: true }))

      try {
        const isNew = rowId === NEW_ROW_KEY
        const payload = {
          changeMode: 'INSERT',
          roundingRuleVersionDetail: {
            ...(!isNew && originalDetail ? { id: originalDetail.id, version: originalDetail.version } : {}),
            displayOrder: values.displayOrder,
            clockingType: values.clockingType,
            roundingType: values.roundingType,
            startTime: values.startTime || null,
            endTime: values.endTime || null,
            gracePeriod: values.gracePeriod || null,
            roundingValue: values.roundingValue || null,
            onlyFirstLast: values.onlyFirstLast,
            roundingRuleVersion: roundingRuleVersionId
          }
        }

        await restClient.post(
          `/employee-time/${isNew ? 'createRoundingRuleVersionDetail' : 'updateRoundingRuleVersionDetail'}`,
          payload,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        // Remove from editing state
        setEditingRows(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [rowId]: _, ...rest } = prev
          return rest
        })

        await refetch()
      } catch (error) {
        console.error('Error saving rounding rule detail:', error)
      } finally {
        setSavingRows(prev => ({ ...prev, [rowId]: false }))
      }
    },
    [editingRows, roundingRuleVersionId, restClient, accessToken, refetch]
  )

  // Render data row
  const renderDataRow = useCallback(
    (detail: TransformedRoundingRuleVersionDetail) => {
      const rowId = detail.id
      const isEditing = rowId in editingRows
      const isSaving = savingRows[rowId] || false
      const values = editingRows[rowId]

      // Get required fields based on current rounding type
      const currentRoundingType = isEditing ? values?.roundingType : detail.roundingType
      const requiredFields = getRequiredFieldsForRoundingRule(currentRoundingType)
      const showRoundingValue = isRoundingValueEnabled(currentRoundingType)

      // Get validation errors for the row (only show after save attempt)
      const errors = isEditing && attemptedSave.has(rowId) ? getRowErrors(rowId) : {}

      return (
        <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, `row-${rowId}`)}>
          {/* Display Order */}
          <TableCell>
            <span>{detail.displayOrder}</span>
          </TableCell>

          {/* Clocking Type */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={CLOCKING_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                    value={values?.clockingType || ''}
                    onValueChange={value => handleFieldChange(rowId, 'clockingType', value)}
                    placeholder="Select"
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.clockingType && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.clockingType} />
              </div>
            ) : (
              <Badge variant="outline">
                {findClockingTypeOption(detail.clockingType)?.displayValue || detail.clockingType}
              </Badge>
            )}
          </TableCell>

          {/* Rounding Type */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Combobox
                    options={ROUNDING_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                    value={values?.roundingType || ''}
                    onValueChange={value => handleFieldChange(rowId, 'roundingType', value)}
                    placeholder="Select"
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.roundingType && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.roundingType} />
              </div>
            ) : (
              <Badge variant="outline">
                {findRoundingTypeOption(detail.roundingType)?.displayValue || detail.roundingType}
              </Badge>
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
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.startTime && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.startTime} />
              </div>
            ) : (
              <span>{detail.startTime || '-'}</span>
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
                    className="gba:w-full"
                    disabled={isSaving}
                  />
                  {requiredFields.endTime && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.endTime} />
              </div>
            ) : (
              <span>{detail.endTime || '-'}</span>
            )}
          </TableCell>

          {/* Grace Period */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.gracePeriod || ''}
                onChange={e => handleFieldChange(rowId, 'gracePeriod', e.target.value || null)}
                className="gba:w-full"
                disabled={isSaving}
              />
            ) : (
              <span>{detail.gracePeriod || '-'}</span>
            )}
          </TableCell>

          {/* Rounding Value */}
          <TableCell>
            {isEditing ? (
              <div className="gba:flex gba:items-center gba:gap-1">
                <div className="gba:relative">
                  <Input
                    type="time"
                    value={values?.roundingValue || ''}
                    onChange={e => handleFieldChange(rowId, 'roundingValue', e.target.value)}
                    className="gba:w-full"
                    disabled={isSaving || !showRoundingValue}
                  />
                  {requiredFields.roundingValue && <RequiredIndicator />}
                </div>
                <FieldErrorTooltip error={errors.roundingValue} />
              </div>
            ) : (
              <span>{detail.roundingValue || '-'}</span>
            )}
          </TableCell>

          {/* Only First/Last */}
          <TableCell>
            {isEditing ? (
              <Checkbox
                checked={values?.onlyFirstLast || false}
                onCheckedChange={checked => handleFieldChange(rowId, 'onlyFirstLast', !!checked)}
                disabled={isSaving}
              />
            ) : detail.onlyFirstLast ? (
              <span>✓</span>
            ) : (
              <span>-</span>
            )}
          </TableCell>

          {/* Actions - isValid/isDirty forced to true so Save is always clickable, validation happens on click */}
          <TableCell>
            <RowActionsCell
              isEditing={isEditing}
              isSaving={isSaving}
              isValid={true}
              isDirty={true}
              onSave={() => handleSaveRow(rowId, detail)}
              onCancel={() => handleCancelRowEdit(rowId)}
              onEdit={() => handleStartEdit(detail)}
              onDelete={() => onDeleteClick(detail)}
              dataTestId={dataTestId}
              rowId={rowId}
            />
          </TableCell>
        </TableRow>
      )
    },
    [
      editingRows,
      savingRows,
      isRowValid,
      isRowDirty,
      getRowErrors,
      attemptedSave,
      dataTestId,
      handleFieldChange,
      handleSaveRow,
      handleCancelRowEdit,
      handleStartEdit,
      onDeleteClick,
      findClockingTypeOption,
      findRoundingTypeOption
    ]
  )

  // Render new row
  const renderNewRow = useCallback(() => {
    if (!isAddingNew) return null

    const rowId = NEW_ROW_KEY
    const values = editingRows[rowId]
    const isSaving = savingRows[rowId] || false

    // Get required fields based on current rounding type
    const requiredFields = getRequiredFieldsForRoundingRule(values?.roundingType)
    const showRoundingValue = isRoundingValueEnabled(values?.roundingType)

    // Get validation errors for the new row (only show after save attempt)
    const errors = attemptedSave.has(rowId) ? getRowErrors(rowId) : {}

    return (
      <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, 'new-row')}>
        {/* Display Order */}
        <TableCell>
          <span>{values?.displayOrder}</span>
        </TableCell>

        {/* Clocking Type */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={CLOCKING_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.clockingType || ''}
                onValueChange={value => handleFieldChange(rowId, 'clockingType', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.clockingType && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.clockingType} />
          </div>
        </TableCell>

        {/* Rounding Type */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Combobox
                options={ROUNDING_TYPE_OPTIONS.map(o => ({ value: o.code, label: o.displayValue }))}
                value={values?.roundingType || ''}
                onValueChange={value => handleFieldChange(rowId, 'roundingType', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.roundingType && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.roundingType} />
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
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.startTime && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.startTime} />
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
                className="gba:w-full"
                disabled={isSaving}
              />
              {requiredFields.endTime && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.endTime} />
          </div>
        </TableCell>

        {/* Grace Period */}
        <TableCell>
          <Input
            type="time"
            value={values?.gracePeriod || ''}
            onChange={e => handleFieldChange(rowId, 'gracePeriod', e.target.value || null)}
            className="gba:w-full"
            disabled={isSaving}
          />
        </TableCell>

        {/* Rounding Value */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:relative">
              <Input
                type="time"
                value={values?.roundingValue || ''}
                onChange={e => handleFieldChange(rowId, 'roundingValue', e.target.value)}
                className="gba:w-full"
                disabled={isSaving || !showRoundingValue}
              />
              {requiredFields.roundingValue && <RequiredIndicator />}
            </div>
            <FieldErrorTooltip error={errors.roundingValue} />
          </div>
        </TableCell>

        {/* Only First/Last */}
        <TableCell>
          <Checkbox
            checked={values?.onlyFirstLast || false}
            onCheckedChange={checked => handleFieldChange(rowId, 'onlyFirstLast', !!checked)}
            disabled={isSaving}
          />
        </TableCell>

        {/* Actions - isValid forced to true so Save is always clickable, validation happens on click */}
        <TableCell>
          <RowActionsCell
            isEditing={true}
            isSaving={isSaving}
            isValid={true}
            isNewRow={true}
            onSave={() => handleSaveRow(rowId)}
            onCancel={() => handleCancelRowEdit(rowId)}
            onEdit={() => {}}
            onDelete={() => {}}
            dataTestId={dataTestId}
            rowId={rowId}
          />
        </TableCell>
      </TableRow>
    )
  }, [
    isAddingNew,
    editingRows,
    savingRows,
    isRowValid,
    getRowErrors,
    attemptedSave,
    dataTestId,
    handleFieldChange,
    handleSaveRow,
    handleCancelRowEdit
  ])

  return {
    editingRows,
    savingRows,
    isAddingNew,
    handleStartEdit,
    handleAddRow,
    handleCancelRowEdit,
    handleFieldChange,
    handleSaveRow,
    isRowValid,
    isRowDirty,
    renderDataRow,
    renderNewRow
  }
}
