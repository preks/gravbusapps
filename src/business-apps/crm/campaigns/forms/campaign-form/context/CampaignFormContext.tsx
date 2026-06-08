import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { CampaignFormValues, CampaignFormContextValue } from '../types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

interface ProviderProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<CampaignFormValues>
  onSubmit: (values: CampaignFormValues) => Promise<void>
  onCancel: () => Promise<void>
}

const CampaignFormContext = createContext<CampaignFormContextValue | null>(null)

type PrefetchedOwnerEmployee = { id: string; displayName: string } | null

type SalesCampaignOwnerData = {
  ownerEmployeeId?: string
  ownerEmployee?: { id: string; displayName: string }
}

function resolvePrefetchedOwnerEmployee(item: SalesCampaignOwnerData): PrefetchedOwnerEmployee {
  if (item.ownerEmployee?.id) {
    return { id: item.ownerEmployee.id, displayName: item.ownerEmployee.displayName }
  }
  const ownerId = item.ownerEmployeeId ?? ''
  if (ownerId) {
    return { id: ownerId, displayName: '' }
  }
  return null
}

export const useCampaignFormContext = (): CampaignFormContextValue => {
  const ctx = useContext(CampaignFormContext)
  if (!ctx) throw new Error('useCampaignFormContext must be used within CampaignFormProvider')
  return ctx
}

export const CampaignFormProvider: React.FC<React.PropsWithChildren<ProviderProps>> = ({
  businessAppContext,
  initialValues,
  onSubmit,
  onCancel,
  children
}) => {
  // Extract campaignId - simple direct extraction (matching all other forms)
  const campaignId =
    businessAppContext.additionalData?.campaignId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.campaignId

  // Resolve initial form values
  const resolvedId = initialValues?.id ?? campaignId
  const resolvedVersion = initialValues?.version ?? 0
  const resolvedName = initialValues?.name ?? ''
  const resolvedTypeRef = initialValues?.typeRef ?? ''
  const resolvedStart = initialValues?.startDate ?? ''
  const resolvedEnd = initialValues?.endDate ?? ''
  const resolvedDescription = initialValues?.description ?? ''

  const resolvedSegmentRef = initialValues?.customerCampaignSegmentRef ?? ''
  const resolvedPersonaRef = initialValues?.customerPersonaRef ?? ''
  const resolvedValuePackRef = initialValues?.customerValuePackFocusRef ?? ''
  const resolvedIndustryRef = initialValues?.customerIndustryFocusRef ?? ''
  const resolvedCountryRef = initialValues?.countryRef ?? ''
  const resolvedStatusRef = initialValues?.customerCampaignStatusRef ?? ''
  const resolvedOwnerEmployeeId = initialValues?.ownerEmployeeId ?? ''

  const [prefetchedOwnerEmployee, setPrefetchedOwnerEmployee] = useState<{
    id: string
    displayName: string
  } | null>(resolvedOwnerEmployeeId ? { id: resolvedOwnerEmployeeId, displayName: '' } : null)

  const [formValues, setFormValues] = useState<CampaignFormValues>({
    id: resolvedId,
    version: resolvedVersion,
    name: resolvedName,
    typeRef: resolvedTypeRef,
    startDate: resolvedStart ? dayjs(resolvedStart).format('YYYY-MM-DD') : '',
    endDate: resolvedEnd ? dayjs(resolvedEnd).format('YYYY-MM-DD') : '',
    description: resolvedDescription,
    customerCampaignSegmentRef: resolvedSegmentRef,
    customerPersonaRef: resolvedPersonaRef,
    customerValuePackFocusRef: resolvedValuePackRef,
    customerIndustryFocusRef: resolvedIndustryRef,
    countryRef: resolvedCountryRef,
    customerCampaignStatusRef: resolvedStatusRef,
    ownerEmployeeId: resolvedOwnerEmployeeId,
    budgetAllocated: initialValues?.budgetAllocated,
    pipelineTarget: initialValues?.pipelineTarget,
    expectedWinRate: initialValues?.expectedWinRate,
    expectedRevenueContribution: initialValues?.expectedRevenueContribution
  })

  // If we have only an id and are in update mode, fetch existing values to prefill
  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)
  useEffect(() => {
    const shouldFetch =
      Boolean(campaignId) &&
      (!resolvedName ||
        !resolvedTypeRef ||
        !resolvedStart ||
        !resolvedEnd ||
        initialValues?.ownerEmployeeId === undefined)
    if (!shouldFetch) return
    let isCancelled = false
    const query = `
      query GetSalesCampaignById($id: uuid!) {
        SalesCampaign(where: { id: { _eq: $id }, isDeleted: { _eq: false } }, limit: 1) {
          id
          name
          description
          startDate
          endDate
          typeRef
          version
          customerCampaignSegmentRef
          customerPersonaRef
          customerValuePackFocusRef
          customerIndustryFocusRef
          countryRef
          customerCampaignStatusRef
          budgetAllocated
          pipelineTarget
          expectedWinRate
          expectedRevenueContribution
          ownerEmployeeId
          ownerEmployee { id displayName }
        }
      }
    `

    interface SalesCampaignData {
      id: string
      version?: number
      name?: string
      typeRef?: string
      startDate?: string
      endDate?: string
      description?: string
      customerCampaignSegmentRef?: string
      customerPersonaRef?: string
      customerValuePackFocusRef?: string
      customerIndustryFocusRef?: string
      countryRef?: string
      customerCampaignStatusRef?: string
      budgetAllocated?: number
      pipelineTarget?: number
      expectedWinRate?: number
      expectedRevenueContribution?: number
      ownerEmployeeId?: string
      ownerEmployee?: { id: string; displayName: string }
    }

    ;(async () => {
      try {
        const result = await graphqlClient.request<{ SalesCampaign: SalesCampaignData[] }>(query, { id: campaignId })
        const item = result?.SalesCampaign?.[0]
        if (!isCancelled && item) {
          const ownerId = item.ownerEmployeeId ?? item.ownerEmployee?.id ?? ''
          setPrefetchedOwnerEmployee(resolvePrefetchedOwnerEmployee(item))
          setFormValues({
            id: item.id,
            version: item.version ?? 0,
            name: item.name ?? '',
            typeRef: item.typeRef ?? '',
            startDate: item.startDate ? dayjs(item.startDate).format('YYYY-MM-DD') : '',
            endDate: item.endDate ? dayjs(item.endDate).format('YYYY-MM-DD') : '',
            description: item.description ?? '',
            customerCampaignSegmentRef: item.customerCampaignSegmentRef ?? undefined,
            customerPersonaRef: item.customerPersonaRef ?? undefined,
            customerValuePackFocusRef: item.customerValuePackFocusRef ?? undefined,
            customerIndustryFocusRef: item.customerIndustryFocusRef ?? undefined,
            countryRef: item.countryRef ?? undefined,
            customerCampaignStatusRef: item.customerCampaignStatusRef ?? undefined,
            ownerEmployeeId: ownerId,
            budgetAllocated: item.budgetAllocated,
            pipelineTarget: item.pipelineTarget,
            expectedWinRate: item.expectedWinRate,
            expectedRevenueContribution: item.expectedRevenueContribution
          })
        }
      } catch {
        // ignore and keep defaults
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [
    businessAppContext.accessToken,
    campaignId,
    graphqlClient,
    initialValues?.ownerEmployeeId,
    resolvedEnd,
    resolvedName,
    resolvedStart,
    resolvedTypeRef
  ])

  const value: CampaignFormContextValue = useMemo(
    () => ({
      businessAppContext,
      formValues,
      prefetchedOwnerEmployee,
      onSubmit,
      onCancel,
      isLoading: false, // No longer tracked in context since catalogs are handled by CatalogSelect
      error: null, // No longer tracked in context since catalogs are handled by CatalogSelect
      isUpdateMode: Boolean(initialValues?.id) || Boolean(resolvedId)
    }),
    [businessAppContext, formValues, prefetchedOwnerEmployee, onSubmit, onCancel, initialValues?.id, resolvedId]
  )

  return <CampaignFormContext.Provider value={value}>{children}</CampaignFormContext.Provider>
}
