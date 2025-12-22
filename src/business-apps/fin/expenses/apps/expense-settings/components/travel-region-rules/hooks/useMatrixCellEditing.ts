import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { toast } from '@newwork/nw-design-system'
import { EditableCell, EditableAllowanceRegionRule, CurrencyOption, UsageInfo } from '../types'
import { ExpenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

/**
 * Helper to validate cell amount
 */
const validateCellAmount = (amount: number): boolean => {
  if (amount <= 0) {
    toast.error('Amount must be greater than 0')
    return false
  }
  return true
}

/**
 * Helper to validate cell active from date
 */
const validateActiveFromDate = (activeFrom: string | undefined): boolean => {
  if (!activeFrom) {
    toast.error('Valid From date is required')
    return false
  }
  return true
}

/**
 * Helper to validate detail dates against rule dates
 */
const validateDetailDatesAgainstRule = (
  detailFrom: dayjs.Dayjs,
  detailTo: dayjs.Dayjs | null,
  rule: EditableAllowanceRegionRule
): boolean => {
  const ruleFrom = rule.activeFrom ? dayjs(rule.activeFrom) : null
  const ruleTo = rule.activeTo ? dayjs(rule.activeTo) : null

  if (ruleFrom && detailFrom.isBefore(ruleFrom)) {
    toast.error(
      `Detail's "Valid From" (${detailFrom.format('DD/MM/YYYY')}) cannot be before the rule's "Valid From" (${ruleFrom.format('DD/MM/YYYY')})`
    )
    return false
  }

  if (ruleTo && detailTo && detailTo.isAfter(ruleTo)) {
    toast.error(
      `Detail's "Valid To" (${detailTo.format('DD/MM/YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD/MM/YYYY')})`
    )
    return false
  }

  if (ruleTo && detailFrom.isAfter(ruleTo)) {
    toast.error(
      `Detail's "Valid From" (${detailFrom.format('DD/MM/YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD/MM/YYYY')})`
    )
    return false
  }

  return true
}

/**
 * Helper to validate country reference
 */
const validateCountryRef = (countryRef: string | undefined): boolean => {
  if (!countryRef) {
    toast.error('Country reference is missing. Please ensure travel regions have country data.')
    return false
  }
  return true
}

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
      const latestCell = editableCells.find(
        c =>
          (cell.id ? c.id === cell.id : c.validityPeriodId === cell.validityPeriodId) &&
          c.validityPeriodId === cell.validityPeriodId
      )

      if (!latestCell) {
        toast.error('Cell not found in current state')
        return
      }

      // Validate cell data
      if (!validateCellAmount(latestCell.amount)) return
      if (!validateActiveFromDate(latestCell.activeFrom)) return

      setIsSavingCell(true)
      try {
        const client = getExpenseSettingsClient()
        const rule = allowanceRegionRules.find(r => r.id === latestCell.allowanceRegionRuleId)

        if (!rule) {
          throw new Error('Rule not found')
        }

        // Validate dates against rule
        const detailFrom = dayjs(latestCell.activeFrom)
        const detailTo = latestCell.activeTo ? dayjs(latestCell.activeTo) : null

        if (!validateDetailDatesAgainstRule(detailFrom, detailTo, rule)) {
          setIsSavingCell(false)
          return
        }

        // Get currency and country refs
        const currency = currencies.find(c => c.code === latestCell.currencyCode)
        const currencyRef = latestCell.currencyRef || currency?.id
        const countryRef = latestCell.countryRef

        if (!validateCountryRef(countryRef)) {
          setIsSavingCell(false)
          return
        }

        // Build the detail payload
        const detailPayload = {
          allowanceRegionRuleDetail: {
            ...(latestCell.id && { id: latestCell.id }),
            amount: latestCell.amount,
            currencyRef: currencyRef,
            activeFrom: latestCell.activeFrom,
            activeTo: latestCell.activeTo || null,
            travelRegionRef: latestCell.travelRegionId,
            countryRef: countryRef,
            allowanceRegionRule: rule.id,
            ...(latestCell.id && latestCell.version !== undefined && { version: latestCell.version })
          },
          changeMode: latestCell.id ? 'UPDATE' : 'INSERT'
        }

        const response = await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)

        toast.success('Changes saved successfully')

        // Close edit mode
        setEditingCellId(null)
        setEditingCellUsageInfo(null)

        // Update the cell with the data from response
        setEditableCells(prev =>
          prev.map(c => {
            const isMatchingCell = latestCell.id
              ? c.id === latestCell.id && c.validityPeriodId === latestCell.validityPeriodId
              : c.validityPeriodId === latestCell.validityPeriodId

            if (isMatchingCell) {
              return {
                ...c,
                id: c.id || response.allowanceRegionRuleDetail?.id,
                amount: response.allowanceRegionRuleDetail?.amount ?? c.amount,
                activeFrom: response.allowanceRegionRuleDetail?.activeFrom ?? c.activeFrom,
                activeTo: response.allowanceRegionRuleDetail?.activeTo ?? c.activeTo,
                currencyCode: response.allowanceRegionRuleDetail?.currencyRef?.split(':').pop() ?? c.currencyCode,
                isNew: false,
                isModified: false,
                version: response.allowanceRegionRuleDetail?.version
                  ? response.allowanceRegionRuleDetail.version + 1
                  : (c.version || 0) + 1
              }
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
