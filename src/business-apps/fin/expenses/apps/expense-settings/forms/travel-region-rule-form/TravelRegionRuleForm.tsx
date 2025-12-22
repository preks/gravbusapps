import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { PiWarning } from 'react-icons/pi'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

import { useGetAllowanceRegionRuleById } from '../../queries/ExpenseRuleQueries'
import { useCatalogData } from './hooks/useCatalogData'
import { useTravelRegionScroll } from './hooks/useTravelRegionScroll'
import { useGroupedDetails } from './hooks/useGroupedDetails'
import { BasicInformationSection } from './components/BasicInformationSection'
import { AllowanceRegionDetailsSection } from './components/AllowanceRegionDetailsSection'
import { FormActions } from './components/FormActions'
import { TravelRegionRuleFormData, AllowanceRegionDetailFormData } from './types'

interface TravelRegionRuleFormProps extends BusinessAppContextProps {
  initialData?: TravelRegionRuleFormData
  isEditing?: boolean
  onSave: (data: TravelRegionRuleFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  travelRegionSetId?: string
  isUsedInTransactions?: boolean
  usageMessage?: string
}

const TravelRegionRuleForm: React.FC<TravelRegionRuleFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  travelRegionSetId,
  accessToken,
  isUsedInTransactions = false,
  usageMessage,
  ...context
}) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }
  const [error, setError] = useState<string | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [formData, setFormData] = useState<TravelRegionRuleFormData>({
    code: '',
    name: '',
    activeFrom: dayjs().format('YYYY-MM-DD'),
    activeTo: '',
    details: []
  })

  const [dataSource, setDataSource] = useState<'fresh' | 'stale' | 'new'>('new')

  // Hooks
  const { fetchAllowanceRegionRuleById } = useGetAllowanceRegionRuleById({
    accessToken,
    ...context
  } as BusinessAppContextProps)

  const {
    countries,
    currencies,
    travelRegions,
    catalogsLoading,
    error: catalogError,
    isLoadingMoreRegions,
    hasMoreRef,
    loadTravelRegions,
    loadMoreTravelRegions,
    resetPagination
  } = useCatalogData({ accessToken, travelRegionSetId })

  const { handleTravelRegionScroll } = useTravelRegionScroll({
    hasMoreRef,
    isLoadingRef: { current: isLoadingMoreRegions },
    loadMoreTravelRegions
  })

  const { groupedDetails } = useGroupedDetails({ formData, countries, currencies })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        console.log('🔄 TravelRegionRuleForm: Fetching FRESH data for ID:', initialData.id)
        try {
          const freshData = await fetchAllowanceRegionRuleById(initialData.id)
          if (freshData) {
            console.log('✅ TravelRegionRuleForm: Using FRESH data from API:', freshData)
            setDataSource('fresh')
            const transformedData = {
              id: freshData.id,
              version: freshData.version,
              code: freshData.code || '',
              name: freshData.name || '',
              activeFrom: freshData.activeFrom
                ? dayjs(freshData.activeFrom).format('YYYY-MM-DD')
                : dayjs().format('YYYY-MM-DD'),
              activeTo: freshData.activeTo ? dayjs(freshData.activeTo).format('YYYY-MM-DD') : '',
              details: (freshData.allowanceRegionRuleDetail || []).map((detail: any) => ({
                id: detail.id,
                version: detail.version,
                countryRef: detail.country?.id || '',
                travelRegion: detail.travelRegion?.id || detail.travelRegionRef || '', // ID for form select
                travelRegionRef: detail.travelRegion?.id || detail.travelRegionRef || '', // Keep ref for consistency
                currencyRef: detail.currency?.id || '',
                amounts: [detail.amount || 0],
                home: detail.home || false,
                activeFrom: detail.activeFrom
                  ? dayjs(detail.activeFrom).format('YYYY-MM-DD')
                  : dayjs().format('YYYY-MM-DD'),
                activeTo: detail.activeTo ? dayjs(detail.activeTo).format('YYYY-MM-DD') : '',
                businessKey: detail.businessKey,
                additionalProperties: detail.additionalProperties
              }))
            }
            setFormData(transformedData)
            return
          }
        } catch (error) {
          console.error('❌ TravelRegionRuleForm: Failed to load fresh travel region rule data:', error)
          console.log('⚠️ TravelRegionRuleForm: Falling back to STALE list data')
          setDataSource('stale')
          // Continue with fallback to initial data
        }
      }

      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        console.log(
          '📝 TravelRegionRuleForm: Using initial data (could be stale list data or new item data):',
          initialData
        )
        // Transform the initial data to ensure amounts are in the correct format
        const transformedDetails =
          initialData.details?.map(detail => {
            const anyDetail = detail as any // Type assertion for backward compatibility
            return {
              ...detail,
              // Ensure amounts is always an array
              amounts: Array.isArray(detail.amounts) ? detail.amounts : detail.amounts ? [detail.amounts] : [0],
              // Map field names from API to form
              home: detail.home !== undefined ? detail.home : anyDetail.homeFlag || false,
              activeFrom: detail.activeFrom || anyDetail.validFrom || dayjs().format('YYYY-MM-DD'),
              activeTo: detail.activeTo || anyDetail.validTo,
              // Set travelRegion ID for select (use travelRegionRef for ID, fallback to travelRegion if it's an ID)
              travelRegion:
                detail.travelRegionRef ||
                (detail.travelRegion && detail.travelRegion.startsWith('TravelRegion:') ? detail.travelRegion : '') ||
                ''
            }
          }) || []

        setFormData({
          ...initialData,
          activeFrom: initialData.activeFrom
            ? dayjs(initialData.activeFrom).format('YYYY-MM-DD')
            : dayjs().format('YYYY-MM-DD'),
          activeTo: initialData.activeTo ? dayjs(initialData.activeTo).format('YYYY-MM-DD') : '',
          details: transformedDetails
        })
      }
    }

    loadData()
  }, [initialData?.id, isEditing, fetchAllowanceRegionRuleById])

  // Handlers
  const handleUpdateBasicInfo = (updates: Partial<TravelRegionRuleFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setShowValidation(false) // Clear validation when user makes changes
  }

  const addColumnGroup = () => {
    // Determine default activeFrom and activeTo
    let defaultActiveFrom: string
    let defaultActiveTo: string

    if (formData.details.length > 0) {
      // If there are existing details, use the dates from the most recent detail
      const lastDetail = formData.details[formData.details.length - 1]
      defaultActiveFrom = lastDetail.activeFrom || dayjs().format('YYYY-MM-DD')
      defaultActiveTo = lastDetail.activeTo || ''
    } else {
      // If this is the first detail, inherit from the rule
      defaultActiveFrom = formData.activeFrom || dayjs().format('YYYY-MM-DD')
      defaultActiveTo = formData.activeTo || ''
    }

    const newDetail: AllowanceRegionDetailFormData = {
      countryRef: '',
      travelRegion: '',
      currencyRef: '',
      home: false,
      activeFrom: defaultActiveFrom,
      activeTo: defaultActiveTo,
      amounts: [0]
    }

    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }))
    setShowValidation(false) // Clear validation when adding new group
  }

  // Update group details
  const updateGroupDetail = (groupKey: string, field: string, value: any) => {
    // If country is being updated, load travel regions for that country
    if (field === 'countryRef' && value) {
      // Extract country code from format "Country:v1:BE" -> "BE"
      const parts = value.split(':')
      const countryCode = parts[parts.length - 1]

      // Reset pagination and load travel regions for selected country
      resetPagination()
      loadTravelRegions(countryCode)
    }

    setFormData(prev => ({
      ...prev,
      details: prev.details.map((detail, index) => {
        const uniqueId = detail.id || `temp-${index}`
        const detailGroupKey = `${uniqueId}-${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`
        if (detailGroupKey === groupKey) {
          return { ...detail, [field]: value }
        }
        return detail
      })
    }))
    setShowValidation(false) // Clear validation when user makes changes
  }

  // Update amount in group
  const updateAmount = (groupKey: string, amountIndex: number, value: string) => {
    setFormData(prev => {
      const updatedDetails = prev.details.map((detail, index) => {
        const uniqueId = detail.id || `temp-${index}`
        const detailGroupKey = `${uniqueId}-${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`
        if (detailGroupKey === groupKey) {
          const newAmounts = [...(detail.amounts || [])]
          // Store as number but handle empty string case
          newAmounts[amountIndex] = value === '' ? 0 : parseFloat(value) || 0
          return { ...detail, amounts: newAmounts }
        }
        return detail
      })
      return { ...prev, details: updatedDetails }
    })
    setShowValidation(false) // Clear validation when user makes changes
  }

  // Remove group
  const removeGroup = (groupKey: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((detail, index) => {
        const uniqueId = detail.id || `temp-${index}`
        const detailGroupKey = `${uniqueId}-${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`
        return detailGroupKey !== groupKey
      })
    }))
  }

  // Validation
  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.code.trim()) {
      errors.push('Rule code is required')
    }

    if (!formData.name.trim()) {
      errors.push('Rule name is required')
    }

    if (formData.details.length === 0) {
      errors.push('At least one allowance detail is required')
    }

    formData.details.forEach((detail, index) => {
      if (!detail.countryRef) {
        errors.push(`Detail ${index + 1}: Country is required`)
      }
      if (!detail.travelRegion) {
        errors.push(`Detail ${index + 1}: Travel region is required`)
      }
      if (!detail.currencyRef) {
        errors.push(`Detail ${index + 1}: Currency is required`)
      }
      if (!detail.activeFrom) {
        errors.push(`Detail ${index + 1}: Valid from date is required`)
      }
      if (!detail.amounts || detail.amounts.length === 0 || detail.amounts.every(a => a <= 0)) {
        errors.push(`Detail ${index + 1}: At least one amount greater than 0 is required`)
      }
    })

    return errors
  }

  // Handle save
  const handleSave = async () => {
    setShowValidation(true) // Show validation immediately
    const errors = validateForm()

    if (errors.length > 0) {
      setError(errors.join(', '))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Transform grouped data back to individual details for API
      const expandedDetails: AllowanceRegionDetailFormData[] = []

      groupedDetails().forEach(group => {
        // Create one detail record per group with all amounts
        if (group.amounts.length > 0 && group.amounts.some(amount => amount > 0)) {
          // Find the travel region label from the ID
          const regionOption = travelRegions.find(r => r.id === group.travelRegion)
          const regionLabel = regionOption?.value || group.travelRegion // Fallback to ID if label not found

          expandedDetails.push({
            id: group.detailIds[0] || undefined, // Use the first detail ID if available
            countryRef: group.countryRef,
            travelRegion: regionLabel, // Display label from catalog
            travelRegionRef: group.travelRegion, // ID reference for API
            currencyRef: group.currencyRef,
            home: group.homeFlag,
            activeFrom: group.validFrom,
            activeTo: group.validTo,
            amounts: group.amounts.filter(amount => amount > 0) // Only include non-zero amounts
          })
        }
      })

      const submitData: TravelRegionRuleFormData = {
        ...formData,
        details: expandedDetails
      }

      await onSave(submitData)
      // Note: Removed message.success as it's not available in nw-design-system
      // You might want to use a toast notification or handle success in parent component
    } catch (err) {
      console.error('Error saving allowance region rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save allowance region rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (catalogsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  const groups = groupedDetails()

  return (
    <div className="gba:space-y-6">
      {isEditing && (
        <div className="gba:flex gba:items-center gba:justify-end">
          <span
            className={`gba:text-xs gba:px-2 gba:py-1 gba:rounded ${
              dataSource === 'fresh'
                ? 'gba:bg-green-100 gba:text-green-800 gba:border gba:border-green-300'
                : dataSource === 'stale'
                  ? 'gba:bg-yellow-100 gba:text-yellow-800 gba:border gba:border-yellow-300'
                  : 'gba:bg-gray-100 gba:text-gray-800 gba:border gba:border-gray-300'
            }`}
          >
            {dataSource === 'fresh' ? '✅ Fresh Data' : dataSource === 'stale' ? '⚠️ Stale Data' : '📝 New Item'}
          </span>
        </div>
      )}

      {error && showValidation && (
        <Alert variant="destructive">
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {catalogError && (
        <Alert variant="destructive">
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>{catalogError}</AlertDescription>
        </Alert>
      )}

      {isUsedInTransactions && (
        <Alert>
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>
            {usageMessage ||
              'This rule is used in expense transactions. Only the "Valid To" date can be modified. To make other changes, create a new rule.'}
          </AlertDescription>
        </Alert>
      )}

      <BasicInformationSection
        formData={formData}
        onUpdate={handleUpdateBasicInfo}
        isUsedInTransactions={isUsedInTransactions}
      />

      <AllowanceRegionDetailsSection
        groups={groups}
        countries={countries}
        travelRegions={travelRegions}
        currencies={currencies}
        isLoadingMoreRegions={isLoadingMoreRegions}
        hasMore={hasMoreRef.current}
        onAddGroup={addColumnGroup}
        onUpdateGroupDetail={updateGroupDetail}
        onUpdateAmount={updateAmount}
        onRemoveGroup={removeGroup}
        onScroll={handleTravelRegionScroll}
        isUsedInTransactions={isUsedInTransactions}
        showValidation={showValidation}
      />

      <FormActions isEditing={isEditing} isSubmitting={isSubmitting} onSave={handleSave} onCancel={onCancel} />
    </div>
  )
}

export default TravelRegionRuleForm
