/**
 * SpacesRouter - Main entry point for the Spaces module
 *
 * Handles routing between SpacesHub (list) and SpaceDetail (single space)
 * Following the same pattern as document-apps (useDocumentAppsHubUrlState)
 */

import React, { useState, useEffect, useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
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
 * 1. Props (passed by the platform from URL params)
 * 2. URL query parameters (read directly)
 * 3. Updated via pushState (listened via popstate event)
 */
export const SpacesRouter: React.FC<SpacesRouterProps> = props => {
  const { 'data-testid': testId = 'spaces', spaceId: propsSpaceId, ...contextProps } = props

  // Track spaceId - check props first, then URL
  const [spaceId, setSpaceId] = useState<string | null>(() => {
    if (propsSpaceId) return propsSpaceId
    return getSpaceIdFromUrl()
  })

  // Update spaceId when URL changes (via popstate from pushState)
  const handlePopState = useCallback(() => {
    const fromUrl = getSpaceIdFromUrl()
    console.log('[SpacesRouter] popstate event - spaceId from URL:', fromUrl)
    setSpaceId(fromUrl)
  }, [])

  // Listen for popstate events (triggered by pushState in SpacesHub)
  useEffect(() => {
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  // Also check URL on mount and when props change
  useEffect(() => {
    const fromProps = propsSpaceId
    const fromUrl = getSpaceIdFromUrl()
    const newSpaceId = fromProps || fromUrl || null

    console.log('[SpacesRouter] Checking spaceId - props:', fromProps, 'URL:', fromUrl, 'Final:', newSpaceId)
    setSpaceId(newSpaceId)
  }, [propsSpaceId])

  console.log('[SpacesRouter] Current spaceId:', spaceId, '- Rendering:', spaceId ? 'SpaceDetail' : 'SpacesHub')

  // If spaceId is present, show the detail view
  if (spaceId) {
    return <SpaceDetail {...contextProps} spaceId={spaceId} data-testid={`${testId}-detail`} />
  }

  // Otherwise show the hub (list view)
  return <SpacesHub {...contextProps} data-testid={`${testId}-hub`} />
}

export default SpacesRouter
