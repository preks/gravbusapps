// Suggestion popover for spell check corrections.

import React from 'react'
import { Popover, PopoverContent, Button, Separator, useTranslation } from '@newwork/nw-design-system'
import { Check, X, BookOpen } from 'lucide-react'
import type { SlideAnnotation } from '../types/slideSpellCheck'
import translations from '../_i18n'

interface SuggestionPopoverProps {
  annotation: SlideAnnotation | null
  anchorRect: DOMRect | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept: (annotation: SlideAnnotation) => void
  onIgnore: (annotationId: string) => void
  onIgnoreWord: (word: string) => void
  'data-testid'?: string
}

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  annotation,
  anchorRect,
  open,
  onOpenChange,
  onAccept,
  onIgnore,
  onIgnoreWord,
  'data-testid': testId = 'suggestion-popover'
}) => {
  const { t } = useTranslation(translations)

  if (!annotation || !anchorRect) {
    return null
  }

  const handleAccept = () => {
    onAccept(annotation)
    onOpenChange(false)
  }

  const handleIgnore = () => {
    onIgnore(annotation.id)
    onOpenChange(false)
  }

  const handleIgnoreWord = () => {
    onIgnoreWord(annotation.originalText)
    onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        className="gba:w-72 gba:p-0"
        style={{
          position: 'fixed',
          left: anchorRect.left,
          top: anchorRect.bottom + 4
        }}
        data-testid={testId}
      >
        <div className="gba:p-3">
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">{annotation.message}</p>

          {annotation.suggestion && (
            <div className="gba:mb-3">
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('spell-check-suggestion')}</p>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:line-through gba:text-muted-foreground">{annotation.originalText}</span>
                <span className="gba:text-muted-foreground">→</span>
                <span className="gba:font-medium gba:text-green-600">{annotation.suggestion}</span>
              </div>
            </div>
          )}

          <div className="gba:flex gba:flex-wrap gba:gap-1.5">
            {annotation.suggestion && (
              <Button
                variant="default"
                size="sm"
                className="gba:h-7"
                onClick={handleAccept}
                data-testid={`${testId}-accept`}
              >
                <Check className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                {t('spell-check-accept')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gba:h-7"
              onClick={handleIgnore}
              data-testid={`${testId}-ignore`}
            >
              <X className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
              {t('spell-check-ignore')}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="gba:p-2">
          <Button
            variant="ghost"
            size="sm"
            className="gba:w-full gba:justify-start gba:h-7 gba:text-xs"
            onClick={handleIgnoreWord}
            data-testid={`${testId}-ignore-all`}
          >
            <BookOpen className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
            {t('spell-check-add-to-dictionary')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default SuggestionPopover
