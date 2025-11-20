import { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OpportunityFormValues } from '../types'
import { OpportunityQueryResult, OpportunityDataResponse, useGetOpportunityData } from '../queries/OpportunityQueries'

interface UseOpportunityDataProps {
  businessAppContext: BusinessAppContextProps
}

interface UseOpportunityDataReturn {
  opportunityData: OpportunityQueryResult | null
  opportunityContactsData: OpportunityDataResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mapOpportunityToFormValues: (opportunity: OpportunityQueryResult) => Partial<OpportunityFormValues>
}

export const mapOpportunityDataToFormValues = (
  opportunityData: OpportunityDataResponse
): Partial<OpportunityFormValues> => {
  if (!opportunityData?.Opportunity?.[0]) {
    return {}
  }

  const opportunity = opportunityData.Opportunity[0]
  const opportunityContacts = opportunityData.OpportunityContact || []

  console.log('🔍 CRM Opportunity Mapping: Raw opportunity contacts from query', {
    opportunityId: opportunity.id,
    contactCount: opportunityContacts.length,
    contacts: opportunityContacts
  })

  // Map addresses to the format expected by the form
  let addresses = []
  if (opportunity.addresses && opportunity.addresses.length > 0) {
    addresses = opportunity.addresses.map((addr, index) => ({
      id: addr.id || `address-${index}`,
      version: undefined, // No version in the query response
      addressType: addr.addressType || 'BUSINESS',
      addressLine: addr.addressLine || '',
      postalCode: addr.postalCode || '',
      city: addr.city || '',
      region: addr.region?.id || '',
      country: addr.country?.id || ''
    }))
  }

  // Map communication channels to the format expected by the form
  let communicationChannels = []
  if (opportunity.communicationChannels && opportunity.communicationChannels.length > 0) {
    communicationChannels = opportunity.communicationChannels.map((channel, index) => ({
      id: channel.id || `channel-${index}`,
      version: undefined, // No version in the query response
      channelType: channel.channelType || 'EMAIL',
      channelValue: channel.channelValue || '',
      isPrimary: channel.isPrimary || false
    }))
  }

  // Map tags to the format expected by the form
  let tags = []
  if (opportunity.tags && opportunity.tags.length > 0) {
    tags = opportunity.tags.map((tag, index) => ({
      id: tag.id || `tag-${index}`,
      version: undefined, // No version in the query response
      tagName: tag.tagName || '',
      tagValue: tag.tagValue || ''
    }))
  }
  const contactIds: any[] = opportunityContacts.map(oc => {
    const firstName = oc.contact?.firstName || ''
    const lastName = oc.contact?.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()

    return {
      id: oc.contactId || oc.contact?.id || '',
      name: fullName || oc.contact?.email || oc.contactId || 'Unknown Contact',
      associationId: oc.id,
      associationVersion: oc.version || 0
    }
  })

  console.log('✅ CRM Opportunity Mapping: Mapped contact IDs for form', {
    opportunityId: opportunity.id,
    mappedContactCount: contactIds.length,
    mappedContacts: contactIds
  })

  console.log('📦 CRM Opportunity Mapping: Account data from query', {
    opportunityId: opportunity.id,
    accountIdFromQuery: opportunity.accountId,
    accountObjectFromQuery: opportunity.account,
    accountName: opportunity.account?.name
  })

  const formValues: Partial<OpportunityFormValues> = {
    // System fields
    id: opportunity.id,
    version: opportunity.version,

    // Opportunity Information
    owner: opportunity.ownerEmployeeId || '',
    name: opportunity.name || '',
    opportunityStatus: opportunity.opportunityStatusRef || opportunity.opportunityStatus?.id || '',
    pipeline: opportunity.salesPipelineRef || opportunity.salesPipeline?.id || '',
    salesPipelineStage: opportunity.salesPipelineStageRef || opportunity.salesPipelineStage?.id || '',
    stage: opportunity.stage || '',
    status: opportunity.status || '',

    // Sales Information
    estimatedAmount: opportunity.estimatedAmount?.toString() || '',
    currency: opportunity.currencyRef || opportunity.currency?.id || '',
    winningChance: opportunity.winningChance?.toString() || '',
    closeDate: opportunity.closeDate ? opportunity.closeDate.split('T')[0] : '', // Extract date part only (YYYY-MM-DD)

    // Relationship Information (FIXED: form expects accountId/leadId, not account/lead)
    accountId: opportunity.accountId || opportunity.account?.id || '', // Account ID
    leadId: opportunity.leadId || opportunity.lead?.id || '', // Lead ID
    companyName: opportunity.account?.name || '', // Company name from account for display

    // Campaign Information
    salesCampaignId: opportunity.salesCampaignId || opportunity.salesCampaign?.id || '',

    // Contact Information (CRM-specific)
    contactIds: contactIds,

    // Business Information
    businessKey: opportunity.businessKey || '',
    code: opportunity.code || '',
    sourceApp: opportunity.sourceApp || 'CRM',
    personal: opportunity.personal || false,

    // Additional Information
    notesSummary: opportunity.notesSummary || '',
    lastInteraction: opportunity.lastInteraction || '',

    // Address Information
    addresses: addresses,

    // Communication Channels
    communicationChannels: communicationChannels,

    // Tags
    tags: tags,

    // Additional Properties for custom fields
    additionalProperties: opportunity.additionalProperties || {},

    // Express fields for dynamic configuration
    express1: opportunity.express1 || {},
    express2: opportunity.express2 || {},

    // Process and system fields
    processInstanceId: opportunity.processInstanceId || '',
    recordState: opportunity.recordState || 'ACTIVE',

    // Audit information (readonly, for display)
    activeFrom: opportunity.activeFrom || '',
    activeTo: opportunity.activeTo || '',
    createdAt: opportunity.createdAt || '',
    createdBy: opportunity.createdBy || '',
    updatedAt: opportunity.updatedAt || '',
    updatedBy: opportunity.updatedBy || '',
    synchronizedAt: opportunity.synchronizedAt || '',

    // Legacy fields (for backward compatibility) - REMOVED DUPLICATES
    // accountId and leadId are now mapped above in Relationship Information section
    ownerEmployeeId: opportunity.ownerEmployeeId || '',
    ownerOrganizationId: opportunity.ownerOrganizationId || ''
  }

  return formValues
}

interface UseOpportunityDataProps {
  businessAppContext: BusinessAppContextProps
}

export const useOpportunityData = ({ businessAppContext }: UseOpportunityDataProps): UseOpportunityDataReturn => {
  const [opportunityData, setOpportunityData] = useState<OpportunityQueryResult | null>(null)
  const [opportunityContactsData, setOpportunityContactsData] = useState<OpportunityDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchOpportunityData } = useGetOpportunityData(businessAppContext)

  // Extract opportunityId from additionalData - NOT memoized (matching Contact/Account pattern)
  // Simple extraction works better with dynamic additionalData updates from AppActionButton
  // The context itself handles initialValues fallback
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  const mapOpportunityToFormValues = useMemo(
    () =>
      (opportunity: OpportunityQueryResult): Partial<OpportunityFormValues> => {
        // Use stored contact data if available, otherwise create minimal response
        const responseWithContacts: OpportunityDataResponse = opportunityContactsData || {
          Opportunity: [opportunity],
          OpportunityContact: []
        }

        console.log('🔄 Mapping opportunity with contacts:', {
          opportunityId: opportunity.id,
          hasStoredContacts: !!opportunityContactsData,
          contactCount: responseWithContacts.OpportunityContact?.length || 0
        })

        return mapOpportunityDataToFormValues(responseWithContacts)
      },
    [opportunityContactsData]
  )

  useEffect(() => {
    const loadOpportunityData = async () => {
      if (!opportunityId || !businessAppContext.accessToken) {
        console.log('⚠️ CRM Opportunity Data Hook: Cannot load - missing opportunityId or accessToken', {
          hasOpportunityId: !!opportunityId,
          hasAccessToken: !!businessAppContext.accessToken
        })
        return
      }

      console.log('🔍 CRM Opportunity Data Hook: Fetching opportunity data', { opportunityId })

      try {
        setLoading(true)
        setError(null)

        const result = await fetchOpportunityData({ opportunityId })
        console.log('✅ CRM Opportunity Data Hook: Fetched opportunity data', result)

        if (result.Opportunity?.[0]) {
          console.log('✅ CRM Opportunity Data Hook: Setting opportunity data with contacts', {
            opportunity: result.Opportunity[0],
            contactCount: result.OpportunityContact?.length || 0
          })
          setOpportunityData(result.Opportunity[0])
          setOpportunityContactsData(result) // Store full response including contacts
        } else {
          console.error('❌ CRM Opportunity Data Hook: No opportunity found in result')
          setError('Opportunity not found')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading opportunity data'
        console.error('❌ CRM Opportunity Data Hook: Error loading opportunity data:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (opportunityId) {
      loadOpportunityData()
    } else {
      console.log('⚠️ CRM Opportunity Data Hook: No opportunityId provided')
    }
  }, [opportunityId, businessAppContext.accessToken]) // Removed fetchOpportunityData to prevent infinite loops

  const refetch = useCallback(async () => {
    if (!opportunityId || !businessAppContext.accessToken) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchOpportunityData({ opportunityId })
      if (result.Opportunity?.[0]) {
        setOpportunityData(result.Opportunity[0])
        setOpportunityContactsData(result) // Store full response including contacts
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading opportunity data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [opportunityId, businessAppContext.accessToken]) // Removed fetchOpportunityData to prevent infinite loops

  return {
    opportunityData,
    opportunityContactsData,
    loading,
    error,
    refetch,
    mapOpportunityToFormValues
  }
}
