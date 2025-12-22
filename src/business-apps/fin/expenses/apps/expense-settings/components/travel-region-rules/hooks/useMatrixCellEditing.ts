import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { toast } from '@newwork/nw-design-system'
import { EditableCell, EditableAllowanceRegionRule, CurrencyOption, UsageInfo } from '../types'
import { ExpenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface UseMatrixCellEditingProps {
  accessToken: string
  currencies: CurrencyOption[]
  allowanceRegionRules: EditableAllowanceRegionRule[]
  editableCells: EditableCell[]
  setEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>
  setAllowanceRegionRules: React.Dispatch<React.SetStateAction<EditableAllowanceRegionRule[]>>
  checkDetailUsage: (detailId: string) => Promise<UsageInfo>
  getExpenseSettingsClient: () => ExpenseSettingsClient
  loadData: () => Promise<void>
}

export const useMatrixCellEditing = ({
  accessToken,
  currencies,
  allowanceRegionRules,
  editableCells,
  setEditableCells,
  setAllowanceRegionRules,
  checkDetailUsage,
  getExpenseSettingsClient,
  loadData
}: UseMatrixCellEditingProps) => {
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [editingCellUsageInfo, setEditingCellUsageInfo] = useState<UsageInfo | null>(null)
  const [isCheckingCellUsage, setIsCheckingCellUsage] = useState(false)
  const [isSavingCell, setIsSavingCell] = useState(false)

  // Enter cell edit mode and check usage
  const handleEnterCellEdit = useCallback(
    async (cellId: string) => {
      const cell = editableCells.find(c => c.id === cellId)
      if (!cell || cell.isNew) return

      setEditingCellId(cellId)

      // If it's a new cell (no ID yet), skip usage check
      if (cell.isNew) {
        setEditingCellUsageInfo({ isUsed: false, usedIn: {}, message: '' })
        return
      }

      setIsCheckingCellUsage(true)
      setEditingCellUsageInfo(null)

      try {
        // Check if THIS SPECIFIC DETAIL (not the rule) is used in transactions
        const detailUsage = await checkDetailUsage(cell.id)
        setEditingCellUsageInfo(detailUsage)
        if (detailUsage.isUsed) {
          toast.info(`This detail is used in transactions. Only "Valid To" can be edited.`)
        }
      } catch (error) {
        console.error('Error checking detail usage:', error)
        // Default to restricted mode for safety
        setEditingCellUsageInfo({
          isUsed: true,
          usedIn: {},
          message: 'Unable to verify usage. Editing restricted for safety.'
        })
      } finally {
        setIsCheckingCellUsage(false)
      }
    },
    [editableCells, checkDetailUsage]
  )

  // Update cell field value
  const updateCellField = useCallback(
    (cellId: string, validityPeriodId: string, field: keyof EditableCell, value: any) => {
      setEditableCells(prev =>
        prev.map(c =>
          c.id === cellId && c.validityPeriodId === validityPeriodId ? { ...c, [field]: value, isModified: true } : c
        )
      )
    },
    [setEditableCells]
  )

  // Save a single cell immediately
  const handleSaveSingleCell = useCallback(
    async (cell: EditableCell) => {
      if (!accessToken) {
        toast.error('Access token is missing')
        return
      }

      // CRITICAL: Get the LATEST cell from state to ensure we have the current version
      // The 'cell' parameter might be stale if the modal stayed open after a previous save
      const latestCell = editableCells.find(
        c =>
          (cell.id ? c.id === cell.id : c.validityPeriodId === cell.validityPeriodId) &&
          c.validityPeriodId === cell.validityPeriodId
      )

      if (!latestCell) {
        toast.error('Cell not found in current state')
        return
      }

      // Use latestCell for all operations to ensure we have the current version
      const cellToSave = latestCell

      // Validation: amount must be > 0
      if (cellToSave.amount <= 0) {
        toast.error('Amount must be greater than 0')
        return
      }

      // Validation: activeFrom is required
      if (!cellToSave.activeFrom) {
        toast.error('Valid From date is required')
        return
      }

      setIsSavingCell(true)
      try {
        const client = getExpenseSettingsClient()
        const rule = allowanceRegionRules.find(r => r.id === cellToSave.allowanceRegionRuleId)

        if (!rule) {
          throw new Error('Rule not found')
        }

        // Validation: Detail validity must be within Rule validity
        const detailFrom = dayjs(cellToSave.activeFrom)
        const detailTo = cellToSave.activeTo ? dayjs(cellToSave.activeTo) : null
        const ruleFrom = rule.activeFrom ? dayjs(rule.activeFrom) : null
        const ruleTo = rule.activeTo ? dayjs(rule.activeTo) : null

        // Check: Detail's activeFrom must be >= Rule's activeFrom
        if (ruleFrom && detailFrom.isBefore(ruleFrom)) {
          toast.error(
            `Detail's "Valid From" (${detailFrom.format('DD/MM/YYYY')}) cannot be before the rule's "Valid From" (${ruleFrom.format('DD/MM/YYYY')})`
          )
          setIsSavingCell(false)
          return
        }

        // Check: Detail's activeTo must be <= Rule's activeTo (if rule has an end date)
        if (ruleTo && detailTo && detailTo.isAfter(ruleTo)) {
          toast.error(
            `Detail's "Valid To" (${detailTo.format('DD/MM/YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD/MM/YYYY')})`
          )
          setIsSavingCell(false)
          return
        }

        // Check: Detail's activeFrom must be <= Rule's activeTo (if rule has an end date)
        if (ruleTo && detailFrom.isAfter(ruleTo)) {
          toast.error(
            `Detail's "Valid From" (${detailFrom.format('DD/MM/YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD/MM/YYYY')})`
          )
          setIsSavingCell(false)
          return
        }

        // Use stored refs or find them from catalogs
        const currency = currencies.find(c => c.code === cellToSave.currencyCode)
        const currencyRef = cellToSave.currencyRef || currency?.id

        // For countryRef: must be provided in cell (from TravelRegion objectValue)
        const countryRef = cellToSave.countryRef

        // Validation: countryRef is required
        if (!countryRef) {
          toast.error('Country reference is missing. Please ensure travel regions have country data.')
          setIsSavingCell(false)
          return
        }

        // Build the detail payload
        const detailPayload = {
          allowanceRegionRuleDetail: {
            ...(cellToSave.id && { id: cellToSave.id }),
            amount: cellToSave.amount,
            currencyRef: currencyRef,
            activeFrom: cellToSave.activeFrom,
            activeTo: cellToSave.activeTo || null,
            travelRegionRef: cellToSave.travelRegionId,
            countryRef: countryRef,
            allowanceRegionRule: rule.id,
            ...(cellToSave.id && cellToSave.version !== undefined && { version: cellToSave.version })
          },
          changeMode: cellToSave.id ? 'UPDATE' : 'INSERT'
        }

        const response = await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)

        toast.success('Changes saved successfully')

        // Close edit mode
        setEditingCellId(null)
        setEditingCellUsageInfo(null)

        // Update the cell with the data from response, but fetch the correct version separately
        // We do a targeted update to avoid reloading all data and losing search/pagination state
        setEditableCells(prev =>
          prev.map(c => {
            const isMatchingCell = cellToSave.id
              ? c.id === cellToSave.id && c.validityPeriodId === cellToSave.validityPeriodId
              : c.validityPeriodId === cellToSave.validityPeriodId

            if (isMatchingCell) {
              // Use the data from the response
              const updatedCell = {
                ...c,
                id: c.id || response.allowanceRegionRuleDetail?.id,
                amount: response.allowanceRegionRuleDetail?.amount ?? c.amount,
                activeFrom: response.allowanceRegionRuleDetail?.activeFrom ?? c.activeFrom,
                activeTo: response.allowanceRegionRuleDetail?.activeTo ?? c.activeTo,
                currencyCode: response.allowanceRegionRuleDetail?.currencyRef?.split(':').pop() ?? c.currencyCode,
                isNew: false,
                isModified: false,
                // Backend returns OLD version in response, so we increment it
                // This is a known backend quirk - it increments in DB but returns old version
                version: response.allowanceRegionRuleDetail?.version
                  ? response.allowanceRegionRuleDetail.version + 1
                  : (c.version || 0) + 1
              }

              return updatedCell
            }
            return c
          })
        )
      } catch (error) {
        console.error('Error saving cell:', error)
        toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsSavingCell(false)
      }
    },
    [accessToken, currencies, allowanceRegionRules, editableCells, getExpenseSettingsClient, setEditableCells, loadData]
  )

  // Cancel cell editing
  const handleCancelCellEdit = useCallback(() => {
    setEditingCellId(null)
    setEditingCellUsageInfo(null)
  }, [])

  // Remove a new unsaved cell
  const handleRemoveNewCell = useCallback(
    (validityPeriodId: string, ruleId: string) => {
      // Remove the new cell from editableCells
      setEditableCells(prev => prev.filter(c => c.validityPeriodId !== validityPeriodId))

      // Also remove the validity period from the rule
      setAllowanceRegionRules(prev =>
        prev.map(r =>
          r.id === ruleId
            ? {
                ...r,
                validityPeriods: r.validityPeriods.filter(p => p.id !== validityPeriodId)
              }
            : r
        )
      )
    },
    [setEditableCells, setAllowanceRegionRules]
  )

  return {
    // State
    editingCellId,
    editingCellUsageInfo,
    isCheckingCellUsage,
    isSavingCell,

    // Actions
    handleEnterCellEdit,
    updateCellField,
    handleSaveSingleCell,
    handleCancelCellEdit,
    handleRemoveNewCell,
    setEditingCellId,
    setEditingCellUsageInfo
  }
}
