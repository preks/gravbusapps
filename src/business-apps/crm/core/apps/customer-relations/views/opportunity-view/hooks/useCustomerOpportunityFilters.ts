import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface SimpleItem {
  id: string
  label: string
}

export const useCustomerOpportunityFilters = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [owners, setOwners] = useState<SimpleItem[]>([])
  const [stages, setStages] = useState<SimpleItem[]>([])
  const [pipelines, setPipelines] = useState<SimpleItem[]>([])
  const [accounts, setAccounts] = useState<SimpleItem[]>([])
  const [statuses, setStatuses] = useState<SimpleItem[]>([])
  const [forecasts, setForecasts] = useState<SimpleItem[]>([])
  const [amountRange, setAmountRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000000 })

  const loadOwners = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{
          ownerEmployee?: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
      }>(`
        query GetOppOwners {
          Opportunity(where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }, distinctOn: [ownerEmployeeId], limit: 50) {
            ownerEmployee { id displayName firstName lastName }
          }
        }
      `)
      const items: SimpleItem[] = (res?.Opportunity || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const e = r.ownerEmployee!
          const name = e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown'
          return { id: e.id, label: name }
        })
      setOwners(items)
    } catch {
      setOwners([])
    }
  }, [context.accessToken, graphqlClient])

  const loadStages = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{
          salesPipelineStage?: { id: string; code?: string; value?: string } | null
        }>
      }>(`
        query GetOppStages {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [salesPipelineStageRef], limit: 50) {
            salesPipelineStage { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const s = r.salesPipelineStage
        if (s?.id) map.set(s.id, s.value || s.code || s.id)
      }
      setStages(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setStages([])
    }
  }, [context.accessToken, graphqlClient])

  const loadPipelines = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ salesPipeline?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppPipelines {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [salesPipelineRef], limit: 50) {
            salesPipeline { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const p = r.salesPipeline
        if (p?.id) map.set(p.id, p.value || p.code || p.id)
      }
      setPipelines(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setPipelines([])
    }
  }, [context.accessToken, graphqlClient])

  const loadAccounts = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ account?: { id: string; name: string } | null }>
      }>(`
        query GetOppAccounts {
          Opportunity(where: { isDeleted: { _eq: false } }, limit: 100) {
            account { id name }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const a = r.account
        if (a?.id) map.set(a.id, a.name)
      }
      setAccounts(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setAccounts([])
    }
  }, [context.accessToken, graphqlClient])

  const loadStatuses = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ opportunityStatus?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppStatuses {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityStatusRef], limit: 50) {
            opportunityStatus { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const s = r.opportunityStatus
        if (s?.id) map.set(s.id, s.value || s.code || s.id)
      }
      setStatuses(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setStatuses([])
    }
  }, [context.accessToken, graphqlClient])

  const loadForecasts = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{
          opportunityForecast?: { id: string; code?: string; value?: string; additionalValue1?: string } | null
        }>
      }>(`
        query GetOppForecasts {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityForecastRef], limit: 50) {
            opportunityForecast { id code value additionalValue1 }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const f = r.opportunityForecast
        if (f?.id) {
          const value = f.value || f.code || f.id
          const additionalValue1 = f.additionalValue1 || ''
          const label = additionalValue1 ? `${value}: ${additionalValue1}` : value
          map.set(f.id, label)
        }
      }
      setForecasts(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setForecasts([])
    }
  }, [context.accessToken, graphqlClient])

  const loadAmountRange = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        OpportunityAggregate: {
          aggregate: {
            min: { estimatedAmount: number | null }
            max: { estimatedAmount: number | null }
          } | null
        }
      }>(`
        query GetOppAmountRange {
          OpportunityAggregate(where: { isDeleted: { _eq: false } }) {
            aggregate {
              min { estimatedAmount }
              max { estimatedAmount }
            }
          }
        }
      `)
      const minAmount = res?.OpportunityAggregate?.aggregate?.min?.estimatedAmount ?? 0
      const maxAmount = res?.OpportunityAggregate?.aggregate?.max?.estimatedAmount ?? 1000000
      setAmountRange({ min: Math.floor(minAmount), max: Math.ceil(maxAmount) })
    } catch {
      setAmountRange({ min: 0, max: 1000000 })
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    loadOwners()
    loadStages()
    loadPipelines()
    loadAccounts()
    loadStatuses()
    loadForecasts()
    loadAmountRange()
  }, [loadOwners, loadStages, loadPipelines, loadAccounts, loadStatuses, loadForecasts, loadAmountRange])

  return { owners, stages, pipelines, accounts, statuses, forecasts, amountRange }
}
