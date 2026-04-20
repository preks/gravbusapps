// Slide spell check types extending Document Reviewer annotations.

import type {
  DocumentAnnotation,
  AnnotationType,
  AnnotationSeverity,
  AnnotationCategory,
  DocumentReviewResponse
} from '@/business-apps/ai/apps/document-reviewer/types'

export type { AnnotationType, AnnotationSeverity, AnnotationCategory, DocumentAnnotation }

export interface SlideAnnotation extends DocumentAnnotation {
  slideId: string
  elementId: string
}

export interface SlideSpellCheckState {
  annotations: SlideAnnotation[]
  annotationsBySlide: Map<string, SlideAnnotation[]>
  annotationsByElement: Map<string, SlideAnnotation[]>
  isChecking: boolean
  lastCheckedAt: string | null
  totalIssues: number
  error: string | null
}

export interface SlideSpellCheckResult {
  success: boolean
  annotations: SlideAnnotation[]
  summary: string
  issuesCounts: DocumentReviewResponse['issuesCounts']
  processingTimeMs: number
  error?: string
}

export interface IgnoredWord {
  word: string
  addedAt: string
}

export interface IgnoredWordsStore {
  words: IgnoredWord[]
}

export interface SlideSpellCheckConfig {
  language?: string
  ignoredWords: string[]
  autoCheck: boolean
  showInlineUnderlines: boolean
}

export const DEFAULT_SPELL_CHECK_CONFIG: SlideSpellCheckConfig = {
  ignoredWords: [],
  autoCheck: false,
  showInlineUnderlines: true
}

export interface UseSlideSpellCheckOptions {
  accessToken: string
  onAnnotationsReady?: (annotations: SlideAnnotation[]) => void
  onCheckComplete?: (issueCount: number) => void
  onError?: (error: string) => void
}

export interface UseSlideSpellCheckReturn {
  annotations: SlideAnnotation[]
  annotationsBySlide: Map<string, SlideAnnotation[]>
  isChecking: boolean
  error: string | null
  totalIssues: number
  lastCheckedAt: string | null
  selectedAnnotation: SlideAnnotation | null
  useBrowserFallback: boolean
  checkAllSlides: () => Promise<SlideAnnotation[]>
  checkSlide: (slideId: string) => Promise<SlideAnnotation[]>
  checkElement: (slideId: string, elementId: string, content: string) => Promise<SlideAnnotation[]>
  selectAnnotation: (annotationId: string | null) => void
  resolveAnnotation: (annotationId: string) => void
  acceptSuggestion: (annotation: SlideAnnotation) => string | null
  clearAnnotations: () => void
  clearAnnotationsForElement: (elementId: string) => void
  getAnnotationsForElement: (elementId: string) => SlideAnnotation[]
  getAnnotationsForSlide: (slideId: string) => SlideAnnotation[]
  hasAnnotationsAt: (elementId: string, offset: number) => boolean
  getAnnotationsInRange: (elementId: string, start: number, end: number) => SlideAnnotation[]
  ignoreWord: (word: string) => void
  ignoreAnnotation: (annotationId: string) => void
  resetToAIMode: () => void
}

export function getAnnotationColorClass(annotation: DocumentAnnotation): string {
  switch (annotation.category) {
    case 'spelling':
      return 'spell-error'
    case 'grammar':
      return 'spell-warning'
    case 'punctuation':
      return 'spell-warning'
    case 'style':
      return 'spell-info'
    default:
      return 'spell-info'
  }
}

export function getAnnotationClass(annotation: DocumentAnnotation): string {
  return getAnnotationColorClass(annotation)
}

export function getSeverityClass(severity: AnnotationSeverity): string {
  switch (severity) {
    case 'high':
    case 'critical':
    case 'error':
      return 'spell-error'
    case 'medium':
    case 'warning':
      return 'spell-warning'
    case 'low':
    case 'info':
      return 'spell-info'
    default:
      return 'spell-info'
  }
}

export function groupAnnotationsBySlide(annotations: SlideAnnotation[]): Map<string, SlideAnnotation[]> {
  const grouped = new Map<string, SlideAnnotation[]>()
  for (const annotation of annotations) {
    const existing = grouped.get(annotation.slideId) || []
    existing.push(annotation)
    grouped.set(annotation.slideId, existing)
  }
  return grouped
}

export function groupAnnotationsByElement(annotations: SlideAnnotation[]): Map<string, SlideAnnotation[]> {
  const grouped = new Map<string, SlideAnnotation[]>()
  for (const annotation of annotations) {
    const existing = grouped.get(annotation.elementId) || []
    existing.push(annotation)
    grouped.set(annotation.elementId, existing)
  }
  return grouped
}
