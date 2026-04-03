import React, { useState, useEffect, useMemo } from 'react'
import type { Component } from '@/common/data/resources/types/component.types'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import type { ActionAssignmentDTO } from '@/common/data/resources/types/assignment.types'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import type { ResourceClient } from '@/common/network/resources/ResourceClient'
import {
  getScreenKeyCategory,
  screenKeyToResourceUrlFilterPath,
  parseUserTaskScreenKey
} from '../../utils/componentKeyUtils'
import { buildMenuEntryPathsForUrl, type HubWithMenuItems } from './menuPathUtils'

interface ComponentResourcesProps {
  component: Component
  allActions: ActionDTO[]
  allAssignments: ActionAssignmentDTO[]
  resourceClient: ResourceClient
}

const assignmentByFlowIdMap = (assignments: ActionAssignmentDTO[]): Map<string, ActionAssignmentDTO> => {
  const map = new Map<string, ActionAssignmentDTO>()
  for (const a of assignments) {
    for (const entry of a.assignments ?? []) {
      if (entry.flowItem?.id) map.set(entry.flowItem.id, a)
    }
  }
  return map
}

export const ComponentResources: React.FC<ComponentResourcesProps> = ({
  component,
  allActions,
  allAssignments,
  resourceClient
}) => {
  const screenKey = component.screenKey ?? ''
  const category = getScreenKeyCategory(screenKey)
  const assignmentByFlowId = useMemo(() => assignmentByFlowIdMap(allAssignments), [allAssignments])

  if (!screenKey) return <span className="gba:text-muted-foreground gba:text-xs">No screen key</span>

  if (category === 'screen' && screenKey.startsWith('url_')) {
    return <UrlResources screenKey={screenKey} resourceClient={resourceClient} />
  }

  if (category === 'action') {
    const matching = allActions.filter(
      a => a.targetDesktop?.trim() === screenKey || a.targetMobile?.trim() === screenKey
    )
    return (
      <div className="gba:text-sm">
        {matching.length === 0 ? (
          <p className="gba:text-muted-foreground">None</p>
        ) : (
          <ul className="gba:space-y-1.5">
            {matching.map(a => {
              const assignment = assignmentByFlowId.get(a.id)
              const contextName = assignment?.context?.contextName
              return (
                <li key={a.id} className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-foreground">
                    {a.flowName}
                    {contextName && (
                      <span className="gba:text-muted-foreground gba:text-xs gba:ml-1">({contextName})</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  if (category === 'task') {
    const parsed = parseUserTaskScreenKey(screenKey)
    if (parsed) {
      return (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:text-foreground">{parsed.processName}</span>
          <span className="gba:mx-1.5">/</span>
          <span className="gba:text-foreground">{parsed.userTaskName}</span>
        </div>
      )
    }
    return <span className="gba:text-muted-foreground gba:text-xs">User task (no parse)</span>
  }

  return <span className="gba:text-muted-foreground gba:text-xs">Unknown key type</span>
}

const normalizeUrlForCompare = (url: string): string => (url ?? '').trim().replace(/\/+$/, '') || '/'

function UrlResources({ screenKey, resourceClient }: { screenKey: string; resourceClient: ResourceClient }) {
  const [resourceUrls, setResourceUrls] = useState<NavigationDTO[]>([])
  const [hubs, setHubs] = useState<HubWithMenuItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const path = screenKeyToResourceUrlFilterPath(screenKey)

  useEffect(() => {
    if (!path) {
      setResourceUrls([])
      setHubs([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      resourceClient.navigation.getResourceUrlsByFilter(path),
      resourceClient.navigation.getHubsByFilter(path)
    ])
      .then(([urlRes, hubsRes]) => {
        if (cancelled) return
        setResourceUrls(urlRes.data ?? [])
        setHubs(hubsRes.data ?? [])
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path, resourceClient])

  const menuEntryPaths = useMemo(() => {
    if (!path) return []
    const normalizer = normalizeUrlForCompare
    return hubs.flatMap(hub => buildMenuEntryPathsForUrl(hub, path, normalizer))
  }, [hubs, path])

  const urlWithMenuPaths = useMemo(() => {
    return resourceUrls.map(nav => {
      const navId = nav.id
      const paths = menuEntryPaths
        .filter(m => (m.item.resourceUrl as { id?: string } | undefined)?.id === navId)
        .map(m => m.path)
      return { nav, menuPaths: paths }
    })
  }, [resourceUrls, menuEntryPaths])

  if (loading) return <span className="gba:text-muted-foreground gba:text-xs">Loading...</span>
  if (error) return <span className="gba:text-destructive gba:text-xs">{error}</span>

  if (urlWithMenuPaths.length === 0) {
    return <p className="gba:text-muted-foreground gba:text-sm">No resource URL for this screen.</p>
  }

  return (
    <ul className="gba:space-y-4 gba:list-none gba:m-0 gba:p-0">
      {urlWithMenuPaths.map(({ nav, menuPaths }) => (
        <li
          key={nav.id ?? nav.code}
          className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:overflow-hidden"
        >
          <div className="gba:px-3 gba:py-2.5">
            <p className="gba:font-medium gba:text-foreground gba:truncate">{nav.name ?? nav.code ?? '–'}</p>
            <p className="gba:font-mono gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-0.5">
              {nav.url ?? '–'}
            </p>
            {nav.code != null && nav.code !== '' && (
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">Code: {nav.code}</p>
            )}
            {menuPaths.length > 0 && (
              <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-border">
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">In menus</p>
                <ul className="gba:space-y-0.5">
                  {menuPaths.map(p => (
                    <li key={p}>
                      <code className="gba:text-xs gba:bg-background gba:px-1 gba:py-0.5 gba:rounded gba:break-all">
                        {p}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
