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
  loadData: (travelRegionSetId: string) => Promise<void>
  travelRegionSetId: string
  getExpenseSettingsClient: () => ExpenseSettingsClient
}

export const useMatrixCellEditing = ({
  accessToken,
  currencies,
  allowanceRegionRules,
  editableCells,
  setEditableCells,
  setAllowanceRegionRules,
  checkDetailUsage,
  loadData,
  travelRegionSetId,
  getExpenseSettingsClient
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
          c.id === cellId || c.validityPeriodId === validityPeriodId ? { ...c, [field]: value, isModified: true } : c
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

      // Validation: amount must be > 0
      if (cell.amount <= 0) {
        toast.error('Amount must be greater than 0')
        return
      }

      // Validation: activeFrom is required
      if (!cell.activeFrom) {
        toast.error('Valid From date is required')
        return
      }

      setIsSavingCell(true)
      try {
        const client = getExpenseSettingsClient()
        const rule = allowanceRegionRules.find(r => r.id === cell.allowanceRegionRuleId)

        if (!rule) {
          throw new Error('Rule not found')
        }

        // Validation: Detail validity must be within Rule validity
        const detailFrom = dayjs(cell.activeFrom)
        const detailTo = cell.activeTo ? dayjs(cell.activeTo) : null
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
        const currency = currencies.find(c => c.code === cell.currencyCode)
        const currencyRef = cell.currencyRef || currency?.id

        // For countryRef: use stored value, or derive from travel region code
        let countryRef = cell.countryRef
        if (!countryRef && cell.travelRegionId) {
          const regionParts = cell.travelRegionId.split(':')
          if (regionParts.length >= 3) {
            const regionCode = regionParts[regionParts.length - 1]
            // Extract first 2 chars as country code and ensure uppercase
            const countryCode = regionCode.substring(0, 2).toUpperCase()
            countryRef = `Country:v1:${countryCode}`
          }
        }

        // Validation: countryRef is required
        if (!countryRef) {
          toast.error('Country reference is missing. Cannot save detail.')
          setIsSavingCell(false)
          return
        }

        console.log('💾 Saving cell with countryRef:', countryRef, 'derived from:', cell.travelRegionId)

        // Build the detail payload
        const detailPayload = {
          allowanceRegionRuleDetail: {
            ...(cell.id && { id: cell.id }),
            amount: cell.amount,
            currencyRef: currencyRef,
            activeFrom: cell.activeFrom,
            activeTo: cell.activeTo || null,
            travelRegionRef: cell.travelRegionId,
            countryRef: countryRef,
            allowanceRegionRule: rule.id,
            ...(cell.id && cell.version !== undefined && { version: cell.version })
          },
          changeMode: cell.id ? 'UPDATE' : 'INSERT'
        }

        await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)

        toast.success('Changes saved successfully')

        // Close edit mode
        setEditingCellId(null)
        setEditingCellUsageInfo(null)

        // Reload data to get updated versions
        await loadData(travelRegionSetId)
      } catch (error) {
        console.error('Error saving cell:', error)
        toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsSavingCell(false)
      }
    },
    [accessToken, currencies, allowanceRegionRules, loadData, travelRegionSetId, getExpenseSettingsClient]
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
