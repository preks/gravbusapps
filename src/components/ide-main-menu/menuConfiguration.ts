import React from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'

export interface MenuConfigurationNode {
  icon?: string | null
  menuLabel?: string | null
  searchLabel?: string | null
  searchKeywords?: string[]
  searchTags?: string[]
  children?: Record<string, MenuConfigurationNode>
}

export interface MenuConfiguration {
  version: number
  defaults?: Omit<MenuConfigurationNode, 'children'>
  nodes?: Record<string, MenuConfigurationNode>
}

export type ResolvedMenuConfigurationNode = Omit<MenuConfigurationNode, 'children'>

type MenuConfigurationMap = Record<string, MenuConfigurationNode>

const joinPath = (basePath: string, keySegment: string): string => {
  if (!basePath) {
    return keySegment
  }

  return `${basePath}/${keySegment}`
}

const flattenConfigurationTree = (
  nodes: Record<string, MenuConfigurationNode>,
  parentPath = '',
  flatMap: MenuConfigurationMap = {}
): MenuConfigurationMap => {
  Object.entries(nodes).forEach(([nodeKey, nodeValue]) => {
    const normalizedNodeKey = nodeKey.trim()
    const fullPath = normalizedNodeKey.includes('/') ? normalizedNodeKey : joinPath(parentPath, normalizedNodeKey)

    flatMap[fullPath] = {
      icon: nodeValue.icon,
      menuLabel: nodeValue.menuLabel,
      searchLabel: nodeValue.searchLabel,
      searchKeywords: nodeValue.searchKeywords,
      searchTags: nodeValue.searchTags
    }

    if (nodeValue.children && Object.keys(nodeValue.children).length > 0) {
      flattenConfigurationTree(nodeValue.children, fullPath, flatMap)
    }
  })

  return flatMap
}

const mergeSearchMetadata = (
  defaultValues: Omit<MenuConfigurationNode, 'children'>,
  inheritedEntries: MenuConfigurationNode[],
  exactEntry: MenuConfigurationNode | null
): Pick<ResolvedMenuConfigurationNode, 'searchKeywords' | 'searchTags'> => {
  const mergedKeywords = new Set<string>()
  const mergedTags = new Set<string>()

  defaultValues.searchKeywords?.forEach(keyword => mergedKeywords.add(keyword))
  defaultValues.searchTags?.forEach(tag => mergedTags.add(tag))

  inheritedEntries.forEach(entry => {
    entry.searchKeywords?.forEach(keyword => mergedKeywords.add(keyword))
    entry.searchTags?.forEach(tag => mergedTags.add(tag))
  })

  exactEntry?.searchKeywords?.forEach(keyword => mergedKeywords.add(keyword))
  exactEntry?.searchTags?.forEach(tag => mergedTags.add(tag))

  return {
    searchKeywords: [...mergedKeywords],
    searchTags: [...mergedTags]
  }
}

const getMatchingNodePaths = (nodePath: string): string[] => {
  const nodeParts = nodePath.split('/').filter(Boolean)
  const matchingPaths: string[] = []

  for (let prefixLength = 1; prefixLength <= nodeParts.length; prefixLength += 1) {
    matchingPaths.push(nodeParts.slice(0, prefixLength).join('/'))
  }

  return matchingPaths
}

export const resolveNodeConfiguration = (
  menuConfiguration: MenuConfiguration | undefined,
  pathCandidates: string[]
): ResolvedMenuConfigurationNode => {
  const defaultValues = menuConfiguration?.defaults ?? {}
  const nodes = menuConfiguration?.nodes ?? {}
  const flatNodes = flattenConfigurationTree(nodes)
  const exactPathCandidate = pathCandidates.find(pathCandidate => Boolean(pathCandidate && flatNodes[pathCandidate]))
  const exactEntry = exactPathCandidate ? flatNodes[exactPathCandidate] : null
  const inheritedEntries: MenuConfigurationNode[] = []
  const seenPaths = new Set<string>()

  pathCandidates.forEach(pathCandidate => {
    if (!pathCandidate) {
      return
    }

    getMatchingNodePaths(pathCandidate).forEach(prefixPath => {
      if (prefixPath === exactPathCandidate || seenPaths.has(prefixPath) || !flatNodes[prefixPath]) {
        return
      }

      seenPaths.add(prefixPath)
      inheritedEntries.push(flatNodes[prefixPath])
    })
  })

  const mergedSearchMetadata = mergeSearchMetadata(defaultValues, inheritedEntries, exactEntry)

  return {
    icon: exactEntry?.icon ?? defaultValues.icon ?? null,
    menuLabel: exactEntry?.menuLabel ?? defaultValues.menuLabel ?? null,
    searchLabel: exactEntry?.searchLabel ?? defaultValues.searchLabel ?? null,
    searchKeywords: mergedSearchMetadata.searchKeywords,
    searchTags: mergedSearchMetadata.searchTags
  }
}

const isPhosphorIconComponent = (value: unknown): value is React.ElementType<IconProps> =>
  typeof value === 'function' || (typeof value === 'object' && value !== null)

export const renderConfiguredPhosphorIcon = (
  iconName: string | null | undefined,
  props: IconProps
): React.ReactNode | null => {
  if (!iconName) {
    return null
  }

  const dynamicIconKey = iconName.endsWith('Icon') ? iconName : `${iconName}Icon`
  const IconComponent = (PhosphorIcons as Record<string, unknown>)[dynamicIconKey]

  if (!isPhosphorIconComponent(IconComponent)) {
    return null
  }

  return React.createElement(IconComponent, props)
}

const sanitizeSearchValues = (values: string[] | undefined): string[] => {
  if (!values) {
    return []
  }

  return values.map(value => value.trim()).filter(value => value.length > 0)
}

export const buildSearchTokens = (...tokenGroups: Array<string | string[] | null | undefined>): string[] => {
  const tokens = new Set<string>()

  tokenGroups.forEach(tokenGroup => {
    if (!tokenGroup) {
      return
    }

    if (Array.isArray(tokenGroup)) {
      sanitizeSearchValues(tokenGroup).forEach(token => tokens.add(token.toLowerCase()))
      return
    }

    const normalizedToken = tokenGroup.trim().toLowerCase()
    if (normalizedToken.length > 0) {
      tokens.add(normalizedToken)
    }
  })

  return [...tokens]
}
