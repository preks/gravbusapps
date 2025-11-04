import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { GET_OPPORTUNITY_BY_ID, GetOpportunityByIdResponse } from '../queries/GetOpportunityByIdQueries'
import { useGetSalesActivities } from '../queries/OpportunityActivityQueries'
import { useGetSalesTasks } from '../queries/OpportunityTaskQueries'
import { useGetCrmNotes } from '../queries/CrmNoteQueries'
import { useGetCrmDocuments } from '../queries/CrmDocumentQueries'
import { useSalesPipelineStages } from './useSalesPipelineStages'
import { Opportunity, ReferenceData } from '../types'

export const useOpportunityData = (opportunityId: string, accessToken: string) => {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [opportunityData, setOpportunityData] = useState<any>(null)
  const [stageConditionStatuses, setStageConditionStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opportunityStatuses, setOpportunityStatuses] = useState<ReferenceData[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(false)

  // New states for activities, tasks, notes, and documents
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  // Use the new pipeline stages hook
  const {
    pipelineStages: opportunityStages,
    loadingPipelineStages: loadingStages,
    errorPipelineStages: stagesError
  } = useSalesPipelineStages(opportunityData?.salesPipelineRef, accessToken)

  // Initialize the new query hooks
  const { fetchSalesActivities } = useGetSalesActivities({ accessToken })
  const { fetchSalesTasks } = useGetSalesTasks({ accessToken })
  const { fetchCrmNotes } = useGetCrmNotes({ accessToken })
  const { fetchCrmDocuments } = useGetCrmDocuments({ accessToken })

  const fetchOpportunityData = async () => {
    // Use a fallback ID if none provided
    const safeOpportunityId = opportunityId || '2cabb386-82b8-4a9b-8a91-e8d008b4b2e8'

    try {
      setLoading(true)
      setError(null)

      console.log('Fetching opportunity data for ID:', safeOpportunityId)

      const result = await graphQLClient.request<GetOpportunityByIdResponse>(GET_OPPORTUNITY_BY_ID, {
        id: safeOpportunityId
      })

      if (result && result.Opportunity && result.Opportunity.length > 0) {
        const rawOpportunityData = result.Opportunity[0]
        // Attach OpportunityContact data to the opportunity
        const enhancedOpportunityData = {
          ...rawOpportunityData,
          opportunityContacts: result.OpportunityContact || []
        }
        setOpportunityData(enhancedOpportunityData)

        // Set stage condition statuses if available
        if (rawOpportunityData.stageConditionStatuses) {
          setStageConditionStatuses(rawOpportunityData.stageConditionStatuses)
        }

        // Transform the data for the UI
        const transformedOpportunity: Opportunity = {
          id: rawOpportunityData.id,
          name: rawOpportunityData.name || 'Unknown Opportunity',
          description: '',
          version: rawOpportunityData.version ?? '1',
          status: rawOpportunityData.opportunityStatus?.value || 'Open',
          statusRef: rawOpportunityData.opportunityStatus?.id || '',
          stage: rawOpportunityData.salesPipelineStage?.code || 'Discovery', // Use actual stage from API
          stageRef: '',
          value: rawOpportunityData.estimatedAmount || 0, // Use estimatedAmount from GraphQL
          currency: {
            id: rawOpportunityData.currency?.id || 'EUR',
            type: 'currency',
            value: rawOpportunityData.currency?.value || 'EUR',
            code: rawOpportunityData.currency?.code || 'EUR'
          },
          currencyRef: rawOpportunityData.currency?.id || '',
          probability: 0, // Default since not in API
          expectedCloseDate: '',
          actualCloseDate: '',
          source: {
            id: 'website',
            type: 'opportunitySource',
            value: 'Website',
            code: 'website'
          },
          sourceRef: '',
          priority: {
            id: 'medium',
            type: 'priority',
            value: 'Medium',
            code: 'medium'
          },
          priorityRef: '',
          ownerEmployeeId: rawOpportunityData.ownerEmployee?.id || '',
          ownerEmployee: {
            firstName: rawOpportunityData.ownerEmployee?.firstName || '',
            lastName: rawOpportunityData.ownerEmployee?.lastName || ''
          },
          ownerOrganization: {
            name: ''
          },
          accountId: rawOpportunityData.account?.id || '',
          account: rawOpportunityData.account
            ? ({
                id: rawOpportunityData.account.id,
                version: rawOpportunityData.account.version || '1',
                name: rawOpportunityData.account.name || '',
                industryRef: rawOpportunityData.account.industryRef || '',
                industry: {
                  code: rawOpportunityData.account.industry?.code || '',
                  id: rawOpportunityData.account.industry?.id || '',
                  type: 'industry',
                  value: rawOpportunityData.account.industry?.value || ''
                },
                numberOfEmployees: {
                  type: 'numberOfEmployees',
                  value: rawOpportunityData.account.numberOfEmployees?.value || '',
                  id: rawOpportunityData.account.numberOfEmployees?.id || '',
                  code: rawOpportunityData.account.numberOfEmployees?.code || ''
                },
                numberOfEmployeesRef: rawOpportunityData.account.numberOfEmployees?.id || '',
                addressLine: rawOpportunityData.account.addresses?.[0]?.addressLine || '',
                foundationDate: rawOpportunityData.account.foundationDate || '',
                annualRevenueRef: rawOpportunityData.account.annualRevenue?.id || '',
                annualRevenue: {
                  type: 'annualRevenue',
                  value: rawOpportunityData.account.annualRevenue?.value || '',
                  id: rawOpportunityData.account.annualRevenue?.id || '',
                  code: rawOpportunityData.account.annualRevenue?.code || ''
                },
                website: rawOpportunityData.account.website || '',
                ownerEmployeeId: rawOpportunityData.account.ownerEmployee?.firstName || '',
                ownerEmployee: rawOpportunityData.account.ownerEmployee
                  ? {
                      firstName: rawOpportunityData.account.ownerEmployee.firstName,
                      lastName: rawOpportunityData.account.ownerEmployee.lastName
                    }
                  : undefined
              } as any)
            : null,
          contact: {
            id: '',
            version: '1',
            email: '',
            name: 'No Contact Available',
            phone: '',
            pictureUrl: '',
            jobTitle: ''
          },
          leadId: rawOpportunityData.lead?.id || '',
          lead: rawOpportunityData.lead
            ? {
                id: rawOpportunityData.lead.id,
                name: rawOpportunityData.lead.companyName || '',
                status: rawOpportunityData.lead.leadStatus?.value || ''
              }
            : undefined,
          activities: [],
          tasks: [],
          competitors: [],
          products: [],
          aiSummary: {
            text: '',
            insights: [],
            recommendations: []
          }
        }

        setOpportunity(transformedOpportunity)
      } else {
        setError('Opportunity not found')
      }
    } catch (err) {
      console.error('Error fetching opportunity data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunity data')
    } finally {
      setLoading(false)
    }
  }

  const fetchOpportunityStatuses = async (sourceApp?: string) => {
    try {
      setLoadingStatuses(true)
      // Choose correct catalog per source app
      const catalogIdentifier =
        sourceApp === 'IRM' || sourceApp === 'investment-relations'
          ? 'InvestmentOpportunityStatus'
          : 'SalesOpportunityStatus'

      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier, version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )

      if (response && response.data && Array.isArray(response.data)) {
        const statusData = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value
        }))
        setOpportunityStatuses(statusData)
      } else {
        // Set empty array if no data
        setOpportunityStatuses([])
      }
    } catch (err) {
      console.error('Error fetching opportunity statuses:', err)
      // Set empty array on error to prevent undefined .map() calls
      setOpportunityStatuses([])
    } finally {
      setLoadingStatuses(false)
    }
  }

  // New fetch functions for activities, tasks, notes, and documents
  const fetchActivities = async () => {
    try {
      setLoadingActivities(true)
      const result = await fetchSalesActivities({ opportunityId })
      setActivities(result.SalesActivity || [])
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setLoadingActivities(false)
    }
  }

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true)
      const result = await fetchSalesTasks({ opportunityId })
      setTasks(result.SalesTask || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoadingTasks(false)
    }
  }

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true)
      const result = await fetchCrmNotes({ opportunityId })
      setNotes(result.CrmNote || [])
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const result = await fetchCrmDocuments({ opportunityId })
      setDocuments(result.CrmDocument || [])
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setLoadingDocuments(false)
    }
  }

  useEffect(() => {
    if (opportunityId && accessToken) {
      ;(async () => {
        await fetchOpportunityData()
        // After opportunityData is populated, decide which catalog to load
        const srcApp = (opportunityData as any)?.sourceApp
        await fetchOpportunityStatuses(srcApp)
        fetchActivities()
        fetchTasks()
        fetchNotes()
        fetchDocuments()
      })()
    }
  }, [opportunityId, accessToken])

  return {
    opportunity,
    opportunityData,
    stageConditionStatuses,
    loading,
    error,
    opportunityStages,
    opportunityStatuses,
    loadingStages,
    loadingStatuses,
    stagesError,
    activities,
    tasks,
    notes,
    documents,
    loadingActivities,
    loadingTasks,
    loadingNotes,
    loadingDocuments,
    refetchOpportunityData: fetchOpportunityData,
    refetchActivities: fetchActivities,
    refetchTasks: fetchTasks,
    refetchNotes: fetchNotes,
    refetchDocuments: fetchDocuments
  }
}
