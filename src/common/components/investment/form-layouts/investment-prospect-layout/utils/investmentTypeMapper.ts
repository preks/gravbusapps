import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

/**
 * Maps group/type to single leaf InvestmentType ID
 * Returns the deepest (leaf) type ID from the hierarchy
 */
export const mapToSingleInvestmentTypeId = (
  groupId: string | null,
  typeId: string | null,
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
): string | null => {
  // Priority: typeId > groupId
  const leafTypeId = typeId || groupId
  if (!leafTypeId) return null

  // Verify it's actually a leaf (no children)
  const path = getPathByType(leafTypeId)
  const leafType = path.find(t => t.id === leafTypeId)
  if (!leafType) return null

  // Check if it has children - if yes, it's not a leaf
  const hasChildren = path.some(t => t.parentEntryId === leafTypeId)
  if (hasChildren) {
    // Find the deepest child
    const children = path.filter(t => t.parentEntryId === leafTypeId)
    if (children.length > 0) {
      // Recursively find the deepest child
      let deepest = children[0]
      for (const child of children) {
        const childPath = getPathByType(child.id)
        const childHasChildren = childPath.some(t => t.parentEntryId === child.id)
        if (childHasChildren) {
          // This child has children, find its deepest
          const childChildren = childPath.filter(t => t.parentEntryId === child.id)
          if (childChildren.length > 0) {
            deepest = childChildren[childChildren.length - 1] // Take last as deepest
          }
        } else {
          deepest = child
        }
      }
      return deepest.id
    }
  }

  return leafTypeId
}

/**
 * Maps single leaf InvestmentType ID back to group/type structure
 * Extracts the hierarchy from the path
 */
export const mapFromSingleInvestmentTypeId = (
  investmentTypeId: string | null,
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
): {
  groupId: string | null
  typeId: string | null
} => {
  if (!investmentTypeId) {
    return {
      groupId: null,
      typeId: null
    }
  }

  const path = getPathByType(investmentTypeId)
  if (path.length === 0) {
    return {
      groupId: null,
      typeId: null
    }
  }

  // Find root (level 0)
  const rootType = path.find(t => t.level === 0)
  const groupId = rootType?.id || null

  // Find level 1 type
  const level1Type = path.find(t => t.level === 1)
  const typeId = level1Type?.id || null

  return {
    groupId,
    typeId
  }
}
