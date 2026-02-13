/**
 * Hook for call controls bar responsive layout (desktop vs mobile, more menu).
 */

import { useState, useEffect } from 'react'

const DESKTOP_BREAKPOINT = 1024

export interface UseCallControlsLayoutOptions {
  callType: 'audio' | 'video'
  onToggleBackground?: () => void
  onToggleRaiseHand?: () => void
  onSendReaction?: (emoji: string) => void
}

export function useCallControlsLayout(options: UseCallControlsLayoutOptions) {
  const { callType, onToggleBackground, onToggleRaiseHand, onSendReaction } = options
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : DESKTOP_BREAKPOINT)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const showDesktopLayout = windowWidth >= DESKTOP_BREAKPOINT
  const mobileMenuOptionCount = [onToggleBackground && callType === 'video', onToggleRaiseHand, onSendReaction].filter(
    Boolean
  ).length
  const showMoreMenu = !showDesktopLayout && mobileMenuOptionCount >= 2

  return { showDesktopLayout, showMoreMenu, mobileMenuOptionCount }
}
