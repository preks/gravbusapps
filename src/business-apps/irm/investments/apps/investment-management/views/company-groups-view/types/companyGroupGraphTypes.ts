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
  onHoverCompany?: (investmentCompanyId?: string) => void
  onLockCompany?: (investmentCompanyId: string) => void
  onUnlockCompany?: (investmentCompanyId: string) => void
  isHighlighted?: boolean
  isDimmed?: boolean
  isLocked?: boolean
  canLock?: boolean
}

export interface InvestmentCompanyGraphExecutive {
  id: string
  name: string
  source: 'Employee' | 'Investment Contact'
  employeeId?: string
  investmentContactId?: string
  executiveType?: string
}

export interface InvestmentCompanyOwnershipEdgeData extends Record<string, unknown> {
  percentage?: number
  routePoints?: Array<{ x: number; y: number }>
  labelPosition?: { x: number; y: number }
  showPercentageLabel?: boolean
  isHighlighted?: boolean
  isDimmed?: boolean
  isLocked?: boolean
}

export type InvestmentCompanyGraphNode = Node<InvestmentCompanyGraphNodeData, 'investmentCompany'>
export type InvestmentCompanyOwnershipEdge = Edge<InvestmentCompanyOwnershipEdgeData>
export type InvestmentCompanyRelationshipDisplayMode = 'all' | 'hover' | 'locked' | 'allPercentages'
export type InvestmentCompanyEdgeViewMode = 'curved' | 'orthogonal'

export interface InvestmentCompanyGroupGraph {
  id: string
  name?: string
  nodes: InvestmentCompanyGraphNode[]
  edges: InvestmentCompanyOwnershipEdge[]
}
