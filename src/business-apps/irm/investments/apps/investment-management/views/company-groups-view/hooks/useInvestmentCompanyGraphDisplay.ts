import { useMemo } from 'react'
import { isInvestmentCompanyEdgeHidden } from '../utils/investmentCompanyGraphDisplay'
import type {
  InvestmentCompanyEdgeViewMode,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge,
  InvestmentCompanyRelationshipDisplayMode
} from '../types/companyGroupGraphTypes'

interface UseInvestmentCompanyGraphDisplayArgs {
  activeInvestmentCompanyIds: Set<string>
  edgeViewMode: InvestmentCompanyEdgeViewMode
  highlightedInvestmentCompanyIds: Set<string>
  lockedInvestmentCompanyIds: string[]
  lockedInvestmentCompanyIdSet: Set<string>
  relationshipDisplayMode: InvestmentCompanyRelationshipDisplayMode
  renderEdges: InvestmentCompanyOwnershipEdge[]
  renderNodes: InvestmentCompanyGraphNode[]
  onHoverCompany: (investmentCompanyId?: string) => void
  onLockCompany: (investmentCompanyId: string) => void
  onUnlockCompany: (investmentCompanyId: string) => void
}

export function useInvestmentCompanyGraphDisplay({
  activeInvestmentCompanyIds,
  edgeViewMode,
  highlightedInvestmentCompanyIds,
  lockedInvestmentCompanyIds,
  lockedInvestmentCompanyIdSet,
  relationshipDisplayMode,
  renderEdges,
  renderNodes,
  onHoverCompany,
  onLockCompany,
  onUnlockCompany
}: UseInvestmentCompanyGraphDisplayArgs) {
  const displayedNodes = useMemo(
    () =>
      renderNodes.map(node => {
        const hasActiveCompany = activeInvestmentCompanyIds.size > 0
        const isHighlighted = highlightedInvestmentCompanyIds.has(node.id)
        return {
          ...node,
          draggable: false,
          data: {
            ...node.data,
            onHoverCompany,
            onLockCompany,
            onUnlockCompany,
            isHighlighted: hasActiveCompany && isHighlighted,
            isDimmed: hasActiveCompany && !isHighlighted,
            isLocked: lockedInvestmentCompanyIdSet.has(node.id),
            canLock: !lockedInvestmentCompanyIdSet.has(node.id) && activeInvestmentCompanyIds.has(node.id)
          }
        }
      }),
    [
      activeInvestmentCompanyIds,
      highlightedInvestmentCompanyIds,
      lockedInvestmentCompanyIdSet,
      onHoverCompany,
      onLockCompany,
      onUnlockCompany,
      renderNodes
    ]
  )

  const displayedEdges = useMemo(
    () =>
      renderEdges.map(edge => {
        const hasActiveCompany = activeInvestmentCompanyIds.size > 0
        const isHighlighted = activeInvestmentCompanyIds.has(edge.source) || activeInvestmentCompanyIds.has(edge.target)
        const showPercentageLabel = edgeViewMode === 'orthogonal' && relationshipDisplayMode === 'allPercentages'
        const hidden = isInvestmentCompanyEdgeHidden(
          relationshipDisplayMode,
          isHighlighted,
          hasActiveCompany,
          lockedInvestmentCompanyIds.length > 0
        )
        return {
          ...edge,
          hidden,
          data: {
            ...edge.data,
            isHighlighted: hasActiveCompany && isHighlighted,
            isDimmed: hasActiveCompany && !isHighlighted,
            isLocked: lockedInvestmentCompanyIds.length > 0,
            showPercentageLabel
          }
        }
      }),
    [activeInvestmentCompanyIds, edgeViewMode, lockedInvestmentCompanyIds.length, relationshipDisplayMode, renderEdges]
  )

  return { displayedEdges, displayedNodes }
}
