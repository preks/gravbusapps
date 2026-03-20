import { useState, useCallback } from 'react'
import { EditableAllowanceRegionRule } from '../types'
import { toast } from 'sonner'
import { ExpenseSettingsClient } from '../../../utils/ExpenseSettingsClient'
import dayjs from 'dayjs'
import { toISOEndOfDay, toISOStartOfDay } from '../../../utils/dateUtils'

interface TravelRegion {
  id: string
  code: string
  value: string
}

export interface MatrixModalsState {
  isRuleModalOpen: boolean
  isRuleModalLoading: boolean
  isRegionModalOpen: boolean
  isEditRuleModalOpen: boolean
  isEditRuleModalLoading: boolean
  selectedRuleForEdit: EditableAllowanceRegionRule | null
  deleteRegionConfirmation: {
    isOpen: boolean
    region: TravelRegion | null
  }
  isDeletingRegion: boolean
}

export interface MatrixModalsActions {
  handleAddRule: () => void
  handleAddRegion: () => void
  handleAddDetailForRule: (ruleId: string) => Promise<void>
  handleRuleModalSave: (formData: any) => Promise<void>
  handleRuleModalCancel: () => void
  handleRegionModalSave: () => Promise<void>
  handleRegionModalCancel: () => void
  handleEditRuleModalSave: (formData: any) => Promise<void>
  handleEditRuleModalCancel: () => void
  handleDeleteRegionClick: (region: TravelRegion, e: React.MouseEvent) => void
  handleDeleteRegionCancel: () => void
  handleDeleteRegionConfirm: () => Promise<void>
}

interface UseMatrixModalsOptions {
  travelRegionSetId: string
  allowanceRegionRules: EditableAllowanceRegionRule[]
  getExpenseSettingsClient: () => ExpenseSettingsClient
  loadData: () => Promise<void>
  handlePageChange: (page: number) => Promise<void>
  currentPage: number
  checkAllowanceRuleUsage: (ruleId: string) => Promise<any>
  catalogClient: any
  regionHasSavedDetails: (regionId: string) => boolean
  setRuleUsageInfo: (info: any) => void
  accessToken: string
}

const buildEditRuleData = (
  formData: any,
  selectedRuleForEdit: EditableAllowanceRegionRule,
  travelRegionSetId: string
) => ({
  id: selectedRuleForEdit.id,
  version: selectedRuleForEdit.version,
  code: formData.code.trim(),
  name: formData.name.trim(),
  activeFrom: formData.activeFrom ? toISOStartOfDay(formData.activeFrom) : null,
  activeTo: formData.activeTo ? toISOEndOfDay(formData.activeTo) : null,
  travelRegionSetRef: travelRegionSetId,
  ruleOrder: selectedRuleForEdit.ruleOrder || 1,
  additionalProperties: selectedRuleForEdit.additionalProperties || {},
  businessKey: formData.code.trim()
})

const buildRuleDetailPayload = (detail: any, ruleId: string) => ({
  allowanceRegionRuleDetail: {
    ...(detail.id && { id: detail.id }),
    amount: detail.amounts?.[0] || 0,
    currencyRef: detail.currencyRef,
    activeFrom: detail.activeFrom ? toISOStartOfDay(detail.activeFrom) : null,
    activeTo: detail.activeTo ? toISOEndOfDay(detail.activeTo) : null,
    travelRegionRef: detail.travelRegionRef || detail.travelRegion,
    countryRef: detail.countryRef,
    home: detail.home || false,
    allowanceRegionRule: ruleId
  },
  changeMode: detail.id ? 'UPDATE' : 'INSERT'
})

const saveRuleDetails = async (client: ExpenseSettingsClient, details: any[], ruleId: string) => {
  if (!details || details.length === 0) return
  for (const detail of details) {
    await client.post('/employee-expense/saveAllowanceRegionRuleDetail', buildRuleDetailPayload(detail, ruleId))
  }
}

export const useMatrixModals = (options: UseMatrixModalsOptions) => {
  const {
    travelRegionSetId,
    allowanceRegionRules,
    getExpenseSettingsClient,
    loadData,
    handlePageChange,
    currentPage,
    checkAllowanceRuleUsage,
    catalogClient,
    regionHasSavedDetails,
    setRuleUsageInfo,
    accessToken
  } = options

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isRuleModalLoading, setIsRuleModalLoading] = useState(false)
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [isEditRuleModalOpen, setIsEditRuleModalOpen] = useState(false)
  const [isEditRuleModalLoading, setIsEditRuleModalLoading] = useState(false)
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<EditableAllowanceRegionRule | null>(null)
  const [deleteRegionConfirmation, setDeleteRegionConfirmation] = useState<{
    isOpen: boolean
    region: TravelRegion | null
  }>({ isOpen: false, region: null })
  const [isDeletingRegion, setIsDeletingRegion] = useState(false)

  // Open rule creation modal
  const handleAddRule = useCallback(() => {
    setIsRuleModalOpen(true)
  }, [])

  // Open region creation modal
  const handleAddRegion = useCallback(() => {
    setIsRegionModalOpen(true)
  }, [])

  // Open edit rule modal to add details (from rule header +)
  const handleAddDetailForRule = useCallback(
    async (ruleId: string) => {
      const rule = allowanceRegionRules.find(r => r.id === ruleId)
      if (rule) {
        setSelectedRuleForEdit(rule)
        setIsEditRuleModalLoading(true)
        setIsEditRuleModalOpen(true)

        try {
          // Check if this rule is used in any expense transactions
          const usageInfo = await checkAllowanceRuleUsage(ruleId)
          setRuleUsageInfo(usageInfo)
        } catch (error) {
          console.error('Error checking rule usage:', error)
          // On error, show the form but with a warning
          setRuleUsageInfo({
            isUsed: true,
            usedIn: {
              expenseRuleAllowanceCodes: [],
              expensePlans: 0,
              expenseRequests: 0,
              expensePlanItems: 0,
              expenseItems: 0,
              expensePositions: 0
            },
            message: 'Unable to verify usage. Editing is restricted for safety.'
          })
        } finally {
          setIsEditRuleModalLoading(false)
        }
      }
    },
    [allowanceRegionRules, checkAllowanceRuleUsage, setRuleUsageInfo]
  )

  // Handle rule modal save
  const handleRuleModalSave = useCallback(
    async (formData: any) => {
      setIsRuleModalLoading(true)
      try {
        const ruleData = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: `Allowance rule: ${formData.name.trim()}`,
          activeFrom: formData.activeFrom
            ? toISOStartOfDay(formData.activeFrom)
            : toISOStartOfDay(dayjs().format('YYYY-MM-DD')),
          activeTo: formData.activeTo ? toISOEndOfDay(formData.activeTo) : null,
          travelRegionSetRef: travelRegionSetId,
          ruleOrder: allowanceRegionRules.length + 1,
          additionalProperties: {},
          businessKey: formData.code.trim()
        }

        const client = getExpenseSettingsClient()
        const savedRule = await client.saveAllowanceRegionRule(ruleData)

        // Save each detail if provided
        if (formData.details && formData.details.length > 0) {
          for (const detail of formData.details) {
            const detailPayload = {
              allowanceRegionRuleDetail: {
                amount: detail.amounts?.[0] || 0,
                currencyRef: detail.currencyRef,
                activeFrom: detail.activeFrom ? toISOStartOfDay(detail.activeFrom) : null,
                activeTo: detail.activeTo ? toISOEndOfDay(detail.activeTo) : null,
                travelRegionRef: detail.travelRegionRef || detail.travelRegion,
                countryRef: detail.countryRef,
                home: detail.home || false,
                allowanceRegionRule: savedRule.allowanceRegionRule.id
              },
              changeMode: 'INSERT'
            }

            await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)
          }
        }

        await loadData()
        setIsRuleModalOpen(false)
        toast.success('Allowance rule and details created successfully')
      } catch (err) {
        console.error('Error creating rule:', err instanceof Error ? err.message : 'Unknown error')
        toast.error('Failed to create rule')
      } finally {
        setIsRuleModalLoading(false)
      }
    },
    [travelRegionSetId, allowanceRegionRules, getExpenseSettingsClient, loadData]
  )

  // Handle rule modal cancel
  const handleRuleModalCancel = useCallback(() => {
    setIsRuleModalOpen(false)
  }, [])

  // Handle region modal save
  const handleRegionModalSave = useCallback(async () => {
    await handlePageChange(currentPage)
    setIsRegionModalOpen(false)
  }, [handlePageChange, currentPage])

  // Handle region modal cancel
  const handleRegionModalCancel = useCallback(() => {
    setIsRegionModalOpen(false)
  }, [])

  // Handle saving the edited rule (with new details)
  const handleEditRuleModalSave = useCallback(
    async (formData: any) => {
      setIsEditRuleModalLoading(true)
      try {
        if (!selectedRuleForEdit?.id) {
          toast.error('No rule selected for editing')
          return
        }

        const client = getExpenseSettingsClient()
        const ruleId = selectedRuleForEdit.id

        await client.saveAllowanceRegionRule(buildEditRuleData(formData, selectedRuleForEdit, travelRegionSetId))
        await saveRuleDetails(client, formData.details, ruleId)

        toast.success('Rule and details saved successfully')
        setIsEditRuleModalOpen(false)
        setSelectedRuleForEdit(null)
        setRuleUsageInfo(null)
        await loadData()
      } catch (err) {
        console.error('Error saving rule:', err instanceof Error ? err.message : 'Unknown error')
        toast.error('Failed to save rule and details')
      } finally {
        setIsEditRuleModalLoading(false)
      }
    },
    [selectedRuleForEdit, travelRegionSetId, getExpenseSettingsClient, loadData, setRuleUsageInfo]
  )

  // Handle cancel edit rule modal
  const handleEditRuleModalCancel = useCallback(() => {
    setIsEditRuleModalOpen(false)
    setSelectedRuleForEdit(null)
    setRuleUsageInfo(null)
  }, [setRuleUsageInfo])

  // Handle delete region click
  const handleDeleteRegionClick = useCallback(
    (region: TravelRegion, e: React.MouseEvent) => {
      e.stopPropagation()

      if (regionHasSavedDetails(region.id)) {
        toast.error('Cannot delete region with existing allowance details')
        return
      }

      setDeleteRegionConfirmation({ isOpen: true, region })
    },
    [regionHasSavedDetails]
  )

  // Handle delete region cancel
  const handleDeleteRegionCancel = useCallback(() => {
    setDeleteRegionConfirmation({ isOpen: false, region: null })
  }, [])

  // Handle delete region confirm
  const handleDeleteRegionConfirm = useCallback(async () => {
    const { region } = deleteRegionConfirmation
    if (!region) return

    setIsDeletingRegion(true)
    try {
      // Delete the catalog entry (REST API will handle cascade deletion of localized entries)
      await catalogClient.deleteCatalogEntry('TravelRegion', 'v1', region.id)

      toast.success(`Travel region "${region.value}" deleted successfully`)
      setDeleteRegionConfirmation({ isOpen: false, region: null })
      await loadData()
    } catch (err) {
      console.error('Error deleting region:', err instanceof Error ? err.message : 'Unknown error')
      toast.error(err instanceof Error ? err.message : 'Failed to delete region')
    } finally {
      setIsDeletingRegion(false)
    }
  }, [deleteRegionConfirmation, catalogClient, loadData, accessToken])

  return {
    state: {
      isRuleModalOpen,
      isRuleModalLoading,
      isRegionModalOpen,
      isEditRuleModalOpen,
      isEditRuleModalLoading,
      selectedRuleForEdit,
      deleteRegionConfirmation,
      isDeletingRegion
    },
    actions: {
      handleAddRule,
      handleAddRegion,
      handleAddDetailForRule,
      handleRuleModalSave,
      handleRuleModalCancel,
      handleRegionModalSave,
      handleRegionModalCancel,
      handleEditRuleModalSave,
      handleEditRuleModalCancel,
      handleDeleteRegionClick,
      handleDeleteRegionCancel,
      handleDeleteRegionConfirm
    },
    setters: {
      setIsRuleModalLoading,
      setIsEditRuleModalLoading,
      setSelectedRuleForEdit
    }
  }
}
