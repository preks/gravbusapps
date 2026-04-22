/**
 * useSlides Hook
 *
 * Manages slide deck CRUD using the document-service backend API.
 * Follows the same pattern as useDocumentApps.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import { SlidesApiService } from '../services/SlidesApiService'
import type { Slide, SlideSummary } from '../types'
import translations from '../_i18n'

interface UseSlidesState {
  slides: SlideSummary[]
  currentSlide: Slide | null
  isLoading: boolean
  error: string | null
}

export interface ImportSlideResult {
  slide: Slide
  contentSaved: boolean
}

interface UseSlidesResult extends UseSlidesState {
  loadSlide: (id: string) => Promise<Slide | null>
  loadTrashedSlide: (id: string) => Promise<Slide | null>
  createSlide: (payload: {
    title: string
    description?: string
    contentJson?: Record<string, unknown>
  }) => Promise<Slide | null>
  importSlide: (payload: { title: string; contentJson: Record<string, unknown> }) => Promise<ImportSlideResult | null>
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
  const { t } = useTranslation(translations)
  const [state, setState] = useState<UseSlidesState>({
    slides: [],
    currentSlide: null,
    isLoading: true,
    error: null
  })

  // Keep the API service's in-memory token in sync with the prop
  useEffect(() => {
    SlidesApiService.setAccessToken(accessToken || null)
  }, [accessToken])

  const refreshSlides = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, isLoading: false, error: t('slides-error-not-authenticated') }))
      return
    }
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const PAGE_SIZE = 100
      let allSlides: Awaited<ReturnType<typeof SlidesApiService.listSlides>> = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const pageItems = await SlidesApiService.listSlides({ includeShared: true, limit: PAGE_SIZE, page })
        allSlides = [...allSlides, ...pageItems]
        hasMore = pageItems.length === PAGE_SIZE
        page++
      }

      setState(prev => ({ ...prev, slides: allSlides, isLoading: false }))
    } catch (err) {
      console.error('[useSlides] Failed to load slides:', err)
      setState(prev => ({
        ...prev,
        slides: [],
        isLoading: false,
        error: err instanceof Error ? err.message : t('slides-error-load-failed')
      }))
    }
  }, [accessToken, t])

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
        toast.error(t('slides-toast-load-failed'))
        return null
      }
    },
    [accessToken, t]
  )

  const loadTrashedSlide = useCallback(
    async (id: string): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const slide = await SlidesApiService.getTrashedPreview(id)
        const resolvedSlide = slide ?? (await SlidesApiService.getSlide(id))
        if (resolvedSlide) {
          setState(prev => ({ ...prev, currentSlide: resolvedSlide }))
        }
        return resolvedSlide
      } catch (err) {
        console.error('[useSlides] loadTrashedSlide:', err)
        toast.error(t('slides-toast-load-failed'))
        return null
      }
    },
    [accessToken, t]
  )

  const createSlide = useCallback(
    async (payload: {
      title: string
      description?: string
      contentJson?: Record<string, unknown>
    }): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const created = await SlidesApiService.createSlide({
          title: payload.title || t('slides-default-title'),
          description: payload.description,
          contentJson: payload.contentJson
        })
        await refreshSlides()
        toast.success(t('slides-toast-created'))
        return created
      } catch (err) {
        console.error('[useSlides] createSlide:', err)
        toast.error(t('slides-toast-create-failed'))
        return null
      }
    },
    [accessToken, refreshSlides, t]
  )

  const importSlide = useCallback(
    async (payload: { title: string; contentJson: Record<string, unknown> }): Promise<ImportSlideResult | null> => {
      if (!accessToken) return null
      try {
        const created = await SlidesApiService.createSlide({
          title: payload.title || t('slides-default-title')
        })
        await refreshSlides()

        let contentSaved = false
        let finalSlide = created
        try {
          finalSlide = await SlidesApiService.updateSlide(created.id, {
            contentJson: payload.contentJson
          })
          contentSaved = true
        } catch (err) {
          console.error('[useSlides] importSlide content update failed:', err)
        }

        // Set currentSlide immediately so the editor gets correct contentJson
        // without depending on a separate GET that might return stale data
        setState(prev => ({ ...prev, currentSlide: finalSlide }))

        return { slide: finalSlide, contentSaved }
      } catch (err) {
        console.error('[useSlides] importSlide create failed:', err)
        toast.error(t('slides-toast-create-failed'))
        return null
      }
    },
    [accessToken, refreshSlides, t]
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
        toast.error(t('slides-toast-save-failed'))
        return null
      }
    },
    [accessToken, refreshSlides, t]
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
          toast.success(t('slides-toast-moved-to-trash') || t('slides-toast-deleted'))
        }
        return ok
      } catch (err) {
        console.error('[useSlides] deleteSlide:', err)
        toast.error(t('slides-toast-delete-failed'))
        return false
      }
    },
    [accessToken, t]
  )

  const duplicateSlide = useCallback(
    async (id: string): Promise<Slide | null> => {
      if (!accessToken) return null
      try {
        const duplicated = await SlidesApiService.duplicateSlide(id)
        if (duplicated) await refreshSlides()
        toast.success(t('slides-toast-duplicated'))
        return duplicated
      } catch (err) {
        console.error('[useSlides] duplicateSlide:', err)
        toast.error(t('slides-toast-duplicate-failed'))
        return null
      }
    },
    [accessToken, refreshSlides, t]
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
    loadTrashedSlide,
    createSlide,
    importSlide,
    updateSlide,
    deleteSlide,
    duplicateSlide,
    shareSlide,
    clearCurrentSlide,
    refreshSlides
  }
}
