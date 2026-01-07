/**
 * Generic Rejection Reason Popup Component
 * Reusable popup for adding/managing rejection reasons for investment entities (leads, opportunities)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Alert,
  Spinner,
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import { useProspectRejectionReasons } from '@/common/data/investment/hooks/useProspectRejectionReasons'
import { useGetInvestmentLeadById } from '@/common/data/investment/hooks/useInvestmentLeads'
import { useGetInvestmentOpportunityById } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import {
  buildRejectionReasonPayload,
  type RejectionReasonFormData,
  type ExistingRejectionReason
} from '@/common/data/investment/payloads/rejectionReasonPayloads'
import { RejectionReasonPopupProps } from './types'

const prefixDataTestId = 'rejection-reason-popup'

/**
 * Helper function to check if a rejection reason is internal-only
 * (should not be shared externally)
 */
const isInternalOnly = (reason: any): boolean => {
  try {
    const objectValue = reason.objectValue
    if (objectValue && typeof objectValue === 'object') {
      return objectValue.allowExternalSharing === false
    }
  } catch {
    // Silently handle error parsing objectValue
  }
  return false
}

/**
 * Component for rendering a single rejection reason checkbox item
 */
interface RejectionReasonItemProps {
  reason: any
  isChecked: boolean
  onChange: (checked: boolean) => void
  prefixDataTestId: string
}

const RejectionReasonItem: React.FC<RejectionReasonItemProps> = ({ reason, isChecked, onChange, prefixDataTestId }) => {
  const internalOnly = isInternalOnly(reason)

  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      onChange(checked)
    }
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        data-testid={`${prefixDataTestId}-reason-checkbox-${reason.id}`}
      />
      <label className="gba:text-sm gba:cursor-pointer gba:flex gba:items-center gba:gap-1">
        <span>{reason.value}</span>
        {internalOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="gba:text-info gba:font-semibold gba:cursor-help"
                data-testid={`${prefixDataTestId}-internal-only-indicator-${reason.id}`}
              >
                !
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {getTranslationFromI18nKeyAndLabel('rejection.tooltip.internalOnly', 'To be shared only internally')}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </label>
    </div>
  )
}

// Form validation schema - conditional based on create/update
const buildRejectionFormSchema = (requiredMessage: string, isRequired: boolean) =>
  z.object({
    reasonRefs: isRequired
      ? z.array(z.string()).min(1, requiredMessage) // Create: require at least 1
      : z.array(z.string()) // Update: allow empty to "unreject"
  })

/**
 * Generic rejection reasons popup component
 * Works for both leads and opportunities
 */
export const RejectionReasonPopup: React.FC<RejectionReasonPopupProps> = ({
  entityType,
  entityId,
  onClose,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Create business app context
  const businessAppContext = {
    accessToken,
    userInfo,
    additionalData
  }

  // Load available rejection reasons from catalog using centralized hook
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [reasonOptions, setReasonOptions] = useState<CatalogEntry[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Load existing rejection reasons for this entity
  const { fetchByLead, fetchByOpportunity } = useProspectRejectionReasons(businessAppContext)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [hasExistingReasons, setHasExistingReasons] = useState(false)
  // Store existing rejection reasons with their IDs and versions for update logic
  const [existingReasons, setExistingReasons] = useState<ExistingRejectionReason[]>([])

  // Store entity version for optimistic locking
  const [entityVersion, setEntityVersion] = useState<number | undefined>(undefined)

  // Hooks to fetch entity data
  const { fetchInvestmentLeadById } = useGetInvestmentLeadById(businessAppContext)
  const { fetchInvestmentOpportunityById } = useGetInvestmentOpportunityById(businessAppContext)

  // Load catalog entries on mount
  useEffect(() => {
    const loadCatalog = async () => {
      if (!accessToken) {
        setLoadingCatalog(false)
        return
      }

      setLoadingCatalog(true)
      setCatalogError(null)

      try {
        const { entries } = await fetchCatalogEntriesByIdentifier('InvestmentRejectionReason', {
          version: 'v1',
          limit: 100,
          offset: 0,
          orderBy: [
            { field: 'displayOrder', direction: 'ASC' },
            { field: 'value', direction: 'ASC' }
          ]
        })

        setReasonOptions(entries)
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'Failed to load rejection reasons')
        setReasonOptions([])
      } finally {
        setLoadingCatalog(false)
      }
    }

    void loadCatalog()
  }, [fetchCatalogEntriesByIdentifier, accessToken])

  // Form setup
  const form = useForm<RejectionReasonFormData>({
    resolver: zodResolver(
      useMemo(
        () =>
          buildRejectionFormSchema(
            getTranslationFromI18nKeyAndLabel(
              'rejection.validation.required',
              'Please select at least one rejection reason'
            ),
            !hasExistingReasons // TRUE for create (no existing), FALSE for update (has existing)
          ),
        [hasExistingReasons] // Add dependency so schema updates when this changes
      )
    ),
    defaultValues: {
      reasonRefs: []
    }
  })

  // Load existing reasons and entity version on mount
  const loadExisting = useCallback(async () => {
    if (!entityId || !accessToken) return

    setLoadingExisting(true)
    try {
      // Fetch entity version
      if (entityType === 'LEAD') {
        const leadData = await fetchInvestmentLeadById(entityId)
        setEntityVersion(leadData?.lead?.version)
      } else {
        const opportunityData = await fetchInvestmentOpportunityById(entityId)
        setEntityVersion(opportunityData?.opportunity?.version)
      }

      // Fetch based on entity type
      const reasons = entityType === 'LEAD' ? await fetchByLead(entityId) : await fetchByOpportunity(entityId)

      const reasonRefs = reasons.map(r => r.rejectionReasonRef)
      form.setValue('reasonRefs', reasonRefs)
      setHasExistingReasons(reasons.length > 0)
      // Store full rejection reason objects with IDs and versions for update logic
      setExistingReasons(
        reasons.map(r => ({
          id: r.id,
          version: r.version,
          rejectionReasonRef: r.rejectionReasonRef,
          description: r.description
        }))
      )
    } catch {
      setHasExistingReasons(false)
      setExistingReasons([])
      setEntityVersion(undefined)
    } finally {
      setLoadingExisting(false)
    }
  }, [
    entityId,
    entityType,
    accessToken,
    fetchByLead,
    fetchByOpportunity,
    fetchInvestmentLeadById,
    fetchInvestmentOpportunityById,
    form
  ])

  useEffect(() => {
    void loadExisting()
  }, [loadExisting])

  // Handle form submission - return payload matching RejectInvestmentProspectModelInput structure
  const handleSubmit = async (formData: RejectionReasonFormData) => {
    // Validate entity version is available
    if (entityVersion === undefined) {
      throw new Error(`${entityType} version is required for rejection reason update`)
    }

    // Build and return payload using centralized payload builder
    return buildRejectionReasonPayload({
      entityId,
      entityVersion,
      entityType,
      formData,
      existingReasons,
      hasExistingReasons
    })
  }

  // Show loading state
  if (loadingCatalog || loadingExisting) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('rejection.loading', 'Loading rejection reasons...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (catalogError) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {catalogError}
      </Alert>
    )
  }

  // Show empty state if no catalog entries
  if (reasonOptions.length === 0) {
    return (
      <Alert variant="default" data-testid={`${prefixDataTestId}-empty`}>
        {getTranslationFromI18nKeyAndLabel(
          'rejection.error.noCatalog',
          'No rejection reasons available. Please configure the InvestmentRejectionReason catalog.'
        )}
      </Alert>
    )
  }

  return (
    <TooltipProvider>
      <AppActionForm
        processType="create"
        onSubmit={handleSubmit}
        onCancel={onClose}
        formData={form.getValues()}
        form={form}
        businessAppContext={businessAppContext}
        data-testid={`${prefixDataTestId}-form`}
        submitButtonText={getTranslationFromI18nKeyAndLabel('rejection.button.save', 'Save Rejection Reasons')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      >
        <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
          {/* Rejection Reasons Selection */}
          <FormField
            control={form.control}
            name="reasonRefs"
            render={({ field }) => {
              // Helper function to handle checkbox changes
              const handleReasonChange = (reasonId: string, checked: boolean) => {
                const updatedReasons = checked ? [...field.value, reasonId] : field.value.filter(id => id !== reasonId)
                field.onChange(updatedReasons)
              }

              return (
                <FormItem data-testid={`${prefixDataTestId}-reasons-field`}>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('rejection.label.reasons', 'Rejection Reasons')}
                  </FormLabel>
                  <div className="gba:space-y-2">
                    {reasonOptions.map(reason => (
                      <RejectionReasonItem
                        key={reason.id}
                        reason={reason}
                        isChecked={field.value.includes(reason.id)}
                        onChange={checked => handleReasonChange(reason.id, checked)}
                        prefixDataTestId={prefixDataTestId}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      </AppActionForm>
    </TooltipProvider>
  )
}
