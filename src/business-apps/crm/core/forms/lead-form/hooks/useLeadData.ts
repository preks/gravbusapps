import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetLeadById, LeadQueryResult } from '../queries/LeadQueries'
import { LeadFormValues } from '../types'
import { extractAddressFromObject } from '../../../../common/utils/addressUtils'

interface UseLeadDataProps {
  businessAppContext: BusinessAppContextProps
}

interface UseLeadDataReturn {
  leadData: LeadQueryResult | null
  isLoading: boolean
  error: string | null
  mapLeadToFormValues: (lead: LeadQueryResult) => Partial<LeadFormValues>
}

export const useLeadData = ({ businessAppContext }: UseLeadDataProps): UseLeadDataReturn => {
  const [leadData, setLeadData] = useState<LeadQueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchLeadById } = useGetLeadById(businessAppContext)

  // Function to map lead data to form values
  const mapLeadToFormValues = useCallback((lead: LeadQueryResult): Partial<LeadFormValues> => {
    // Handle addresses - use first address if available
    const firstAddress = lead.addresses && lead.addresses.length > 0 ? lead.addresses[0] : null

    const mappedValues = {
      // System fields
      id: lead.id,
      version: lead.version,

      // Contact Information
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phoneNumber || '',
      jobPosition: lead.position || '',

      // Company Information
      company: lead.companyName || '',
      companyEmail: lead.companyEmail || '',
      companyPhone: lead.companyPhone || '',
      website: lead.companyWebsite || '',
      industry: lead.industryRef || lead.industry?.id || '',
      legalForm: lead.legalFormRef || lead.legalForm?.id || '',
      annualRevenue: lead.annualRevenueRef || '',
      numberOfEmployees: lead.numberOfEmployeesRef || '',

      // Lead Information - Owner is critical for proper form population
      owner: lead.ownerEmployeeId || '',
      leadStatus: lead.leadStatusRef || lead.leadStatus?.id || '',
      leadSource: lead.leadSourceRef || lead.leadSource?.id || '',
      rating: lead.leadRatingRef || lead.leadRating?.id || '',
      sensitive: lead.sensitive || false,

      // Campaign Information
      salesCampaignId: lead.salesCampaignId || lead.salesCampaign?.id || '',

      // Address Information
      country: lead.countryRef || lead.country?.id || '',
      region: firstAddress?.regionRef || '',
      city: firstAddress?.city || '',
      postalCode: firstAddress?.postalCode || '',
      addressLine1: extractAddressFromObject(firstAddress?.addressLine) || '',

      // Company relationship
      accountId: lead.account?.id || ''
    }

    return mappedValues
  }, [])

  // Load lead data when leadId is provided in additionalData
  useEffect(() => {
    const loadLeadData = async () => {
      // Handle leadId the same way as ConvertLeadForm
      const leadId =
        businessAppContext.additionalData?.leadId ||
        businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId

      if (!leadId || !businessAppContext.accessToken) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const lead = await fetchLeadById(leadId)

        if (lead) {
          setLeadData(lead)
        } else {
          setError('Lead not found')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load lead data'
        setError(errorMessage)
        console.error('Error loading lead data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadLeadData()
  }, [
    businessAppContext.additionalData?.leadId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId,
    businessAppContext.accessToken,
    fetchLeadById
  ])

  return {
    leadData,
    isLoading,
    error,
    mapLeadToFormValues
  }
}
