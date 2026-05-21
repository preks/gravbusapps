import { useCallback, useEffect, useMemo, useState } from 'react'
import { MarkerType } from '@xyflow/react'
import { useTranslation } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildInvestmentCompanyGroupGraphQuery } from '../queries/companyGroupGraphQueries'
import type {
  InvestmentCompanyGraphExecutive,
  InvestmentCompanyGraphNode,
  InvestmentCompanyGroupGraph,
  InvestmentCompanyOwnershipEdge
} from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

interface RawInvestmentCompany {
  id?: string
  name?: string
  code?: string
  description?: string
  pictureThumbnail?: string
  investmentCompanyExecutives?: RawInvestmentCompanyExecutive[]
  investmentCompanyOwnership?: RawInvestmentCompanyOwnership[]
}

interface RawPersonRef {
  id?: string
  displayName?: string
  fullName?: string
  firstName?: string
  lastName?: string
}

interface RawInvestmentCompanyExecutive {
  id?: string
  employeeId?: string
  investmentContactId?: string
  executiveTypeRef?: string
  executiveType?: { value?: string; code?: string }
  employee?: RawPersonRef
  investmentContact?: RawPersonRef
}

interface RawInvestmentCompanyOwnership {
  id?: string
  investmentCompanyId?: string
  ownerInvestmentCompanyId?: string
  percentage?: number
  ownerInvestmentCompany?: RawInvestmentCompany
}

interface RawGroupAssociation {
  investmentCompanyId?: string
  investmentCompany?: RawInvestmentCompany
}

interface RawGroupGraph {
  id: string
  name?: string
  investmentCompanyGroupAssociation?: RawGroupAssociation[]
}

export interface UseInvestmentCompanyGroupGraphResult {
  graph: InvestmentCompanyGroupGraph | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function addCompanyNode(
  nodesById: Map<string, InvestmentCompanyGraphNode>,
  company: RawInvestmentCompany,
  onOpenCompany: (investmentCompanyId: string) => void,
  unnamedInvestmentCompanyLabel: string,
  isExternalOwner = false
) {
  if (!company.id || nodesById.has(company.id)) return

  const executives = toGraphExecutives(company.investmentCompanyExecutives)

  nodesById.set(company.id, {
    id: company.id,
    type: 'investmentCompany',
    position: { x: 0, y: 0 },
    data: {
      investmentCompanyId: company.id,
      name: company.name || unnamedInvestmentCompanyLabel,
      code: company.code,
      description: company.description,
      pictureThumbnail: company.pictureThumbnail,
      executives,
      isExternalOwner,
      ownedCompaniesCount: 0,
      ownersCount: 0,
      onOpenCompany
    }
  })
}

function getPersonName(person?: RawPersonRef): string | undefined {
  if (!person) return undefined
  return (
    person.displayName || person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || undefined
  )
}

function toGraphExecutives(executives?: RawInvestmentCompanyExecutive[]): InvestmentCompanyGraphExecutive[] {
  return (executives || []).flatMap(executive => {
    const isEmployee = Boolean(executive.employeeId || executive.employee)
    const name = getPersonName(isEmployee ? executive.employee : executive.investmentContact)

    if (!executive.id || !name) return []

    const employeeId = executive.employeeId || executive.employee?.id
    const investmentContactId = executive.investmentContactId || executive.investmentContact?.id

    return [
      {
        id: executive.id,
        name,
        source: isEmployee ? ('Employee' as const) : ('Investment Contact' as const),
        ...(employeeId ? { employeeId } : {}),
        ...(investmentContactId ? { investmentContactId } : {}),
        executiveType: executive.executiveType?.value || executive.executiveType?.code || executive.executiveTypeRef
      }
    ]
  })
}

function buildGraph(
  rawGroup: RawGroupGraph,
  onOpenCompany: (investmentCompanyId: string) => void,
  unnamedInvestmentCompanyLabel: string
): InvestmentCompanyGroupGraph {
  const groupCompanies =
    rawGroup.investmentCompanyGroupAssociation?.map(association => association.investmentCompany) || []
  const groupCompanyIds = new Set(groupCompanies.map(company => company?.id).filter(Boolean) as string[])
  const nodesById = new Map<string, InvestmentCompanyGraphNode>()
  const edgesById = new Map<string, InvestmentCompanyOwnershipEdge>()

  groupCompanies.forEach(company => {
    if (company) addCompanyNode(nodesById, company, onOpenCompany, unnamedInvestmentCompanyLabel)
  })

  groupCompanies.forEach(company => {
    company?.investmentCompanyOwnership?.forEach(ownership => {
      if (!ownership.investmentCompanyId || !ownership.ownerInvestmentCompanyId) return

      const ownerIsInGroup = groupCompanyIds.has(ownership.ownerInvestmentCompanyId)
      if (!ownerIsInGroup && ownership.ownerInvestmentCompany) {
        addCompanyNode(nodesById, ownership.ownerInvestmentCompany, onOpenCompany, unnamedInvestmentCompanyLabel, true)
      }

      if (!nodesById.has(ownership.ownerInvestmentCompanyId) || !nodesById.has(ownership.investmentCompanyId)) return

      const edgeId = ownership.id || `${ownership.ownerInvestmentCompanyId}-${ownership.investmentCompanyId}`
      edgesById.set(edgeId, {
        id: edgeId,
        source: ownership.ownerInvestmentCompanyId,
        target: ownership.investmentCompanyId,
        type: 'ownership',
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        data: { percentage: ownership.percentage }
      })
    })
  })

  const edges = Array.from(edgesById.values())
  edges.forEach(edge => {
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (source) source.data.ownedCompaniesCount += 1
    if (target) target.data.ownersCount += 1
  })

  return {
    id: rawGroup.id,
    name: rawGroup.name,
    nodes: Array.from(nodesById.values()),
    edges
  }
}

export function useInvestmentCompanyGroupGraph(
  accessToken: string | undefined,
  groupId: string | undefined,
  onOpenCompany: (investmentCompanyId: string) => void
): UseInvestmentCompanyGroupGraphResult {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken)
  const stableOnOpenCompany = useCallback(onOpenCompany, [onOpenCompany])
  const [state, setState] = useState<Omit<UseInvestmentCompanyGroupGraphResult, 'refetch'>>({
    graph: null,
    loading: false,
    error: null
  })

  const fetchGraph = useCallback(async () => {
    if (!accessToken || !groupId) {
      setState({ graph: null, loading: false, error: null })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await graphqlClient.request<{ InvestmentCompanyGroupByPk?: RawGroupGraph | null }>(
        buildInvestmentCompanyGroupGraphQuery(),
        { id: groupId }
      )
      const rawGroup = result.InvestmentCompanyGroupByPk
      setState({
        graph: rawGroup ? buildGraph(rawGroup, stableOnOpenCompany, t('unnamed-investment-company')) : null,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('fetch-error')
      console.error('Error fetching investment company group graph:', error)
      setState({ graph: null, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, groupId, stableOnOpenCompany, t])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  return useMemo(() => ({ ...state, refetch: fetchGraph }), [fetchGraph, state])
}
