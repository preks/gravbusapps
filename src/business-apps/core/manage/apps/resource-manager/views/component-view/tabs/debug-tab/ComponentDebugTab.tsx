import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CardGridSkeleton } from '../../../../components/CardGridSkeleton'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { useAzureData } from '../../../../contexts/ResourceManagerContext'
import type { Component } from '@/common/data/resources/types/component.types'
import { MissingComponentTable } from './missing-component-table'
import { NoPathTable } from './no-path-table'
import { EmptyComponentTable } from './empty-component-table'

const PAGE_SIZE = 100

const normalizePath = (p: string): string => (p ?? '').trim().replace(/^\//, '') || ''

export const DEBUG_VIEW_IDS = ['missing-in-cdn', 'missing-in-components', 'no-path'] as const
export type DebugViewId = (typeof DEBUG_VIEW_IDS)[number]

interface ComponentDebugTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  currentView?: DebugViewId
  onViewChange?: (view: string) => void
  onCountChange?: (count: number) => void
  onLoadingChange?: (loading: boolean) => void
  isActive?: boolean
}

/**
 * Debug tab with three subviews:
 * 1. missing-in-cdn: Components whose component path has no index in the CDN.
 * 2. missing-in-components: CDN paths that do not appear as component path in the Components list.
 * 3. no-path: Components without a component path (excluded from Bundles, shown here).
 */
export const ComponentDebugTab: React.FC<ComponentDebugTabProps> = ({
  'data-testid': dataTestId = 'component-debug-tab',
  currentView = 'missing-in-cdn',
  onCountChange,
  onLoadingChange,
  isActive = true,
  ...context
}) => {
  const resourceClient = useResourceClient(context.accessToken)
  const { devComponentPathVersions, prodComponentPathVersions, isLoadingAzure } = useAzureData()
  const [allComponents, setAllComponents] = useState<Component[]>([])
  const [isLoadingComponents, setIsLoadingComponents] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const cdnPathSet = useMemo(() => {
    const set = new Set<string>()
    devComponentPathVersions.forEach((_, path) => set.add(normalizePath(path)))
    prodComponentPathVersions.forEach((_, path) => set.add(normalizePath(path)))
    return set
  }, [devComponentPathVersions, prodComponentPathVersions])

  const fetchAllComponents = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      setIsLoadingComponents(false)
      return
    }

    setIsLoadingComponents(true)
    setError(null)
    onLoadingChange?.(true)

    try {
      const list: Component[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const page = await resourceClient.component.getComponents({
          limit: PAGE_SIZE,
          offset,
          returnTotalRecords: true
        })
        const data = page?.data || []
        list.push(...data)
        const total = page?.paging?.totalRecords ?? 0
        hasMore = offset + data.length < total
        offset += data.length
      }

      setAllComponents(list)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
      setError(errorMessage)
      setAllComponents([])
    } finally {
      setIsLoadingComponents(false)
      onLoadingChange?.(false)
    }
  }, [context.accessToken, resourceClient, onLoadingChange])

  useEffect(() => {
    if (isActive && !loadedRef.current && context.accessToken) {
      loadedRef.current = true
      fetchAllComponents()
    } else if (!isActive) {
      loadedRef.current = false
    }
  }, [isActive, context.accessToken, fetchAllComponents])

  const registeredPathSet = useMemo(() => {
    const set = new Set<string>()
    for (const c of allComponents) {
      const path = c.screenComponents?.formDefinition?.componentPath
      const normalized = normalizePath(path ?? '')
      if (normalized) set.add(normalized)
    }
    return set
  }, [allComponents])

  const componentsWithoutCdnIndex = useMemo(() => {
    return allComponents.filter(c => {
      const path = c.screenComponents?.formDefinition?.componentPath
      const normalized = normalizePath(path ?? '')
      return normalized && !cdnPathSet.has(normalized)
    })
  }, [allComponents, cdnPathSet])

  const componentsWithNoPath = useMemo(() => {
    return allComponents.filter(c => !normalizePath(c.screenComponents?.formDefinition?.componentPath ?? ''))
  }, [allComponents])

  const cdnPathsNotInComponents = useMemo(() => {
    const result: { path: string; inDev: boolean; inProd: boolean }[] = []
    const seen = new Set<string>()

    const add = (path: string, inDev: boolean, inProd: boolean) => {
      const normalized = normalizePath(path)
      if (!normalized || registeredPathSet.has(normalized) || seen.has(normalized)) return
      seen.add(normalized)
      result.push({ path: normalized, inDev, inProd })
    }

    devComponentPathVersions.forEach((_, path) => add(path, true, false))
    prodComponentPathVersions.forEach((_, path) => {
      const normalized = normalizePath(path)
      const existing = result.find(r => r.path === normalized)
      if (existing) existing.inProd = true
      else add(path, false, true)
    })

    return result.sort((a, b) => a.path.localeCompare(b.path))
  }, [registeredPathSet, devComponentPathVersions, prodComponentPathVersions])

  const currentCount =
    currentView === 'missing-in-cdn'
      ? componentsWithoutCdnIndex.length
      : currentView === 'no-path'
        ? componentsWithNoPath.length
        : cdnPathsNotInComponents.length

  useEffect(() => {
    onCountChange?.(currentCount)
  }, [currentCount, onCountChange])

  if (isLoadingComponents) {
    return <CardGridSkeleton />
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">{error}</p>
      </div>
    )
  }

  if (currentView === 'missing-in-cdn') {
    return (
      <MissingComponentTable
        components={componentsWithoutCdnIndex}
        dataTestIdPrefix={`${dataTestId}-missing-in-cdn`}
        loadingCdn={isLoadingAzure}
      />
    )
  }

  if (currentView === 'no-path') {
    return <NoPathTable components={componentsWithNoPath} dataTestIdPrefix={`${dataTestId}-no-path`} />
  }

  return (
    <EmptyComponentTable
      rows={cdnPathsNotInComponents}
      dataTestIdPrefix={`${dataTestId}-missing-in-components`}
      loadingCdn={isLoadingAzure}
    />
  )
}
