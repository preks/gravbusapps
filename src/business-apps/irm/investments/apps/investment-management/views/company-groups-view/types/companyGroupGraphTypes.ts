import type { Node, Edge } from '@xyflow/react'

export interface InvestmentCompanyGraphNodeData extends Record<string, unknown> {
  investmentCompanyId: string
  name: string
  code?: string
  description?: string
  pictureThumbnail?: string
  executives?: InvestmentCompanyGraphExecutive[]
  isExternalOwner?: boolean
  ownedCompaniesCount: number
  ownersCount: number
  onOpenCompany: (investmentCompanyId: string) => void
}

export interface InvestmentCompanyGraphExecutive {
  id: string
  name: string
  source: 'Employee' | 'Investment Contact'
  executiveType?: string
}

export interface InvestmentCompanyOwnershipEdgeData extends Record<string, unknown> {
  percentage?: number
}

export type InvestmentCompanyGraphNode = Node<InvestmentCompanyGraphNodeData, 'investmentCompany'>
export type InvestmentCompanyOwnershipEdge = Edge<InvestmentCompanyOwnershipEdgeData>

export interface InvestmentCompanyGroupGraph {
  id: string
  name?: string
  nodes: InvestmentCompanyGraphNode[]
  edges: InvestmentCompanyOwnershipEdge[]
}
