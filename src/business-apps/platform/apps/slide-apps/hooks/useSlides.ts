/**
 * useSlides Hook
 *
 * Manages slide deck CRUD using the document-service backend API.
 * Follows the same pattern as useDocumentApps.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { SlidesApiService } from '../services/SlidesApiService'
import type { Slide, SlideSummary } from '../types'

interface UseSlidesState {
  slides: SlideSummary[]
  currentSlide: Slide | null
  isLoading: boolean
  error: string | null
}

interface UseSlidesResult extends UseSlidesState {
  loadSlide: (id: string) => Promise<Slide | null>
  createSlide: (payload: { title: string; description?: string }) => Promise<Slide | null>
  updateSlide: (
    id: string,
    updates: Partial<Pick<Slide, 'title' | 'description' | 'content'>>,
    options?: { createVersion?: boolean }
  ) => Promise<Slide | null>
  deleteSlide: (id: string) => Promise<boolean>
  duplicateSlide: (id: string) => Promise<Slide | null>
  shareSlide: (slideId: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
  clearCurrentSlide: () => void
  refreshSlides: () => Promise<void>
}

export function useSlides(accessToken: string | undefined): UseSlidesResult {
  const [state, setState] = useState<UseSlidesState>({
    slides: [],
    currentSlide: null,
    isLoading: true,
    error: null
  })

  const refreshSlides = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }))
      return
    }
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const items = await SlidesApiService.listSlides({ includeShared: true })
      setState(prev => ({ ...prev, slides: items, isLoading: false }))
    } catch (err) {
      console.error('[useSlides] Failed to load slides:', err)
      setState(prev => ({
        ...prev,
        slides: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load slides'
      }))
    }
  }, [accessToken])

  useEffect(() => {
    refreshSlides()
  }, [refreshSlides])

  const loadSlide = useCallback(
    async (id: string): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const slide = await SlidesApiService.getSlide(id)
        if (slide) setState(prev => ({ ...prev, currentSlide: slide }))
        return slide
      } catch (err) {
        console.error('[useSlides] loadSlide:', err)
        toast.error('Failed to load presentation')
        return null
      }
    },
    [accessToken]
  )

  const createSlide = useCallback(
    async (payload: { title: string; description?: string }): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const created = await SlidesApiService.createSlide({
          title: payload.title || 'Untitled presentation',
          description: payload.description
        })
        await refreshSlides()
        toast.success('Presentation created')
        return created
      } catch (err) {
        console.error('[useSlides] createSlide:', err)
        toast.error('Failed to create presentation')
        return null
      }
    },
    [accessToken, refreshSlides]
  )

  const updateSlide = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Slide, 'title' | 'description' | 'content'>>,
      options?: { createVersion?: boolean }
    ): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const updated = await SlidesApiService.updateSlide(id, updates, options)
        setState(prev => (prev.currentSlide?.id === id ? { ...prev, currentSlide: updated } : prev))
        await refreshSlides()
        return updated
      } catch (err) {
        console.error('[useSlides] updateSlide:', err)
        toast.error('Failed to save')
        return null
      }
    },
    [accessToken, refreshSlides]
  )

  const deleteSlide = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false
      try {
        const ok = await SlidesApiService.deleteSlide(id)
        if (ok) {
          setState(prev => ({
            ...prev,
            slides: prev.slides.filter(s => s.id !== id),
            currentSlide: prev.currentSlide?.id === id ? null : prev.currentSlide
          }))
          toast.success('Presentation deleted')
        }
        return ok
      } catch (err) {
        console.error('[useSlides] deleteSlide:', err)
        toast.error('Failed to delete')
        return false
      }
    },
    [accessToken]
  )

  const duplicateSlide = useCallback(
    async (id: string): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const duplicated = await SlidesApiService.duplicateSlide(id)
        if (duplicated) await refreshSlides()
        toast.success('Presentation duplicated')
        return duplicated
      } catch (err) {
        console.error('[useSlides] duplicateSlide:', err)
        toast.error('Failed to duplicate')
        return null
      }
    },
    [accessToken, refreshSlides]
  )

  const clearCurrentSlide = useCallback(() => {
    setState(prev => ({ ...prev, currentSlide: null }))
  }, [])

  const shareSlide = useCallback(
    async (slideId: string, userIds: string[], permission: 'view' | 'edit' | 'comment'): Promise<boolean> => {
      if (!accessToken) return false
      try {
        const shares = userIds.map(userId => ({ userId, permission }))
        const result = await SlidesApiService.shareSlide(slideId, shares)
        if (result) {
          await refreshSlides()
        }
        return result
      } catch (err) {
        console.error('[useSlides] shareSlide:', err)
        return false
      }
    },
    [accessToken, refreshSlides]
  )

  return {
    ...state,
    loadSlide,
    createSlide,
    updateSlide,
    deleteSlide,
    duplicateSlide,
    shareSlide,
    clearCurrentSlide,
    refreshSlides
  }
}
