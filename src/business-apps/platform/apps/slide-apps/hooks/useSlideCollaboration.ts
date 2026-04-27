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
import type { DocumentParticipant } from '../../shared/services/CollaborationClient'
import type { SlideData, AnySlideElement } from '../components/slideElements'
import type { SlideMaster } from '../types/slideMaster'

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
  masters: SlideMaster[] | undefined
  participants: DocumentParticipant[]
  isSynced: boolean
  isInitialized: boolean
  awareness: Awareness
  updateSlides: (slides: SlideData[]) => void
  updateTheme: (themeId: string) => void
  updateMasters: (masters: SlideMaster[]) => void
  updateSlide: (index: number, updates: Partial<SlideData>) => void
  updateElement: (slideIndex: number, elementId: string, updates: Partial<AnySlideElement>) => void
  addSlide: (slide: SlideData, position?: number) => void
  removeSlide: (index: number) => void
  updateSlideById: (slideId: string, updates: Partial<SlideData>) => void
  updateElementBySlideId: (slideId: string, elementId: string, updates: Partial<AnySlideElement>) => void
  addSlideAfterId: (afterSlideId: string | null, slide: SlideData) => void
  removeSlideById: (slideId: string) => void
  moveSlideById: (slideId: string, toIndex: number) => void
  duplicateSlideById: (slideId: string, duplicateSlide: SlideData) => void
  removeElementById: (slideId: string, elementId: string) => void
  flushPendingUpdates: () => void
  applyContentJsonSnapshot: (contentJson: Record<string, unknown>) => void
}

/**
 * Convert SlideData array to Yjs Y.Array
 */
function slidesToYjs(slides: SlideData[], ySlides: Y.Array<Y.Map<any>>) {
  ySlides.delete(0, ySlides.length)

  slides.forEach(slide => {
    ySlides.push([createYSlide(slide)])
  })
}

function createYSlide(slide: SlideData): Y.Map<any> {
  const ySlide = new Y.Map()
  ySlide.set('id', slide.id)
  ySlide.set('notes', slide.notes || '')
  ySlide.set('background', createYBackground(slide.background))
  ySlide.set('elements', createYElements(slide.elements))

  if (slide.transition) {
    ySlide.set('transition', createYTransition(slide.transition))
  }

  return ySlide
}

function createYBackground(background: SlideData['background']): Y.Map<any> {
  const yBackground = new Y.Map()
  yBackground.set('type', background.type)
  if (background.color) yBackground.set('color', background.color)
  if (background.gradient) yBackground.set('gradient', background.gradient)
  if (background.imageUrl) yBackground.set('imageUrl', background.imageUrl)
  if (background.videoUrl) yBackground.set('videoUrl', background.videoUrl)
  if (background.videoMuted !== undefined) yBackground.set('videoMuted', background.videoMuted)
  if (background.videoLoop !== undefined) yBackground.set('videoLoop', background.videoLoop)
  return yBackground
}

function createYElements(elements: AnySlideElement[]): Y.Array<Y.Map<any>> {
  const yElements = new Y.Array<Y.Map<any>>()
  elements.forEach(element => {
    yElements.push([createYElement(element)])
  })
  return yElements
}

function createYElement(element: AnySlideElement): Y.Map<any> {
  const yElement = new Y.Map()
  Object.entries(element).forEach(([key, value]) => {
    yElement.set(key, value)
  })
  return yElement
}

function createYTransition(transition: NonNullable<SlideData['transition']>): Y.Map<any> {
  const yTransition = new Y.Map()
  yTransition.set('type', transition.type)
  yTransition.set('duration', transition.duration)
  yTransition.set('trigger', transition.trigger)
  yTransition.set('delay', transition.delay)
  return yTransition
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function setYMapJson(yMap: Y.Map<any>, nextValues: Record<string, unknown>) {
  const nextKeys = new Set(Object.keys(nextValues))

  yMap.forEach((_value, key) => {
    if (!nextKeys.has(key)) {
      yMap.delete(key)
    }
  })

  Object.entries(nextValues).forEach(([key, value]) => {
    if (value === undefined) {
      yMap.delete(key)
      return
    }
    if (!jsonEqual(yMap.get(key), value)) {
      yMap.set(key, value)
    }
  })
}

function backgroundToJson(background: SlideData['background']): Record<string, unknown> {
  return {
    type: background.type,
    color: background.color,
    gradient: background.gradient,
    imageUrl: background.imageUrl,
    videoUrl: background.videoUrl,
    videoMuted: background.videoMuted,
    videoLoop: background.videoLoop
  }
}

function transitionToJson(transition: NonNullable<SlideData['transition']>): Record<string, unknown> {
  return {
    type: transition.type,
    duration: transition.duration,
    trigger: transition.trigger,
    delay: transition.delay
  }
}

function hasSameSlideOrder(slides: SlideData[], ySlides: Y.Array<Y.Map<any>>): boolean {
  if (slides.length !== ySlides.length) return false

  for (let index = 0; index < slides.length; index++) {
    if (ySlides.get(index).get('id') !== slides[index].id) {
      return false
    }
  }

  return true
}

function hasSameElementOrder(elements: AnySlideElement[], yElements: Y.Array<Y.Map<any>>): boolean {
  if (elements.length !== yElements.length) return false

  for (let index = 0; index < elements.length; index++) {
    if (yElements.get(index).get('id') !== elements[index].id) {
      return false
    }
  }

  return true
}

function updateYSlideInPlace(ySlide: Y.Map<any>, slide: SlideData) {
  if (ySlide.get('id') !== slide.id) ySlide.set('id', slide.id)
  if (ySlide.get('notes') !== (slide.notes || '')) ySlide.set('notes', slide.notes || '')

  const yBackground = ySlide.get('background')
  if (yBackground instanceof Y.Map) {
    setYMapJson(yBackground, backgroundToJson(slide.background))
  } else {
    ySlide.set('background', createYBackground(slide.background))
  }

  const yElements = ySlide.get('elements')
  if (yElements instanceof Y.Array && hasSameElementOrder(slide.elements, yElements)) {
    slide.elements.forEach((element, index) => {
      setYMapJson(yElements.get(index), element as unknown as Record<string, unknown>)
    })
  } else {
    ySlide.set('elements', createYElements(slide.elements))
  }

  const yTransition = ySlide.get('transition')
  if (slide.transition) {
    if (yTransition instanceof Y.Map) {
      setYMapJson(yTransition, transitionToJson(slide.transition))
    } else {
      ySlide.set('transition', createYTransition(slide.transition))
    }
  } else if (yTransition !== undefined) {
    ySlide.delete('transition')
  }
}

function reconcileSlidesToYjs(slides: SlideData[], ySlides: Y.Array<Y.Map<any>>) {
  if (!hasSameSlideOrder(slides, ySlides)) {
    slidesToYjs(slides, ySlides)
    return
  }

  slides.forEach((slide, index) => {
    updateYSlideInPlace(ySlides.get(index), slide)
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

    // Parse transition (handle both Y.Map and plain object formats for backward compatibility)
    const yTransition = ySlide.get('transition')
    if (yTransition) {
      if (yTransition instanceof Y.Map) {
        slide.transition = {
          type: yTransition.get('type') || 'none',
          duration: yTransition.get('duration') || 500,
          trigger: yTransition.get('trigger') || 'on-click',
          delay: yTransition.get('delay') || 0
        }
      } else if (typeof yTransition === 'object') {
        slide.transition = {
          type: yTransition.type || 'none',
          duration: yTransition.duration || 500,
          trigger: yTransition.trigger || 'on-click',
          delay: yTransition.delay || 0
        }
      }
    }

    slides.push(slide)
  })

  return slides
}

function findSlideIndexById(ySlides: Y.Array<Y.Map<any>>, slideId: string): number {
  for (let i = 0; i < ySlides.length; i++) {
    if (ySlides.get(i).get('id') === slideId) return i
  }
  return -1
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
  const [masters, setMastersState] = useState<SlideMaster[] | undefined>(undefined)
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
      // Don't reset to empty — the Yjs doc starts empty before sync/bootstrap.
      // Overwriting with [] would lose the REST-loaded initial slides.
      if (newSlides.length === 0) return
      setSlides(prevSlides => {
        const prevJson = JSON.stringify(prevSlides)
        const newJson = JSON.stringify(newSlides)
        if (prevSlides.length !== newSlides.length) {
          console.info('[useSlideCollaboration] Slide count changed from Yjs:', {
            slideId,
            previousCount: prevSlides.length,
            nextCount: newSlides.length,
            nextSlideIds: newSlides.map(slide => slide.id)
          })
        }
        return prevJson !== newJson ? newSlides : prevSlides
      })
    }

    const handleMetaChange = () => {
      const theme = yMeta.get('themeId') as string | undefined
      if (theme) {
        setThemeId(prevTheme => (prevTheme !== theme ? theme : prevTheme))
      }
      const mastersJson = yMeta.get('masters') as SlideMaster[] | undefined
      if (mastersJson) {
        setMastersState(prev => {
          const prevStr = JSON.stringify(prev)
          const newStr = JSON.stringify(mastersJson)
          return prevStr !== newStr ? mastersJson : prev
        })
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
      Y.transact(ydoc, () => {
        reconcileSlidesToYjs(newSlides, ySlides)
      })
    },
    [ydoc, ySlides]
  )

  const updateTheme = useCallback(
    (newThemeId: string) => {
      yMeta.set('themeId', newThemeId)
    },
    [yMeta]
  )

  const updateMasters = useCallback(
    (newMasters: SlideMaster[]) => {
      yMeta.set('masters', newMasters)
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
        } else if (key === 'transition' && value) {
          const yTransition = new Y.Map()
          Object.entries(value).forEach(([trKey, trValue]) => {
            if (trValue !== undefined) yTransition.set(trKey, trValue)
          })
          ySlide.set('transition', yTransition)
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
            if (value === undefined) {
              yElement.delete(key)
            } else {
              yElement.set(key, value)
            }
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

  const updateSlideById = useCallback(
    (slideId: string, updates: Partial<SlideData>) => {
      const index = findSlideIndexById(ySlides, slideId)
      if (index < 0) return
      updateSlide(index, updates)
    },
    [updateSlide, ySlides]
  )

  const updateElementBySlideId = useCallback(
    (slideId: string, elementId: string, updates: Partial<AnySlideElement>) => {
      const index = findSlideIndexById(ySlides, slideId)
      if (index < 0) return
      updateElement(index, elementId, updates)
    },
    [updateElement, ySlides]
  )

  const addSlideAfterId = useCallback(
    (afterSlideId: string | null, slide: SlideData) => {
      const index = afterSlideId ? findSlideIndexById(ySlides, afterSlideId) : -1
      addSlide(slide, index >= 0 ? index + 1 : ySlides.length)
    },
    [addSlide, ySlides]
  )

  const removeSlideById = useCallback(
    (slideId: string) => {
      const index = findSlideIndexById(ySlides, slideId)
      if (index < 0) return
      ySlides.delete(index, 1)
    },
    [ySlides]
  )

  const moveSlideById = useCallback(
    (slideId: string, toIndex: number) => {
      const fromIndex = findSlideIndexById(ySlides, slideId)
      if (fromIndex < 0 || toIndex < 0 || toIndex >= ySlides.length || fromIndex === toIndex) return

      const slide = yjsToSlides(ySlides)[fromIndex]
      if (!slide) return

      ySlides.delete(fromIndex, 1)
      addSlide(slide, toIndex)
    },
    [addSlide, ySlides]
  )

  const duplicateSlideById = useCallback(
    (slideId: string, duplicateSlide: SlideData) => {
      const index = findSlideIndexById(ySlides, slideId)
      addSlide(duplicateSlide, index >= 0 ? index + 1 : ySlides.length)
    },
    [addSlide, ySlides]
  )

  const removeElementById = useCallback(
    (slideId: string, elementId: string) => {
      const slideIndex = findSlideIndexById(ySlides, slideId)
      if (slideIndex < 0) return
      const ySlide = ySlides.get(slideIndex)
      const yElements = ySlide.get('elements') as Y.Array<Y.Map<any>> | undefined
      if (!yElements) return

      for (let i = 0; i < yElements.length; i++) {
        if (yElements.get(i).get('id') === elementId) {
          yElements.delete(i, 1)
          return
        }
      }
    },
    [ySlides]
  )

  const applyContentJsonSnapshot = useCallback(
    (contentJson: Record<string, unknown>) => {
      const snapshotSlides = (contentJson.slides as SlideData[] | undefined) || []
      const snapshotThemeId = (contentJson.themeId as string | undefined) || 'corporate'
      const snapshotMasters = contentJson.masters as SlideMaster[] | undefined

      Y.transact(ydoc, () => {
        slidesToYjs(snapshotSlides, ySlides)
        yMeta.set('themeId', snapshotThemeId)
        if (snapshotMasters) {
          yMeta.set('masters', snapshotMasters)
        }
      })
    },
    [ydoc, ySlides, yMeta]
  )

  useEffect(() => {
    if (!collaborationSocket) return
    const handleSlideContentReset = (event: {
      documentId: string
      entityType?: 'slide'
      contentJson?: Record<string, unknown>
    }) => {
      if (event.documentId !== slideId || event.entityType !== 'slide' || !event.contentJson) return
      applyContentJsonSnapshot(event.contentJson)
    }

    collaborationSocket.on('slide_content_reset', handleSlideContentReset)
    return () => {
      collaborationSocket.off('slide_content_reset', handleSlideContentReset)
    }
  }, [applyContentJsonSnapshot, collaborationSocket, slideId])

  const flushPendingUpdates = useCallback(() => {
    providerRef.current?.flushPendingLocalUpdates()
  }, [])

  return {
    slides,
    themeId,
    masters,
    participants,
    isSynced,
    isInitialized,
    awareness,
    updateSlides,
    updateTheme,
    updateMasters,
    updateSlide,
    updateElement,
    addSlide,
    removeSlide,
    updateSlideById,
    updateElementBySlideId,
    addSlideAfterId,
    removeSlideById,
    moveSlideById,
    duplicateSlideById,
    removeElementById,
    flushPendingUpdates,
    applyContentJsonSnapshot
  }
}
