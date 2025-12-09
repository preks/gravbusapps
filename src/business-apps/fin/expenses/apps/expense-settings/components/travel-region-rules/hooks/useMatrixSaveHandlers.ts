import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { EditableCell, EditableAllowanceRegionRule, CurrencyOption } from '../types'
import { ExpenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface UseMatrixSaveHandlersProps {
  accessToken: string
  editableCells: EditableCell[]
  allowanceRegionRules: EditableAllowanceRegionRule[]
  currencies: CurrencyOption[]
  loadData: () => Promise<void>
  getExpenseSettingsClient: () => ExpenseSettingsClient
}

export const useMatrixSaveHandlers = ({
  accessToken,
  editableCells,
  allowanceRegionRules,
  currencies,
  loadData,
  getExpenseSettingsClient
}: UseMatrixSaveHandlersProps) => {
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveAll = useCallback(async () => {
    // Prevent multiple simultaneous save operations
    if (isSaving) {
      return
    }

    setIsSaving(true)
    try {
      if (!accessToken) {
        throw new Error('Access token is missing')
      }

      // Only save cells that are modified/new and have an amount > 0
      const modifiedCells = editableCells.filter(
        cell => ((cell.isModified && !cell.isNew) || cell.isNew) && cell.amount > 0 // Only save cells with actual amounts
      )

      if (modifiedCells.length === 0) {
        toast.success('No changes to save')
        return
      }

      // Group modified cells by rule
      const cellsByRule = modifiedCells.reduce(
        (acc, cell) => {
          if (!acc[cell.allowanceRegionRuleId]) {
            acc[cell.allowanceRegionRuleId] = []
          }
          acc[cell.allowanceRegionRuleId].push(cell)
          return acc
        },
        {} as Record<string, EditableCell[]>
      )

      // Get a fresh client with current token
      const client = getExpenseSettingsClient()

      // Save details individually - this is the only reliable way for AllowanceRegionRuleDetail
      await Promise.all(
        Object.entries(cellsByRule).map(async ([ruleId, cells]) => {
          const rule = allowanceRegionRules.find(r => r.id === ruleId)
          if (!rule) {
            console.error(`❌ Rule not found for ID: ${ruleId}`)
            return
          }

          // Save each detail individually
          const results = await Promise.all(
            cells.map(async cell => {
              // Use stored refs or find them from catalogs
              const currency = currencies.find(c => c.code === cell.currencyCode)
              const currencyRef = cell.currencyRef || currency?.id

              // For countryRef: use stored value, or derive from travel region code
              let countryRef = cell.countryRef
              if (!countryRef && cell.travelRegionId) {
                // Try to extract country code from travel region ID (e.g., "TravelRegion:v1:DE-01" -> "Country:v1:DE")
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
                console.error('❌ Missing countryRef for cell:', cell.travelRegionId)
                toast.error('Country reference is missing for some details')
                return null // Skip this cell
              }

              console.log('💾 Saving cell with countryRef:', countryRef, 'from region:', cell.travelRegionId)

              // Build the detail payload
              const detailPayload = {
                allowanceRegionRuleDetail: {
                  ...(cell.id && { id: cell.id }),
                  amount: cell.amount,
                  currencyRef: currencyRef,
                  activeFrom: cell.activeFrom,
                  activeTo: cell.activeTo || null, // Explicitly set to null if undefined
                  travelRegionRef: cell.travelRegionId,
                  countryRef: countryRef,
                  allowanceRegionRule: rule.id,
                  ...(cell.id && cell.version !== undefined && { version: cell.version })
                },
                changeMode: cell.id ? 'UPDATE' : 'INSERT'
              }

              console.log('📦 Saving detail:', detailPayload) // Debug log

              const result = await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)

              return result
            })
          )

          return results
        })
      )

      const newRecords = modifiedCells.filter(cell => !cell.id).length
      const updatedRecords = modifiedCells.filter(cell => cell.id).length

      let successMessage = 'All changes saved successfully'
      if (newRecords > 0 && updatedRecords > 0) {
        successMessage = `Saved ${newRecords} new records and updated ${updatedRecords} existing records`
      } else if (newRecords > 0) {
        successMessage = `Saved ${newRecords} new allowance records`
      } else if (updatedRecords > 0) {
        successMessage = `Updated ${updatedRecords} allowance records`
      }

      toast.success(successMessage)

      // Reload data to show updated values
      try {
        await loadData()
      } catch (reloadErr) {
        console.error('❌ Error reloading data after save:', reloadErr)
        toast.error('Changes saved but failed to reload data. Please refresh the page.')
      }
    } catch (err) {
      console.error('❌ Error saving changes:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      toast.error(`Error: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, accessToken, editableCells, allowanceRegionRules, currencies, loadData, getExpenseSettingsClient])

  return {
    isSaving,
    handleSaveAll
  }
}
