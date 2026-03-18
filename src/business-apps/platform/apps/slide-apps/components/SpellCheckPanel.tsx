// Spell check panel showing all issues grouped by slide.

import React, { useMemo } from 'react'
import {
  Button,
  Label,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Badge,
  Spinner,
  useTranslation,
  cn
} from '@newwork/nw-design-system'
import { RefreshCw, ChevronDown, Check, X, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import type { SlideAnnotation } from '../types/slideSpellCheck'
import translations from '../_i18n'

interface SpellCheckPanelProps {
  annotations: SlideAnnotation[]
  annotationsBySlide: Map<string, SlideAnnotation[]>
  isChecking: boolean
  totalIssues: number
  selectedAnnotationId: string | null
  onCheck: () => void
  onSelectAnnotation: (annotationId: string) => void
  onAcceptSuggestion: (annotation: SlideAnnotation) => void
  onIgnoreAnnotation: (annotationId: string) => void
  onIgnoreWord: (word: string) => void
  onNavigateToSlide: (slideId: string) => void
  onClose: () => void
  'data-testid'?: string
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
    case 'warning':
      return <AlertTriangle className="gba:w-3.5 gba:h-3.5 gba:text-amber-500" />
    default:
      return <Info className="gba:w-3.5 gba:h-3.5 gba:text-blue-500" />
  }
}

function getCategoryBadgeVariant(category: string): 'destructive' | 'warning' | 'secondary' {
  switch (category) {
    case 'spelling':
      return 'destructive'
    case 'grammar':
    case 'punctuation':
      return 'warning'
    default:
      return 'secondary'
  }
}

export const SpellCheckPanel: React.FC<SpellCheckPanelProps> = ({
  annotations,
  annotationsBySlide,
  isChecking,
  totalIssues,
  selectedAnnotationId,
  onCheck,
  onSelectAnnotation,
  onAcceptSuggestion,
  onIgnoreAnnotation,
  onIgnoreWord,
  onNavigateToSlide,
  onClose,
  'data-testid': testId = 'spell-check-panel'
}) => {
  const { t } = useTranslation(translations)

  const sortedSlideIds = useMemo(() => {
    return Array.from(annotationsBySlide.keys())
  }, [annotationsBySlide])

  const slideIndices = useMemo(() => {
    const indices = new Map<string, number>()
    let idx = 1
    for (const slideId of sortedSlideIds) {
      indices.set(slideId, idx++)
    }
    return indices
  }, [sortedSlideIds])

  const getSlideNumber = (slideId: string): number => {
    return slideIndices.get(slideId) || 1
  }

  const lastCheckedAt = annotations.length > 0 || isChecking ? new Date().toISOString() : null

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:border-l gba:bg-background" data-testid={testId}>
      <div className="gba:p-4 gba:border-b">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <Label className="gba:text-sm gba:font-semibold">{t('spell-check-panel-title')}</Label>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCheck}
              disabled={isChecking}
              data-testid={`${testId}-recheck-btn`}
            >
              {isChecking ? <Spinner className="gba:w-4 gba:h-4" /> : <RefreshCw className="gba:w-4 gba:h-4" />}
              <span className="gba:ml-1.5">{isChecking ? t('spell-check-checking') : t('spell-check-recheck')}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid={`${testId}-close-btn`}>
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>

        {totalIssues > 0 ? (
          <p className="gba:text-xs gba:text-muted-foreground">
            {t('spell-check-issues-found', { count: totalIssues })}
          </p>
        ) : lastCheckedAt ? (
          <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
            <Check className="gba:w-3.5 gba:h-3.5 gba:text-green-500" />
            {t('spell-check-no-issues')}
          </p>
        ) : (
          <p className="gba:text-xs gba:text-muted-foreground">{t('spell-check-not-checked')}</p>
        )}
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto">
        {isChecking && annotations.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
            <Spinner className="gba:w-8 gba:h-8 gba:mb-3" />
            <p className="gba:text-sm gba:text-muted-foreground">{t('spell-check-checking')}</p>
          </div>
        ) : sortedSlideIds.length === 0 && lastCheckedAt ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
            <div className="gba:rounded-full gba:bg-green-100 gba:p-3 gba:mb-3">
              <Check className="gba:w-6 gba:h-6 gba:text-green-600" />
            </div>
            <p className="gba:text-sm gba:font-medium">{t('spell-check-no-issues')}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('spell-check-all-good')}</p>
          </div>
        ) : sortedSlideIds.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
            <p className="gba:text-sm gba:text-muted-foreground">{t('spell-check-click-to-start')}</p>
          </div>
        ) : (
          <div className="gba:p-2">
            {sortedSlideIds.map(slideId => {
              const slideAnnotations = annotationsBySlide.get(slideId) || []
              const slideNumber = getSlideNumber(slideId)

              return (
                <Collapsible key={slideId} defaultOpen className="gba:mb-2">
                  <CollapsibleTrigger className="gba:flex gba:items-center gba:justify-between gba:w-full gba:px-3 gba:py-2 gba:rounded-md gba:hover:bg-muted gba:transition-colors">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <ChevronDown className="gba:w-4 gba:h-4 gba:transition-transform gba:duration-200 [[data-state=closed]>&]:gba:-rotate-90" />
                      <span className="gba:text-sm gba:font-medium">
                        {t('spell-check-slide', { number: slideNumber })}
                      </span>
                    </div>
                    <Badge variant="secondary" className="gba:text-xs">
                      {slideAnnotations.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="gba:pl-6 gba:pr-2 gba:py-1 gba:space-y-1">
                      {slideAnnotations.map(annotation => (
                        <div
                          key={annotation.id}
                          className={cn(
                            'gba:p-2.5 gba:rounded-md gba:border gba:cursor-pointer gba:transition-colors',
                            selectedAnnotationId === annotation.id
                              ? 'gba:border-primary gba:bg-primary/5'
                              : 'gba:border-transparent gba:hover:bg-muted'
                          )}
                          onClick={() => {
                            onSelectAnnotation(annotation.id)
                            onNavigateToSlide(annotation.slideId)
                          }}
                          data-testid={`${testId}-annotation-${annotation.id}`}
                        >
                          <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1.5">
                            <div className="gba:flex gba:items-center gba:gap-1.5">
                              {getSeverityIcon(annotation.severity)}
                              <Badge
                                variant={getCategoryBadgeVariant(annotation.category)}
                                className="gba:text-[10px] gba:px-1.5 gba:py-0"
                              >
                                {annotation.category}
                              </Badge>
                            </div>
                          </div>

                          <div className="gba:mb-2">
                            <span className="gba:text-sm gba:line-through gba:text-muted-foreground gba:mr-2">
                              {annotation.originalText}
                            </span>
                            {annotation.suggestion && (
                              <span className="gba:text-sm gba:font-medium gba:text-green-600">
                                {annotation.suggestion}
                              </span>
                            )}
                          </div>

                          <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{annotation.message}</p>

                          <div className="gba:flex gba:items-center gba:gap-1.5">
                            {annotation.suggestion && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-6 gba:px-2 gba:text-xs"
                                onClick={e => {
                                  e.stopPropagation()
                                  onAcceptSuggestion(annotation)
                                }}
                                data-testid={`${testId}-accept-${annotation.id}`}
                              >
                                <Check className="gba:w-3 gba:h-3 gba:mr-1" />
                                {t('spell-check-accept')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gba:h-6 gba:px-2 gba:text-xs"
                              onClick={e => {
                                e.stopPropagation()
                                onIgnoreAnnotation(annotation.id)
                              }}
                              data-testid={`${testId}-ignore-${annotation.id}`}
                            >
                              <X className="gba:w-3 gba:h-3 gba:mr-1" />
                              {t('spell-check-ignore')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gba:h-6 gba:px-2 gba:text-xs"
                              onClick={e => {
                                e.stopPropagation()
                                onIgnoreWord(annotation.originalText)
                              }}
                              data-testid={`${testId}-ignore-all-${annotation.id}`}
                            >
                              {t('spell-check-ignore-all')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SpellCheckPanel
