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

  const [formValues, setFormValues] = useState<CampaignFormValues>({
    id: resolvedId,
    version: resolvedVersion,
    name: resolvedName,
    typeRef: resolvedTypeRef,
    startDate: resolvedStart ? dayjs(resolvedStart).format('YYYY-MM-DD') : '',
    endDate: resolvedEnd ? dayjs(resolvedEnd).format('YYYY-MM-DD') : '',
    description: resolvedDescription
  })

  // If we have only an id and are in update mode, fetch existing values to prefill
  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)
  useEffect(() => {
    const shouldFetch = Boolean(campaignId) && (!resolvedName || !resolvedTypeRef || !resolvedStart || !resolvedEnd)
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
    }

    ;(async () => {
      try {
        const result = await graphqlClient.request<{ SalesCampaign: SalesCampaignData[] }>(query, { id: campaignId })
        const item = result?.SalesCampaign?.[0]
        if (!isCancelled && item) {
          setFormValues({
            id: item.id,
            version: item.version ?? 0,
            name: item.name ?? '',
            typeRef: item.typeRef ?? '',
            startDate: item.startDate ? dayjs(item.startDate).format('YYYY-MM-DD') : '',
            endDate: item.endDate ? dayjs(item.endDate).format('YYYY-MM-DD') : '',
            description: item.description ?? ''
          })
        }
      } catch {
        // ignore and keep defaults
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [businessAppContext.accessToken, campaignId, graphqlClient])

  const value: CampaignFormContextValue = useMemo(
    () => ({
      businessAppContext,
      formValues,
      onSubmit,
      onCancel,
      isLoading: false, // No longer tracked in context since catalogs are handled by CatalogSelect
      error: null, // No longer tracked in context since catalogs are handled by CatalogSelect
      isUpdateMode: Boolean(initialValues?.id) || Boolean(resolvedId)
    }),
    [businessAppContext, formValues, onSubmit, onCancel, initialValues?.id, resolvedId]
  )

  return <CampaignFormContext.Provider value={value}>{children}</CampaignFormContext.Provider>
}
