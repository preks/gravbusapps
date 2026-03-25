/**
 * SpacesRouter - Main entry point for the Spaces module
 *
 * Handles routing between SpacesHub (list) and SpaceDetail (single space)
 * Following the same pattern as document-apps (useDocumentAppsHubUrlState)
 */

import React, { useState, useEffect, useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { SpacesHub } from './SpacesHub'
import { SpaceDetail } from './SpaceDetail'

export interface SpacesRouterProps extends BusinessAppContextProps {
  /** Space ID - can be passed as prop from platform or read from URL */
  spaceId?: string
  'data-testid'?: string
}

/**
 * Get spaceId from URL query params
 */
function getSpaceIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('spaceId')
}

/**
 * SpacesRouter renders either SpacesHub or SpaceDetail based on spaceId
 *
 * The spaceId can come from:
 * 1. Props (passed by the platform from URL params) - used only for initial state
 * 2. URL query parameters (read directly) - used for initial state
 * 3. pushState in SpacesHub + popstate - for in-app navigation hub <-> detail
 *
 * We do NOT sync from props/URL in an effect after first paint, so the detail view
 * never unmounts/remounts (avoids "loads then reloads again").
 */
export const SpacesRouter: React.FC<SpacesRouterProps> = props => {
  const { 'data-testid': testId = 'spaces', spaceId: propsSpaceId, ...contextProps } = props

  // Initial state only; further updates only from popstate or onNavigateToHub
  const [spaceId, setSpaceId] = useState<string | null>(() => {
    if (propsSpaceId) return propsSpaceId
    return getSpaceIdFromUrl()
  })

  const handlePopState = useCallback(() => {
    setSpaceId(getSpaceIdFromUrl())
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  const handleNavigateToHub = useCallback(() => {
    setSpaceId(null)
    navigateTo(buildPlatformUrl('/platform/every-office/spaces'))
  }, [])

  // If spaceId is present, show the detail view
  if (spaceId) {
    return (
      <SpaceDetail
        {...contextProps}
        spaceId={spaceId}
        onNavigateToHub={handleNavigateToHub}
        data-testid={`${testId}-detail`}
      />
    )
  }

  // Otherwise show the hub (list view)
  return (
    <SpacesHub {...contextProps} onOpenSpace={nextSpaceId => setSpaceId(nextSpaceId)} data-testid={`${testId}-hub`} />
  )
}

export default SpacesRouter
