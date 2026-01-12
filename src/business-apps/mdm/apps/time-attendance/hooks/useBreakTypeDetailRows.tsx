import React, { useCallback, useMemo, useState } from 'react'
import { TableRow, TableCell, Button, Input, Combobox, Checkbox, Badge } from '@newwork/nw-design-system'
import { PencilSimpleLineIcon, TrashIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedBreakTypeVersionDetail } from '../types/break-type-version-details'
import {
  BREAK_TYPE_OPTIONS,
  PAY_OPTIONS,
  breakTypeDetailRowSchema,
  BreakTypeDetailRowFormData,
  getDefaultBreakTypeDetailValues,
  calculateLength
} from '../constants/break-type-constants'

const NEW_ROW_KEY = '__new__'

interface UseBreakTypeDetailRowsProps {
  breakTypeVersionId: string | null
  breakTypeVersionDetails: TransformedBreakTypeVersionDetail[]
  accessToken: string
  dataTestId: string
  refetch: () => void
  onDeleteClick: (detail: TransformedBreakTypeVersionDetail | null) => void
}

interface UseBreakTypeDetailRowsReturn {
  editingRows: Record<string, BreakTypeDetailRowFormData>
  isAddingNew: boolean
  startAddingNew: () => void
  renderDataRow: (detail: TransformedBreakTypeVersionDetail) => React.ReactNode
  renderNewRow: () => React.ReactNode | null
}

export const useBreakTypeDetailRows = ({
  breakTypeVersionId,
  breakTypeVersionDetails,
  accessToken,
  dataTestId,
  refetch,
  onDeleteClick
}: UseBreakTypeDetailRowsProps): UseBreakTypeDetailRowsReturn => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Multi-edit state: each row being edited has its own form values
  const [editingRows, setEditingRows] = useState<Record<string, BreakTypeDetailRowFormData>>({})
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({})

  const isAddingNew = useMemo(() => NEW_ROW_KEY in editingRows, [editingRows])

  // Start editing a row
  const startEditingRow = useCallback((rowId: string, detail: TransformedBreakTypeVersionDetail) => {
    setEditingRows(prev => ({
      ...prev,
      [rowId]: {
        type: detail.type,
        displayOrder: detail.displayOrder,
        startTime: detail.startTime,
        endTime: detail.endTime,
        hours: detail.hours,
        length: detail.length,
        mandatory: detail.mandatory,
        payOption: detail.payOption,
        combinedWithBreakTypeVersionDetailId: detail.combinedWithBreakTypeVersionDetailId
      }
    }))
  }, [])

  // Start adding new row
  const startAddingNew = useCallback(() => {
    const nextOrder =
      breakTypeVersionDetails.length > 0 ? Math.max(...breakTypeVersionDetails.map(d => d.displayOrder)) + 1 : 1

    setEditingRows(prev => ({
      ...prev,
      [NEW_ROW_KEY]: {
        ...getDefaultBreakTypeDetailValues(),
        displayOrder: nextOrder
      }
    }))
  }, [breakTypeVersionDetails])

  // Cancel editing a row
  const handleCancelRowEdit = useCallback((rowId: string) => {
    setEditingRows(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [rowId]: _, ...rest } = prev
      return rest
    })
  }, [])

  // Handle field change for a specific row
  const handleFieldChange = useCallback(
    (rowId: string, field: keyof BreakTypeDetailRowFormData, value: string | number | boolean | null) => {
      setEditingRows(prev => {
        const currentRow = prev[rowId]
        if (!currentRow) return prev

        const updatedRow = { ...currentRow, [field]: value }

        // Auto-calculate length for Fixed type when start/end changes
        if (updatedRow.type === 'BREAK_TYPE_FIXED' && (field === 'startTime' || field === 'endTime')) {
          updatedRow.length = calculateLength(updatedRow.startTime ?? null, updatedRow.endTime ?? null)
        }

        // Reset irrelevant fields when type changes
        if (field === 'type') {
          const newType = value as string
          if (newType === 'BREAK_TYPE_FIXED' || newType === 'BREAK_TYPE_CLOCKING') {
            updatedRow.hours = null
          } else if (newType === 'BREAK_TYPE_ATTENDANCE' || newType === 'BREAK_TYPE_TARGET_TIME') {
            updatedRow.startTime = null
            updatedRow.endTime = null
          }
          // Reset length when type changes (will be recalculated if needed)
          if (newType !== 'BREAK_TYPE_FIXED') {
            updatedRow.length = null
          }
        }

        return { ...prev, [rowId]: updatedRow }
      })
    },
    []
  )

  // Validate a row
  const isRowValid = useCallback(
    (rowId: string): boolean => {
      const values = editingRows[rowId]
      if (!values) return false
      const result = breakTypeDetailRowSchema.safeParse(values)
      return result.success
    },
    [editingRows]
  )

  // Check if row has changes
  const isRowDirty = useCallback(
    (rowId: string, originalDetail?: TransformedBreakTypeVersionDetail): boolean => {
      if (rowId === NEW_ROW_KEY) {
        const values = editingRows[rowId]
        return !!values && !!values.type
      }
      const currentValues = editingRows[rowId]
      if (!currentValues || !originalDetail) return false

      return (
        currentValues.type !== originalDetail.type ||
        currentValues.displayOrder !== originalDetail.displayOrder ||
        currentValues.startTime !== originalDetail.startTime ||
        currentValues.endTime !== originalDetail.endTime ||
        currentValues.hours !== originalDetail.hours ||
        currentValues.length !== originalDetail.length ||
        currentValues.mandatory !== originalDetail.mandatory ||
        currentValues.payOption !== originalDetail.payOption ||
        currentValues.combinedWithBreakTypeVersionDetailId !== originalDetail.combinedWithBreakTypeVersionDetailId
      )
    },
    [editingRows]
  )

  // Save a row
  const handleSaveRow = useCallback(
    async (rowId: string, originalDetail?: TransformedBreakTypeVersionDetail) => {
      const values = editingRows[rowId]
      if (!values || !breakTypeVersionId) return

      setSavingRows(prev => ({ ...prev, [rowId]: true }))

      try {
        const isNew = rowId === NEW_ROW_KEY
        const isFixed = values.type === 'BREAK_TYPE_FIXED'
        const isFixedOrClocking = values.type === 'BREAK_TYPE_FIXED' || values.type === 'BREAK_TYPE_CLOCKING'
        const isAttendanceOrTargetTime =
          values.type === 'BREAK_TYPE_ATTENDANCE' || values.type === 'BREAK_TYPE_TARGET_TIME'

        // Calculate final length for Fixed type
        let finalLength: string | null = null
        if (isFixed) {
          finalLength = calculateLength(values.startTime ?? null, values.endTime ?? null)
        } else if (values.type === 'BREAK_TYPE_CLOCKING' || isAttendanceOrTargetTime) {
          finalLength = values.length ?? null
        }

        const payload = {
          changeMode: 'INSERT',
          breakTypeVersionDetail: {
            breakTypeVersion: breakTypeVersionId,
            type: values.type,
            displayOrder: values.displayOrder,
            startTime: isFixedOrClocking ? values.startTime || null : null,
            endTime: isFixedOrClocking ? values.endTime || null : null,
            hours: isAttendanceOrTargetTime ? values.hours || null : null,
            length: finalLength,
            mandatory: values.mandatory,
            payOption: values.payOption || null,
            combinedWithBreakTypeVersionDetail: values.combinedWithBreakTypeVersionDetailId || null,
            ...(originalDetail?.id ? { id: originalDetail.id, version: originalDetail.version } : {})
          }
        }

        const endpoint = isNew ? 'createBreakTypeVersionDetail' : 'updateBreakTypeVersionDetail'
        await restClient.post(`/employee-time/${endpoint}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        handleCancelRowEdit(rowId)
        await refetch()
      } catch (error) {
        console.error('Error saving break type detail:', error)
      } finally {
        setSavingRows(prev => ({ ...prev, [rowId]: false }))
      }
    },
    [editingRows, breakTypeVersionId, accessToken, restClient, refetch, handleCancelRowEdit]
  )

  // Get combined options (exclude current row if editing)
  const getCombinedOptions = useCallback(
    (currentDetailId?: string) => {
      return breakTypeVersionDetails
        .filter(detail => detail.id !== currentDetailId)
        .map(detail => ({
          value: detail.id,
          label: `Order ${detail.displayOrder} - ${BREAK_TYPE_OPTIONS.find(opt => opt.code === detail.type)?.displayValue || detail.type}`
        }))
    },
    [breakTypeVersionDetails]
  )

  // Render a data row (existing detail)
  const renderDataRow = useCallback(
    (detail: TransformedBreakTypeVersionDetail): React.ReactNode => {
      const rowId = detail.id
      const isEditing = rowId in editingRows
      const values = editingRows[rowId]
      const isSaving = savingRows[rowId] || false
      const isValid = isRowValid(rowId)
      const isDirty = isRowDirty(rowId, detail)

      // Determine field states based on type
      const currentType = isEditing ? values?.type : detail.type
      const isFixedOrClocking = currentType === 'BREAK_TYPE_FIXED' || currentType === 'BREAK_TYPE_CLOCKING'
      const isAttendanceOrTargetTime =
        currentType === 'BREAK_TYPE_ATTENDANCE' || currentType === 'BREAK_TYPE_TARGET_TIME'
      const isFixed = currentType === 'BREAK_TYPE_FIXED'

      const combinedOptions = getCombinedOptions(detail.id)

      return (
        <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, `row-${rowId}`)}>
          {/* Display Order - read only */}
          <TableCell>{detail.displayOrder}</TableCell>

          {/* Type / Kind */}
          <TableCell>
            {isEditing ? (
              <Combobox
                options={BREAK_TYPE_OPTIONS.map(opt => ({ value: opt.code, label: opt.displayValue }))}
                value={values?.type || ''}
                onValueChange={value => handleFieldChange(rowId, 'type', value)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
              />
            ) : (
              <Badge variant="outline">
                {BREAK_TYPE_OPTIONS.find(opt => opt.code === detail.type)?.displayValue || detail.type}
              </Badge>
            )}
          </TableCell>

          {/* Start Time */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.startTime || ''}
                onChange={e => handleFieldChange(rowId, 'startTime', e.target.value || null)}
                className="gba:w-full"
                disabled={isSaving || !isFixedOrClocking}
              />
            ) : (
              detail.startTime || '-'
            )}
          </TableCell>

          {/* End Time */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.endTime || ''}
                onChange={e => handleFieldChange(rowId, 'endTime', e.target.value || null)}
                className="gba:w-full"
                disabled={isSaving || !isFixedOrClocking}
              />
            ) : (
              detail.endTime || '-'
            )}
          </TableCell>

          {/* Hours */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.hours || ''}
                onChange={e => handleFieldChange(rowId, 'hours', e.target.value || null)}
                className="gba:w-full"
                disabled={isSaving || !isAttendanceOrTargetTime}
              />
            ) : (
              detail.hours || '-'
            )}
          </TableCell>

          {/* Length */}
          <TableCell>
            {isEditing ? (
              <Input
                type="time"
                value={values?.length || ''}
                onChange={e => handleFieldChange(rowId, 'length', e.target.value || null)}
                className="gba:w-full"
                disabled={isSaving || isFixed}
                readOnly={isFixed}
              />
            ) : (
              detail.length || '-'
            )}
          </TableCell>

          {/* Mandatory */}
          <TableCell>
            {isEditing ? (
              <Checkbox
                checked={values?.mandatory || false}
                onCheckedChange={checked => handleFieldChange(rowId, 'mandatory', !!checked)}
                disabled={isSaving}
              />
            ) : detail.mandatory ? (
              <CheckIcon className="gba:h-4 gba:w-4" />
            ) : (
              '-'
            )}
          </TableCell>

          {/* Pay Option / Setting */}
          <TableCell>
            {isEditing ? (
              <Combobox
                options={PAY_OPTIONS.map(opt => ({ value: opt.code, label: opt.displayValue }))}
                value={values?.payOption || ''}
                onValueChange={value => handleFieldChange(rowId, 'payOption', value || null)}
                placeholder="Select"
                className="gba:w-full"
                disabled={isSaving}
                allowClear
              />
            ) : (
              PAY_OPTIONS.find(opt => opt.code === detail.payOption)?.displayValue || '-'
            )}
          </TableCell>

          {/* Combine */}
          <TableCell>
            {isEditing ? (
              <Combobox
                options={combinedOptions}
                value={values?.combinedWithBreakTypeVersionDetailId || ''}
                onValueChange={value => handleFieldChange(rowId, 'combinedWithBreakTypeVersionDetailId', value || null)}
                placeholder="None"
                className="gba:w-full"
                disabled={isSaving}
                allowClear
              />
            ) : (
              (() => {
                const combined = breakTypeVersionDetails.find(d => d.id === detail.combinedWithBreakTypeVersionDetailId)
                return combined ? `Order ${combined.displayOrder}` : 'None'
              })()
            )}
          </TableCell>

          {/* Actions */}
          <TableCell>
            <div className="gba:flex gba:items-center gba:gap-1">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveRow(rowId, detail)}
                    disabled={!isValid || isSaving || !isDirty}
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
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditingRow(rowId, detail)}
                    data-testid={formatDataTestId(dataTestId, `edit-row-button-${rowId}`)}
                  >
                    <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(detail)}
                    data-testid={formatDataTestId(dataTestId, `delete-row-button-${rowId}`)}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4" />
                  </Button>
                </>
              )}
            </div>
          </TableCell>
        </TableRow>
      )
    },
    [
      editingRows,
      savingRows,
      dataTestId,
      isRowValid,
      isRowDirty,
      handleFieldChange,
      handleSaveRow,
      handleCancelRowEdit,
      startEditingRow,
      onDeleteClick,
      getCombinedOptions,
      breakTypeVersionDetails
    ]
  )

  // Render new row
  const renderNewRow = useCallback((): React.ReactNode | null => {
    if (!isAddingNew) return null

    const rowId = NEW_ROW_KEY
    const values = editingRows[rowId]
    const isSaving = savingRows[rowId] || false
    const isValid = isRowValid(rowId)
    const isDirty = isRowDirty(rowId)

    // Determine field states based on type
    const currentType = values?.type || ''
    const isFixedOrClocking = currentType === 'BREAK_TYPE_FIXED' || currentType === 'BREAK_TYPE_CLOCKING'
    const isAttendanceOrTargetTime = currentType === 'BREAK_TYPE_ATTENDANCE' || currentType === 'BREAK_TYPE_TARGET_TIME'
    const isFixed = currentType === 'BREAK_TYPE_FIXED'

    const combinedOptions = getCombinedOptions()

    return (
      <TableRow key={rowId} data-testid={formatDataTestId(dataTestId, 'new-row')}>
        {/* Display Order - auto calculated */}
        <TableCell>{values?.displayOrder ?? '-'}</TableCell>

        {/* Type / Kind */}
        <TableCell>
          <Combobox
            options={BREAK_TYPE_OPTIONS.map(opt => ({ value: opt.code, label: opt.displayValue }))}
            value={values?.type || ''}
            onValueChange={value => handleFieldChange(rowId, 'type', value)}
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
            onChange={e => handleFieldChange(rowId, 'startTime', e.target.value || null)}
            className="gba:w-full"
            disabled={isSaving || !isFixedOrClocking}
          />
        </TableCell>

        {/* End Time */}
        <TableCell>
          <Input
            type="time"
            value={values?.endTime || ''}
            onChange={e => handleFieldChange(rowId, 'endTime', e.target.value || null)}
            className="gba:w-full"
            disabled={isSaving || !isFixedOrClocking}
          />
        </TableCell>

        {/* Hours */}
        <TableCell>
          <Input
            type="time"
            value={values?.hours || ''}
            onChange={e => handleFieldChange(rowId, 'hours', e.target.value || null)}
            className="gba:w-full"
            disabled={isSaving || !isAttendanceOrTargetTime}
          />
        </TableCell>

        {/* Length */}
        <TableCell>
          <Input
            type="time"
            value={values?.length || ''}
            onChange={e => handleFieldChange(rowId, 'length', e.target.value || null)}
            className="gba:w-full"
            disabled={isSaving || isFixed}
            readOnly={isFixed}
          />
        </TableCell>

        {/* Mandatory */}
        <TableCell>
          <Checkbox
            checked={values?.mandatory || false}
            onCheckedChange={checked => handleFieldChange(rowId, 'mandatory', !!checked)}
            disabled={isSaving}
          />
        </TableCell>

        {/* Pay Option / Setting */}
        <TableCell>
          <Combobox
            options={PAY_OPTIONS.map(opt => ({ value: opt.code, label: opt.displayValue }))}
            value={values?.payOption || ''}
            onValueChange={value => handleFieldChange(rowId, 'payOption', value || null)}
            placeholder="Select"
            className="gba:w-full"
            disabled={isSaving}
            allowClear
          />
        </TableCell>

        {/* Combine */}
        <TableCell>
          <Combobox
            options={combinedOptions}
            value={values?.combinedWithBreakTypeVersionDetailId || ''}
            onValueChange={value => handleFieldChange(rowId, 'combinedWithBreakTypeVersionDetailId', value || null)}
            placeholder="None"
            className="gba:w-full"
            disabled={isSaving}
            allowClear
          />
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSaveRow(rowId)}
              disabled={!isValid || isSaving || !isDirty}
              data-testid={formatDataTestId(dataTestId, 'save-new-row-button')}
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
    isAddingNew,
    editingRows,
    savingRows,
    dataTestId,
    isRowValid,
    isRowDirty,
    handleFieldChange,
    handleSaveRow,
    handleCancelRowEdit,
    getCombinedOptions
  ])

  return {
    editingRows,
    isAddingNew,
    startAddingNew,
    renderDataRow,
    renderNewRow
  }
}
