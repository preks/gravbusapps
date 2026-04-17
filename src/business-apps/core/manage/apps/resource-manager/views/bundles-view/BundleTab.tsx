import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { CaretRightIcon, CaretDownIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { Button, Skeleton } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Component } from '@/common/data/resources/types/component.types'
import { useAllComponentsInBatches } from '@/common/data/resources/hooks/useAllComponentsInBatches'
import { useAllActionsInBatches } from '@/common/data/resources/hooks/useAllActionsInBatches'
import { useAllAssignmentsInBatches } from '@/common/data/resources/hooks/useAllAssignmentsInBatches'
import { useAllContextsInBatches } from '@/common/data/resources/hooks/useAllContextsInBatches'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { getScreenKeyCategory, getScreenKeyComponentType } from '../../utils/componentKeyUtils'
import { ComponentResources } from './ComponentResources'

const NO_PATH_LABEL = '(no path)'

export interface BundleTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  onCountChange?: (count: number | undefined) => void
  onLoadingChange?: (loading: boolean) => void
  searchValue?: string
  sorting?: Array<{ id: string; desc: boolean }>
  filters?: Record<string, unknown>
  onNavigateTo?: (view: string, params?: { tab?: string; subview?: string }) => void
  onEditBundle?: (path: string, components: Component[]) => void
}

function getComponentPath(component: Component): string {
  const path = component.screenComponents?.formDefinition?.componentPath
  if (path === undefined || path === null) return NO_PATH_LABEL
  const trimmed = typeof path === 'string' ? path.trim() : ''
  return trimmed === '' ? NO_PATH_LABEL : trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
}

export const BundleTab: React.FC<BundleTabProps> = ({
  'data-testid': dataTestId = 'bundle-tab',
  onCountChange,
  onLoadingChange,
  searchValue = '',
  sorting = [],
  filters = {},
  onEditBundle,
  ...context
}) => {
  const [expandedPath, setExpandedPath] = useState<string | null>(null)

  const {
    components,
    isLoading: componentsLoading,
    error: componentsError,
    loadAll: loadAllComponents
  } = useAllComponentsInBatches(context)

  const { actions: allActions, isLoading: actionsLoading, loadAll: loadAllActions } = useAllActionsInBatches(context)

  const {
    assignments: allAssignments,
    isLoading: assignmentsLoading,
    loadAll: loadAllAssignments
  } = useAllAssignmentsInBatches(context)

  const { isLoading: contextsLoading, loadAll: loadAllContexts } = useAllContextsInBatches(context)

  const resourceClient = useResourceClient(context.accessToken)
  const usageDataLoadStartedRef = useRef(false)

  useEffect(() => {
    loadAllComponents()
  }, [loadAllComponents])

  useEffect(() => {
    if (expandedPath === null || usageDataLoadStartedRef.current) return
    usageDataLoadStartedRef.current = true
    loadAllActions()
    loadAllAssignments()
    loadAllContexts()
  }, [expandedPath, loadAllActions, loadAllAssignments, loadAllContexts])

  const isLoading = componentsLoading
  const usageDataLoading = expandedPath !== null && (actionsLoading || assignmentsLoading || contextsLoading)

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const bundlesByPath = useMemo(() => {
    const map = new Map<string, Component[]>()
    for (const component of components) {
      const path = getComponentPath(component)
      const list = map.get(path) ?? []
      list.push(component)
      map.set(path, list)
    }
    return map
  }, [components])

  const sortedBundles = useMemo(() => {
    return Array.from(bundlesByPath.entries())
      .map(([path, list]) => ({ path, components: list }))
      .filter(({ path }) => path !== NO_PATH_LABEL)
      .sort((a, b) => a.path.localeCompare(b.path))
  }, [bundlesByPath])

  const selectedBundleTypeIds = useMemo(() => {
    const raw = filters?.bundleTypes
    if (!Array.isArray(raw) || raw.length === 0) return null
    return new Set(raw as string[])
  }, [filters])

  const selectedComponentTypeIds = useMemo(() => {
    const raw = filters?.componentTypes
    if (!Array.isArray(raw) || raw.length === 0) return null
    return new Set(raw as string[])
  }, [filters])

  const filteredAndSortedBundles = useMemo(() => {
    let list = sortedBundles

    if (selectedBundleTypeIds && selectedBundleTypeIds.size > 0) {
      list = list.filter(({ components: bundleComponents }) =>
        bundleComponents.some(c => selectedBundleTypeIds.has(getScreenKeyCategory(c.screenKey ?? '') ?? ''))
      )
    }

    if (selectedComponentTypeIds && selectedComponentTypeIds.size > 0) {
      list = list.filter(({ components: bundleComponents }) =>
        bundleComponents.some(c => selectedComponentTypeIds.has(getScreenKeyComponentType(c.screenKey ?? '') ?? ''))
      )
    }

    const search = searchValue?.trim().toLowerCase()
    if (search) {
      list = list.filter(({ path, components: bundleComponents }) => {
        const uniqueNames = [...new Set(bundleComponents.map(c => c.name?.trim()).filter(Boolean))] as string[]
        const namesLabel = uniqueNames.length > 0 ? uniqueNames.join(' ') : ''
        const searchable = `${namesLabel} ${path}`.toLowerCase()
        return searchable.includes(search)
      })
    }

    const sort = sorting[0]
    if (sort) {
      list = [...list].sort((a, b) => {
        const uniqueNamesA = [...new Set(a.components.map(c => c.name?.trim()).filter(Boolean))] as string[]
        const namesA = uniqueNamesA.length > 0 ? uniqueNamesA.join(', ') : a.path
        const uniqueNamesB = [...new Set(b.components.map(c => c.name?.trim()).filter(Boolean))] as string[]
        const namesB = uniqueNamesB.length > 0 ? uniqueNamesB.join(', ') : b.path
        let cmp = 0
        if (sort.id === 'name') cmp = namesA.localeCompare(namesB)
        else if (sort.id === 'path') cmp = a.path.localeCompare(b.path)
        else if (sort.id === 'count') cmp = a.components.length - b.components.length
        return sort.desc ? -cmp : cmp
      })
    }

    return list
  }, [sortedBundles, selectedBundleTypeIds, selectedComponentTypeIds, searchValue, sorting])

  useEffect(() => {
    onCountChange?.(filteredAndSortedBundles.length)
  }, [filteredAndSortedBundles.length, onCountChange])

  const toggleExpand = useCallback((path: string) => {
    setExpandedPath(prev => (prev === path ? null : path))
  }, [])

  if (componentsError) {
    return (
      <div className="gba:p-4" data-testid={dataTestId}>
        <p className="gba:text-destructive">{componentsError}</p>
      </div>
    )
  }

  return (
    <div className="gba:p-4 gba:space-y-1" data-testid={dataTestId}>
      {isLoading && sortedBundles.length === 0 ? (
        <div className="gba:border gba:rounded-lg gba:divide-y gba:divide-border gba:overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="gba:px-4 gba:py-3">
              <Skeleton className="gba:h-4 gba:w-full gba:max-w-md" />
            </div>
          ))}
        </div>
      ) : filteredAndSortedBundles.length === 0 ? (
        <p className="gba:text-muted-foreground gba:text-sm">
          {sortedBundles.length === 0 ? 'No bundles found.' : 'No bundles match the current search or filter.'}
        </p>
      ) : (
        <ul className="gba:divide-y gba:divide-border gba:border gba:rounded-lg gba:overflow-hidden">
          {filteredAndSortedBundles.map(({ path, components: bundleComponents }) => {
            const isExpanded = expandedPath === path
            const uniqueNames = [...new Set(bundleComponents.map(c => c.name?.trim()).filter(Boolean))] as string[]
            const namesLabel = uniqueNames.length > 0 ? uniqueNames.join(', ') : path

            return (
              <li key={path} className="gba:bg-background">
                <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(path)}
                    className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0 gba:text-left gba:hover:bg-muted/50 gba:transition-colors gba:py-1 gba:-my-1 gba:px-1 gba:-mx-1 gba:rounded"
                    data-testid={`${dataTestId}-bundle-row-${path.replace(/\//g, '-')}`}
                  >
                    {isExpanded ? (
                      <CaretDownIcon className="gba:h-4 gba:w-4 gba:shrink-0" weight="bold" />
                    ) : (
                      <CaretRightIcon className="gba:h-4 gba:w-4 gba:shrink-0" weight="bold" />
                    )}
                    <span className="gba:text-sm gba:truncate gba:flex-1">
                      {namesLabel}
                      <span className="gba:text-muted-foreground gba:font-normal"> ({path})</span>
                    </span>
                    <span className="gba:text-muted-foreground gba:text-sm gba:shrink-0">
                      {bundleComponents.length} component{bundleComponents.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  {onEditBundle && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        onEditBundle(path, bundleComponents)
                      }}
                      className="gba:shrink-0"
                      title="Edit bundle"
                      data-testid={`${dataTestId}-bundle-edit-${path.replace(/\//g, '-')}`}
                    >
                      <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isExpanded && (
                  <div className="gba:px-6 gba:pb-5 gba:pt-4 gba:border-t gba:border-border gba:bg-muted/20">
                    {usageDataLoading ? (
                      <p className="gba:text-muted-foreground gba:text-sm">Loading resources...</p>
                    ) : (
                      <div className="gba:space-y-4">
                        <section>
                          <h3 className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground gba:mb-3">
                            Component definitions
                          </h3>
                          <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-4">
                            {bundleComponents.map(comp => (
                              <div
                                key={comp.id ?? comp.screenKey}
                                className="gba:flex-[1_1_16rem] gba:min-w-0 gba:rounded-md gba:border gba:border-border gba:bg-background gba:shadow-sm"
                              >
                                <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border">
                                  <div className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-4 gba:gap-y-1">
                                    <span className="gba:font-medium gba:text-foreground">{comp.name ?? '–'}</span>
                                    <code className="gba:text-xs gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                                      {comp.screenKey}
                                    </code>
                                    {comp.type && (
                                      <span className="gba:text-xs gba:text-muted-foreground">{comp.type}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="gba:px-4 gba:py-3">
                                  <ComponentResources
                                    component={comp}
                                    allActions={allActions}
                                    allAssignments={allAssignments}
                                    resourceClient={resourceClient}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
