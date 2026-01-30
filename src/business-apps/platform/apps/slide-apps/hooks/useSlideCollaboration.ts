/**
 * useSlideCollaboration Hook
 *
 * Manages real-time collaboration for slides using Yjs CRDT.
 * Handles:
 * - Yjs document initialization
 * - SocketIoYjsProvider setup with entityType: 'slide'
 * - Awareness state for cursor/presence tracking
 * - Converting between SlideData[] and Yjs types
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { useCollaboration } from '../../shared/hooks/useCollaboration'
import { SocketIoYjsProvider } from '../../shared/services/SocketIoYjsProvider'
import type { SlideParticipant } from '../../shared/services/CollaborationClient'
import type { SlideData, AnySlideElement } from '../components/slideElements'

export interface UseSlideCollaborationOptions {
  slideId: string
  accessToken: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
  enabled: boolean
  initialSlides?: SlideData[]
  initialThemeId?: string
  onLocalDocumentChange?: () => void
  onSynced?: (synced: boolean) => void
  onError?: (error: Error) => void
}

export interface UseSlideCollaborationReturn {
  slides: SlideData[]
  themeId: string
  participants: SlideParticipant[]
  isSynced: boolean
  isInitialized: boolean
  awareness: Awareness
  updateSlides: (slides: SlideData[]) => void
  updateTheme: (themeId: string) => void
  updateSlide: (index: number, updates: Partial<SlideData>) => void
  updateElement: (slideIndex: number, elementId: string, updates: Partial<AnySlideElement>) => void
  addSlide: (slide: SlideData, position?: number) => void
  removeSlide: (index: number) => void
}

/**
 * Convert SlideData array to Yjs Y.Array
 */
function slidesToYjs(slides: SlideData[], ySlides: Y.Array<Y.Map<any>>) {
  ySlides.delete(0, ySlides.length)

  slides.forEach(slide => {
    const ySlide = new Y.Map()
    ySlide.set('id', slide.id)
    ySlide.set('notes', slide.notes || '')

    // Convert background
    const yBackground = new Y.Map()
    yBackground.set('type', slide.background.type)
    if (slide.background.color) yBackground.set('color', slide.background.color)
    if (slide.background.gradient) yBackground.set('gradient', slide.background.gradient)
    if (slide.background.imageUrl) yBackground.set('imageUrl', slide.background.imageUrl)
    if (slide.background.videoUrl) yBackground.set('videoUrl', slide.background.videoUrl)
    if (slide.background.videoMuted !== undefined) yBackground.set('videoMuted', slide.background.videoMuted)
    if (slide.background.videoLoop !== undefined) yBackground.set('videoLoop', slide.background.videoLoop)
    ySlide.set('background', yBackground)

    // Convert elements
    const yElements = new Y.Array()
    slide.elements.forEach(element => {
      const yElement = new Y.Map()
      // Store entire element as JSON (simpler for complex nested structures)
      Object.entries(element).forEach(([key, value]) => {
        yElement.set(key, value)
      })
      yElements.push([yElement])
    })
    ySlide.set('elements', yElements)

    ySlides.push([ySlide])
  })
}

/**
 * Convert Yjs Y.Array to SlideData array
 */
function yjsToSlides(ySlides: Y.Array<Y.Map<any>>): SlideData[] {
  const slides: SlideData[] = []

  ySlides.forEach(ySlide => {
    const slide: SlideData = {
      id: ySlide.get('id') || `slide-${Date.now()}`,
      notes: ySlide.get('notes') || '',
      background: { type: 'solid', color: '#ffffff' },
      elements: []
    }

    // Parse background
    const yBackground = ySlide.get('background') as Y.Map<any> | undefined
    if (yBackground) {
      slide.background = {
        type: yBackground.get('type') || 'solid',
        color: yBackground.get('color'),
        gradient: yBackground.get('gradient'),
        imageUrl: yBackground.get('imageUrl'),
        videoUrl: yBackground.get('videoUrl'),
        videoMuted: yBackground.get('videoMuted'),
        videoLoop: yBackground.get('videoLoop')
      }
    }

    // Parse elements
    const yElements = ySlide.get('elements') as Y.Array<Y.Map<any>> | undefined
    if (yElements) {
      yElements.forEach(yElement => {
        const element: any = {}
        yElement.forEach((value, key) => {
          element[key] = value
        })
        slide.elements.push(element as AnySlideElement)
      })
    }

    slides.push(slide)
  })

  return slides
}

/**
 * Hook for slide collaboration
 */
export function useSlideCollaboration(options: UseSlideCollaborationOptions): UseSlideCollaborationReturn {
  const {
    slideId,
    accessToken,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    enabled,
    initialSlides,
    initialThemeId,
    onLocalDocumentChange,
    onSynced,
    onError
  } = options

  // IMPORTANT: `useCollaboration` has an effect that depends on `onError`.
  // If we pass a new function every render, it will reconnect every render and can cause
  // "Maximum update depth exceeded" loops. Keep this callback stable.
  const defaultOnError = useCallback((err: Error) => {
    console.error('[useSlideCollaboration] Error:', err)
  }, [])
  const onErrorRef = useRef<typeof onError>(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])
  const handleError = useCallback(
    (err: Error) => {
      const fn = onErrorRef.current || defaultOnError
      fn(err)
    },
    [defaultOnError]
  )

  // Yjs document and awareness
  const ydoc = useMemo(() => new Y.Doc(), [slideId])
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc])

  // Local state (initialize with initial data if provided)
  const [slides, setSlides] = useState<SlideData[]>(initialSlides || [])
  const [themeId, setThemeId] = useState(initialThemeId || 'corporate')
  const [isSynced, setIsSynced] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const providerRef = useRef<SocketIoYjsProvider | null>(null)
  const isBootstrappingRef = useRef(false)
  const didDedupeRef = useRef(false)

  // Store initial data in refs to avoid recreating provider
  const initialSlidesRef = useRef(initialSlides)
  const initialThemeIdRef = useRef(initialThemeId)
  const onLocalDocumentChangeRef = useRef(onLocalDocumentChange)

  useEffect(() => {
    onLocalDocumentChangeRef.current = onLocalDocumentChange
  }, [onLocalDocumentChange])

  // Keep initial data refs up to date. They may arrive after first render.
  useEffect(() => {
    initialSlidesRef.current = initialSlides
  }, [initialSlides])
  useEffect(() => {
    initialThemeIdRef.current = initialThemeId
  }, [initialThemeId])

  // Get Yjs arrays
  const ySlides = useMemo(() => ydoc.getArray<Y.Map<any>>('slides'), [ydoc])
  const yMeta = useMemo(() => ydoc.getMap('meta'), [ydoc])

  // IMPORTANT:
  // Do NOT pre-seed the Yjs document from REST content before the first sync.
  // If the server already has a Yjs state, pre-seeding causes divergent docs and duplicates on merge
  // (e.g. two slides with id `slide-1`), which breaks real-time syncing between clients.

  // Collaboration hook
  const { participants, socket: collaborationSocket } = useCollaboration({
    entityType: 'slide',
    entityId: slideId,
    enabled: enabled && !!slideId,
    accessToken,
    onError: handleError
  })

  // Initialize Yjs provider
  useEffect(() => {
    if (!enabled || !slideId || !collaborationSocket) return

    const provider = new SocketIoYjsProvider({
      socket: collaborationSocket,
      documentId: slideId,
      entityType: 'slide',
      ydoc,
      awareness,
      onSyncedChange: synced => {
        setIsSynced(synced)
        if (synced) setIsInitialized(true)
        onSynced?.(synced)
      },
      onBootstrapRequired: async () => {
        // Bootstrap initializer: server asks us to provide the initial Yjs state.
        if (isBootstrappingRef.current) return
        isBootstrappingRef.current = true

        try {
          // Seed from REST-loaded slide content (best effort).
          const slideData = initialSlidesRef.current || []
          const theme = initialThemeIdRef.current || 'corporate'

          // Wait briefly for Yjs to be ready
          await new Promise(resolve => setTimeout(resolve, 50))

          // Initialize Yjs structures (only if empty to avoid duplicating existing server state)
          if (ySlides.length === 0) {
            Y.transact(ydoc, () => {
              slidesToYjs(slideData, ySlides)
              yMeta.set('themeId', theme)
            })
          }

          // Update local state
          setSlides(slideData)
          setThemeId(theme)
          setIsInitialized(true)
        } catch (err) {
          console.error('[useSlideCollaboration] Bootstrap error:', err)
        } finally {
          isBootstrappingRef.current = false
        }
      },
      onLocalDocumentChange: () => {
        // Only signal for LOCAL changes; caller decides what to do (e.g. snapshot save).
        onLocalDocumentChangeRef.current?.()
      }
    })

    providerRef.current = provider
    provider.start()

    return () => {
      provider.destroy()
      providerRef.current = null
      setIsSynced(false)
    }
  }, [enabled, slideId, collaborationSocket, ydoc, awareness, ySlides, yMeta, onSynced])

  // One-time de-duplication safeguard after sync.
  // If earlier builds created duplicate slide IDs (e.g. `slide-1` twice), remove extras
  // to prevent React key collisions and reduce cross-client divergence.
  useEffect(() => {
    if (!enabled || !slideId) return
    if (!isSynced) return
    if (didDedupeRef.current) return
    if (ySlides.length <= 1) {
      didDedupeRef.current = true
      return
    }

    const seen = new Set<string>()
    let removed = 0

    // iterate backwards so delete indexes stay valid
    for (let i = ySlides.length - 1; i >= 0; i--) {
      const ySlide = ySlides.get(i)
      const id = (ySlide?.get('id') as string | undefined) || ''
      if (!id) continue
      if (seen.has(id)) {
        ySlides.delete(i, 1)
        removed++
      } else {
        seen.add(id)
      }
    }

    didDedupeRef.current = true
    if (removed > 0) {
      console.warn('[useSlideCollaboration] Deduped duplicate slide ids:', removed)
    }
  }, [enabled, slideId, isSynced, ySlides])

  // Set awareness state for current user
  useEffect(() => {
    if (!enabled || !slideId || !currentUserId || !isSynced) return

    const userColor = participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4'

    awareness.setLocalStateField('user', {
      id: currentUserId,
      userId: currentUserId,
      name: currentUserName || 'User',
      color: userColor,
      avatar: currentUserAvatar
    })
  }, [enabled, slideId, awareness, currentUserId, currentUserName, currentUserAvatar, participants, isSynced])

  // Listen to Yjs changes and update local state (local + remote).
  // IMPORTANT: slide edits are nested (slides[] -> slideMap -> elements[] -> elementMap).
  // `observe()` on the top-level array does NOT fire for deep changes, so we must use `observeDeep()`.
  useEffect(() => {
    if (!enabled) return

    const handleSlidesChange = () => {
      const newSlides = yjsToSlides(ySlides)
      // Only update if slides actually changed (compare stringified versions to avoid unnecessary updates)
      setSlides(prevSlides => {
        const prevJson = JSON.stringify(prevSlides)
        const newJson = JSON.stringify(newSlides)
        return prevJson !== newJson ? newSlides : prevSlides
      })
    }

    const handleMetaChange = () => {
      const theme = yMeta.get('themeId') as string | undefined
      if (theme) {
        setThemeId(prevTheme => (prevTheme !== theme ? theme : prevTheme))
      }
    }

    ySlides.observeDeep(handleSlidesChange)
    yMeta.observe(handleMetaChange)

    // Initial sync (only once when effect mounts)
    handleSlidesChange()
    handleMetaChange()

    return () => {
      ySlides.unobserveDeep(handleSlidesChange)
      yMeta.unobserve(handleMetaChange)
    }
  }, [enabled, ySlides, yMeta])

  // Update functions
  const updateSlides = useCallback(
    (newSlides: SlideData[]) => {
      slidesToYjs(newSlides, ySlides)
    },
    [ySlides]
  )

  const updateTheme = useCallback(
    (newThemeId: string) => {
      yMeta.set('themeId', newThemeId)
    },
    [yMeta]
  )

  const updateSlide = useCallback(
    (index: number, updates: Partial<SlideData>) => {
      if (index < 0 || index >= ySlides.length) return

      const ySlide = ySlides.get(index)
      if (!ySlide) return

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'background' && value) {
          const yBackground = new Y.Map()
          Object.entries(value).forEach(([bgKey, bgValue]) => {
            if (bgValue !== undefined) yBackground.set(bgKey, bgValue)
          })
          ySlide.set('background', yBackground)
        } else if (key === 'elements' && Array.isArray(value)) {
          const yElements = new Y.Array()
          value.forEach(element => {
            const yElement = new Y.Map()
            Object.entries(element).forEach(([elKey, elValue]) => {
              yElement.set(elKey, elValue)
            })
            yElements.push([yElement])
          })
          ySlide.set('elements', yElements)
        } else if (value !== undefined) {
          ySlide.set(key, value)
        }
      })
    },
    [ySlides]
  )

  const updateElement = useCallback(
    (slideIndex: number, elementId: string, updates: Partial<AnySlideElement>) => {
      if (slideIndex < 0 || slideIndex >= ySlides.length) return

      const ySlide = ySlides.get(slideIndex)
      if (!ySlide) return

      const yElements = ySlide.get('elements') as Y.Array<Y.Map<any>> | undefined
      if (!yElements) return

      // Find the element
      for (let i = 0; i < yElements.length; i++) {
        const yElement = yElements.get(i)
        if (yElement.get('id') === elementId) {
          // Update the element
          Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) yElement.set(key, value)
          })
          break
        }
      }
    },
    [ySlides]
  )

  const addSlide = useCallback(
    (slide: SlideData, position?: number) => {
      const ySlide = new Y.Map()
      ySlide.set('id', slide.id)
      ySlide.set('notes', slide.notes || '')

      const yBackground = new Y.Map()
      Object.entries(slide.background).forEach(([key, value]) => {
        if (value !== undefined) yBackground.set(key, value)
      })
      ySlide.set('background', yBackground)

      const yElements = new Y.Array()
      slide.elements.forEach(element => {
        const yElement = new Y.Map()
        Object.entries(element).forEach(([key, value]) => {
          yElement.set(key, value)
        })
        yElements.push([yElement])
      })
      ySlide.set('elements', yElements)

      if (position !== undefined && position >= 0 && position <= ySlides.length) {
        ySlides.insert(position, [ySlide])
      } else {
        ySlides.push([ySlide])
      }
    },
    [ySlides]
  )

  const removeSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= ySlides.length) return
      ySlides.delete(index, 1)
    },
    [ySlides]
  )

  return {
    slides,
    themeId,
    participants,
    isSynced,
    isInitialized,
    awareness,
    updateSlides,
    updateTheme,
    updateSlide,
    updateElement,
    addSlide,
    removeSlide
  }
}
