import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InvestmentCompanyGraphNode, InvestmentCompanyOwnershipEdge } from '../types/companyGroupGraphTypes'

interface UseInvestmentCompanyGraphLocksArgs {
  nodes: InvestmentCompanyGraphNode[]
  edges: InvestmentCompanyOwnershipEdge[]
  searchHighlightedInvestmentCompanyId?: string
  onCenterNode: (node: InvestmentCompanyGraphNode) => void
}

export function useInvestmentCompanyGraphLocks({
  nodes,
  edges,
  searchHighlightedInvestmentCompanyId,
  onCenterNode
}: UseInvestmentCompanyGraphLocksArgs) {
  const [hoveredInvestmentCompanyId, setHoveredInvestmentCompanyId] = useState<string | undefined>()
  const [lockedInvestmentCompanyIds, setLockedInvestmentCompanyIds] = useState<string[]>([])
  const lockedInvestmentCompanyIdSet = useMemo(() => new Set(lockedInvestmentCompanyIds), [lockedInvestmentCompanyIds])

  const activeInvestmentCompanyIds = useMemo(() => {
    const activeIds = new Set(lockedInvestmentCompanyIds)
    if (hoveredInvestmentCompanyId) activeIds.add(hoveredInvestmentCompanyId)
    if (searchHighlightedInvestmentCompanyId) activeIds.add(searchHighlightedInvestmentCompanyId)
    return activeIds
  }, [hoveredInvestmentCompanyId, lockedInvestmentCompanyIds, searchHighlightedInvestmentCompanyId])

  useEffect(() => {
    const availableNodeIds = new Set(nodes.map(node => node.id))
    setLockedInvestmentCompanyIds(currentIds => {
      const validIds = currentIds.filter(id => availableNodeIds.has(id))
      return validIds.length === currentIds.length ? currentIds : validIds
    })
  }, [nodes])

  const handleHoverCompany = useCallback((investmentCompanyId?: string) => {
    setHoveredInvestmentCompanyId(investmentCompanyId)
  }, [])

  const handleLockCompany = useCallback(
    (investmentCompanyId: string) => {
      const node = nodes.find(currentNode => currentNode.id === investmentCompanyId)
      setLockedInvestmentCompanyIds(currentIds =>
        currentIds.includes(investmentCompanyId) ? currentIds : [...currentIds, investmentCompanyId]
      )
      if (node) onCenterNode(node)
    },
    [nodes, onCenterNode]
  )

  const handleUnlockCompany = useCallback((investmentCompanyId: string) => {
    setLockedInvestmentCompanyIds(currentIds => currentIds.filter(currentId => currentId !== investmentCompanyId))
  }, [])

  const handleUnlockAllCompanies = useCallback(() => {
    setLockedInvestmentCompanyIds([])
  }, [])

  const clearLockInteractionState = useCallback(() => {
    setLockedInvestmentCompanyIds([])
    setHoveredInvestmentCompanyId(undefined)
  }, [])

  const lockedInvestmentCompanies = useMemo(
    () => lockedInvestmentCompanyIds.flatMap(id => nodes.find(node => node.id === id) || []),
    [lockedInvestmentCompanyIds, nodes]
  )

  const highlightedInvestmentCompanyIds = useMemo(() => {
    if (activeInvestmentCompanyIds.size === 0) return new Set<string>()

    return edges.reduce((highlightedIds, edge) => {
      if (activeInvestmentCompanyIds.has(edge.source) || activeInvestmentCompanyIds.has(edge.target)) {
        highlightedIds.add(edge.source)
        highlightedIds.add(edge.target)
      }
      return highlightedIds
    }, new Set<string>(activeInvestmentCompanyIds))
  }, [activeInvestmentCompanyIds, edges])

  return {
    activeInvestmentCompanyIds,
    clearLockInteractionState,
    handleHoverCompany,
    handleLockCompany,
    handleUnlockAllCompanies,
    handleUnlockCompany,
    highlightedInvestmentCompanyIds,
    lockedInvestmentCompanies,
    lockedInvestmentCompanyIds,
    lockedInvestmentCompanyIdSet
  }
}
