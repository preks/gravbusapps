import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface SimpleItem {
  id: string
  label: string
}

export interface StatusItem extends SimpleItem {
  code?: string
}

export const useInvestmentOpportunityFilters = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [owners, setOwners] = useState<SimpleItem[]>([])
  const [stages, setStages] = useState<SimpleItem[]>([])
  const [pipelines, setPipelines] = useState<SimpleItem[]>([])
  const [accounts, setAccounts] = useState<SimpleItem[]>([])
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [forecasts, setForecasts] = useState<SimpleItem[]>([])
  const [amountRange, setAmountRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000000 })

  const loadOwners = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        InvestmentOpportunity: Array<{
          ownerEmployee?: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
      }>(`
        query GetOppOwners {
          InvestmentOpportunity(where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }, distinctOn: [ownerEmployeeId], limit: 50) {
            ownerEmployee { id displayName firstName lastName }
          }
        }
      `)
      const items: SimpleItem[] = (res?.InvestmentOpportunity || [])
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
        InvestmentOpportunity: Array<{
          opportunityPipelineStage?: { id: string; code?: string; value?: string } | null
        }>
      }>(`
        query GetOppStages {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityPipelineStageRef], limit: 50) {
            opportunityPipelineStage { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      ;(res?.InvestmentOpportunity || []).forEach(r => {
        const s = r.opportunityPipelineStage
        if (s?.id) map.set(s.id, s.value || s.code || s.id)
      })
      setStages(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setStages([])
    }
  }, [context.accessToken, graphqlClient])

  const loadPipelines = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        InvestmentOpportunity: Array<{ opportunityPipeline?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppPipelines {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityPipelineRef], limit: 50) {
            opportunityPipeline { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      ;(res?.InvestmentOpportunity || []).forEach(r => {
        const p = r.opportunityPipeline
        if (p?.id) map.set(p.id, p.value || p.code || p.id)
      })
      setPipelines(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setPipelines([])
    }
  }, [context.accessToken, graphqlClient])

  const loadAccounts = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        InvestmentOpportunity: Array<{
          investmentOpportunityAccount?: Array<{
            accountId: string
            account?: { id: string; name: string } | null
          }> | null
        }>
      }>(`
        query GetOppAccounts {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, limit: 100) {
            opportunityAccounts(where: { isDeleted: { _eq: false } }) {
              accountId
              account { id name }
            }
          }
        }
      `)
      const map = new Map<string, string>()
      ;(res?.InvestmentOpportunity || []).forEach(opp => {
        opp.opportunityAccounts?.forEach(assoc => {
          const a = assoc.account
          if (a?.id) map.set(a.id, a.name)
        })
      })
      setAccounts(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setAccounts([])
    }
  }, [context.accessToken, graphqlClient])

  const loadStatuses = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        InvestmentOpportunity: Array<{ opportunityStatus?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppStatuses {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityStatusRef], limit: 50) {
            opportunityStatus { id code value }
          }
        }
      `)
      const map = new Map<string, StatusItem>()
      ;(res?.InvestmentOpportunity || []).forEach(r => {
        const s = r.opportunityStatus
        if (s?.id) {
          map.set(s.id, {
            id: s.id,
            label: s.value || s.code || s.id,
            code: s.code
          })
        }
      })
      setStatuses(Array.from(map.values()))
    } catch {
      setStatuses([])
    }
  }, [context.accessToken, graphqlClient])

  const loadForecasts = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        InvestmentOpportunity: Array<{
          opportunityForecast?: { id: string; code?: string; value?: string; additionalValue1?: string } | null
        }>
      }>(`
        query GetOppForecasts {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityForecastRef], limit: 50) {
            opportunityForecast { id code value additionalValue1 }
          }
        }
      `)
      const map = new Map<string, string>()
      ;(res?.InvestmentOpportunity || []).forEach(r => {
        const f = r.opportunityForecast
        if (f?.id) {
          const value = f.value || f.code || f.id
          const additionalValue1 = f.additionalValue1 || ''
          const label = additionalValue1 ? `${value}: ${additionalValue1}` : value
          map.set(f.id, label)
        }
      })
      setForecasts(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setForecasts([])
    }
  }, [context.accessToken, graphqlClient])

  const loadAmountRange = useCallback(async () => {
    if (!context.accessToken) return
    try {
      const res = await graphqlClient.request<{
        InvestmentOpportunityAggregate: {
          aggregate: {
            min: { estimatedAmount: number | null }
            max: { estimatedAmount: number | null }
          } | null
        }
      }>(`
        query GetOppAmountRange {
          InvestmentOpportunityAggregate(where: { isDeleted: { _eq: false } }) {
            aggregate {
              min { estimatedAmount }
              max { estimatedAmount }
            }
          }
        }
      `)
      const minAmount = res?.InvestmentOpportunityAggregate?.aggregate?.min?.estimatedAmount ?? 0
      const maxAmount = res?.InvestmentOpportunityAggregate?.aggregate?.max?.estimatedAmount ?? 1000000
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
