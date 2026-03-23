// Slide spell check hook wrapping useDocumentReview for presentation-wide checking.

import { useState, useCallback, useRef, useMemo } from 'react'
import { useDocumentReview } from '@/business-apps/ai/apps/document-reviewer/hooks/useDocumentReview'
import type { SlideData, TextElement } from '../components/slideElements'
import type { SlideAnnotation, UseSlideSpellCheckOptions, UseSlideSpellCheckReturn } from '../types/slideSpellCheck'
import { checkTextWithBrowser } from '../utils/browserSpellCheck'

const IGNORED_WORDS_KEY = 'slide-spell-check-ignored-words'
const USE_BROWSER_FALLBACK_KEY = 'slide-spell-check-use-browser-fallback'

function loadIgnoredWords(): Set<string> {
  try {
    const stored = localStorage.getItem(IGNORED_WORDS_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return new Set(data.words || [])
    }
  } catch {
    // Ignore parse errors
  }
  return new Set()
}

function saveIgnoredWords(words: Set<string>): void {
  try {
    localStorage.setItem(
      IGNORED_WORDS_KEY,
      JSON.stringify({ words: Array.from(words), updatedAt: new Date().toISOString() })
    )
  } catch {
    // Ignore storage errors
  }
}

export function useSlideSpellCheck(slides: SlideData[], options: UseSlideSpellCheckOptions): UseSlideSpellCheckReturn {
  const { accessToken, onAnnotationsReady, onCheckComplete } = options

  const [annotations, setAnnotations] = useState<SlideAnnotation[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [ignoredWords] = useState(() => loadIgnoredWords())
  const [useBrowserFallback, setUseBrowserFallback] = useState(() => {
    try {
      return localStorage.getItem(USE_BROWSER_FALLBACK_KEY) === 'true'
    } catch {
      return false
    }
  })

  const annotationsRef = useRef<SlideAnnotation[]>([])
  annotationsRef.current = annotations

  const documentReview = useDocumentReview({ accessToken })

  const annotationsBySlide = useMemo(() => {
    const map = new Map<string, SlideAnnotation[]>()
    for (const ann of annotations) {
      if (!ann.resolved) {
        const existing = map.get(ann.slideId) || []
        existing.push(ann)
        map.set(ann.slideId, existing)
      }
    }
    return map
  }, [annotations])

  const totalIssues = useMemo(() => {
    return annotations.filter(a => !a.resolved).length
  }, [annotations])

  const selectedAnnotation = useMemo(() => {
    if (!selectedAnnotationId) return null
    return annotations.find(a => a.id === selectedAnnotationId) || null
  }, [annotations, selectedAnnotationId])

  const checkElement = useCallback(
    async (slideId: string, elementId: string, content: string): Promise<SlideAnnotation[]> => {
      if (!content.trim()) return []

      const response = await documentReview.reviewDocument({
        documentId: elementId,
        contentType: 'custom',
        content,
        config: {
          reviewType: 'grammar',
          focusCategories: ['spelling', 'grammar', 'punctuation']
        }
      })

      if (!response.success) {
        if (response.error) {
          throw new Error(response.error)
        }
        return []
      }

      const slideAnnotations: SlideAnnotation[] = response.annotations
        .filter(ann => !ignoredWords.has(ann.originalText.toLowerCase()))
        .map(ann => ({
          ...ann,
          slideId,
          elementId
        }))

      return slideAnnotations
    },
    [documentReview, ignoredWords]
  )

  const checkSlide = useCallback(
    async (slideId: string): Promise<SlideAnnotation[]> => {
      const slide = slides.find(s => s.id === slideId)
      if (!slide) return []

      const textElements = slide.elements.filter((e): e is TextElement => e.type === 'text')
      const allAnnotations: SlideAnnotation[] = []

      for (const element of textElements) {
        const elementAnnotations = await checkElement(slideId, element.id, element.content)
        allAnnotations.push(...elementAnnotations)
      }

      return allAnnotations
    },
    [slides, checkElement]
  )

  const checkAllSlidesWithBrowser = useCallback((): SlideAnnotation[] => {
    const allAnnotations: SlideAnnotation[] = []

    for (const slide of slides) {
      const textElements = slide.elements.filter((e): e is TextElement => e.type === 'text')

      for (const element of textElements) {
        if (!element.content.trim()) continue

        const result = checkTextWithBrowser(element.content, slide.id, element.id)
        const filtered = result.annotations.filter(ann => !ignoredWords.has(ann.originalText.toLowerCase()))
        allAnnotations.push(...filtered)
      }
    }

    return allAnnotations
  }, [slides, ignoredWords])

  const checkAllSlides = useCallback(async (): Promise<SlideAnnotation[]> => {
    setIsChecking(true)
    setError(null)

    if (useBrowserFallback) {
      const browserAnnotations = checkAllSlidesWithBrowser()
      setAnnotations(browserAnnotations)
      setLastCheckedAt(new Date().toISOString())
      onAnnotationsReady?.(browserAnnotations)
      onCheckComplete?.(browserAnnotations.length)
      setIsChecking(false)
      return browserAnnotations
    }

    const allAnnotations: SlideAnnotation[] = []
    let hasError = false

    try {
      for (const slide of slides) {
        const textElements = slide.elements.filter((e): e is TextElement => e.type === 'text')

        for (const element of textElements) {
          try {
            const elementAnnotations = await checkElement(slide.id, element.id, element.content)
            allAnnotations.push(...elementAnnotations)
          } catch (elementErr) {
            hasError = true
            console.error('[useSlideSpellCheck] Element check error:', elementErr)
            console.error('[useSlideSpellCheck] Element check failed:', element.id, err)
            break
          }
        }

        if (hasError) break
      }

      if (hasError) {
        console.log('[useSlideSpellCheck] AI check failed, using browser fallback')
        setUseBrowserFallback(true)
        try {
          localStorage.setItem(USE_BROWSER_FALLBACK_KEY, 'true')
        } catch {
          // Ignore storage errors
        }

        const browserAnnotations = checkAllSlidesWithBrowser()
        setAnnotations(browserAnnotations)
        setLastCheckedAt(new Date().toISOString())
        onAnnotationsReady?.(browserAnnotations)
        onCheckComplete?.(browserAnnotations.length)

        return browserAnnotations
      }

      setAnnotations(allAnnotations)
      setLastCheckedAt(new Date().toISOString())
      onAnnotationsReady?.(allAnnotations)
      onCheckComplete?.(allAnnotations.length)

      return allAnnotations
    } catch {
      console.log('[useSlideSpellCheck] AI check failed, using browser fallback')
      setUseBrowserFallback(true)
      try {
        localStorage.setItem(USE_BROWSER_FALLBACK_KEY, 'true')
      } catch {
        // Ignore storage errors
      }

      const browserAnnotations = checkAllSlidesWithBrowser()
      setAnnotations(browserAnnotations)
      setLastCheckedAt(new Date().toISOString())
      onAnnotationsReady?.(browserAnnotations)
      onCheckComplete?.(browserAnnotations.length)

      return browserAnnotations
    } finally {
      setIsChecking(false)
    }
  }, [slides, checkElement, useBrowserFallback, checkAllSlidesWithBrowser, onAnnotationsReady, onCheckComplete])

  const selectAnnotation = useCallback((annotationId: string | null) => {
    setSelectedAnnotationId(annotationId)
  }, [])

  const resolveAnnotation = useCallback((annotationId: string) => {
    setAnnotations(prev => prev.map(ann => (ann.id === annotationId ? { ...ann, resolved: true } : ann)))
  }, [])

  const acceptSuggestion = useCallback(
    (annotation: SlideAnnotation): string | null => {
      if (!annotation.suggestion) return null

      const slide = slides.find(s => s.id === annotation.slideId)
      if (!slide) return null

      const element = slide.elements.find(e => e.id === annotation.elementId) as TextElement | undefined
      if (!element) return null

      const content = element.content
      const newContent =
        content.slice(0, annotation.startOffset) + annotation.suggestion + content.slice(annotation.endOffset)

      resolveAnnotation(annotation.id)

      return newContent
    },
    [slides, resolveAnnotation]
  )

  const clearAnnotations = useCallback(() => {
    setAnnotations([])
    setSelectedAnnotationId(null)
    setError(null)
  }, [])

  const clearAnnotationsForElement = useCallback((elementId: string) => {
    setAnnotations(prev => prev.filter(ann => ann.elementId !== elementId))
  }, [])

  const getAnnotationsForElement = useCallback((elementId: string): SlideAnnotation[] => {
    return annotationsRef.current.filter(ann => ann.elementId === elementId && !ann.resolved)
  }, [])

  const getAnnotationsForSlide = useCallback((slideId: string): SlideAnnotation[] => {
    return annotationsRef.current.filter(ann => ann.slideId === slideId && !ann.resolved)
  }, [])

  const hasAnnotationsAt = useCallback((elementId: string, offset: number): boolean => {
    return annotationsRef.current.some(
      ann => ann.elementId === elementId && !ann.resolved && offset >= ann.startOffset && offset <= ann.endOffset
    )
  }, [])

  const getAnnotationsInRange = useCallback((elementId: string, start: number, end: number): SlideAnnotation[] => {
    return annotationsRef.current.filter(
      ann => ann.elementId === elementId && !ann.resolved && ann.startOffset < end && ann.endOffset > start
    )
  }, [])

  const ignoreWord = useCallback(
    (word: string) => {
      const lower = word.toLowerCase()
      ignoredWords.add(lower)
      saveIgnoredWords(ignoredWords)

      setAnnotations(prev =>
        prev.map(ann => (ann.originalText.toLowerCase() === lower ? { ...ann, resolved: true } : ann))
      )
    },
    [ignoredWords]
  )

  const ignoreAnnotation = useCallback(
    (annotationId: string) => {
      resolveAnnotation(annotationId)
    },
    [resolveAnnotation]
  )

  const resetToAIMode = useCallback(() => {
    setUseBrowserFallback(false)
    try {
      localStorage.removeItem(USE_BROWSER_FALLBACK_KEY)
    } catch {
      // Ignore storage errors
    }
  }, [])

  return {
    annotations,
    annotationsBySlide,
    isChecking,
    error,
    totalIssues,
    lastCheckedAt,
    selectedAnnotation,
    useBrowserFallback,
    checkAllSlides,
    checkSlide,
    checkElement,
    selectAnnotation,
    resolveAnnotation,
    acceptSuggestion,
    clearAnnotations,
    clearAnnotationsForElement,
    getAnnotationsForElement,
    getAnnotationsForSlide,
    hasAnnotationsAt,
    getAnnotationsInRange,
    ignoreWord,
    ignoreAnnotation,
    resetToAIMode
  }
}

export default useSlideSpellCheck
