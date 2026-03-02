/**
 * RefineSlideDialog Component
 *
 * Dialog for AI-powered slide refinement.
 * Allows users to describe changes they want to make to a slide.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  AiButton,
  Button,
  Textarea,
  Label,
  Spinner,
  Switch,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { AlertCircle, Globe, Sparkles, Check } from 'lucide-react'
import type { SlideData, TextElement, ShapeElement } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { refineSlide, serializeSlideForAI } from '../services/SlideRefinementService'
import { gradientToCss } from './slideElements'
import translations from '../_i18n'

export interface RefineSlideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSlide: SlideData
  onRefine: (refinedSlide: SlideData) => void
  accessToken: string
  theme?: SlideTheme
  'data-testid'?: string
}

type RefinePhase = 'idle' | 'analyzing' | 'refining' | 'building' | 'complete'

export const RefineSlideDialog: React.FC<RefineSlideDialogProps> = ({
  open,
  onOpenChange,
  currentSlide,
  onRefine,
  accessToken,
  theme,
  'data-testid': testId = 'refine-slide-dialog'
}) => {
  const { t } = useTranslation(translations)

  // Form state
  const [instructions, setInstructions] = useState('')
  const [useWebSearch, setUseWebSearch] = useState(false)

  // Generation state
  const [isRefining, setIsRefining] = useState(false)
  const [phase, setPhase] = useState<RefinePhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewSlide, setPreviewSlide] = useState<SlideData | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setInstructions('')
      setUseWebSearch(false)
      setIsRefining(false)
      setPhase('idle')
      setError(null)
      setPreviewSlide(null)
    }
  }, [open])

  // Handle refinement
  const handleRefine = useCallback(async () => {
    if (!instructions.trim()) return

    setIsRefining(true)
    setError(null)
    setPreviewSlide(null)

    try {
      const result = await refineSlide(
        {
          slide: currentSlide,
          instructions: instructions.trim(),
          useWebSearch,
          theme
        },
        accessToken,
        message => {
          if (message.includes('Analyzing')) setPhase('analyzing')
          else if (message.includes('Refining')) setPhase('refining')
          else if (message.includes('Building')) setPhase('building')
        }
      )

      setPhase('complete')
      setPreviewSlide(result.slide)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
      setPhase('idle')
    } finally {
      setIsRefining(false)
    }
  }, [instructions, useWebSearch, currentSlide, accessToken, theme])

  // Apply the refined slide
  const handleApply = useCallback(() => {
    if (previewSlide) {
      onRefine(previewSlide)
      onOpenChange(false)
    }
  }, [previewSlide, onRefine, onOpenChange])

  // Get current slide summary for display
  const slideSummary = serializeSlideForAI(currentSlide)

  const isValid = instructions.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={isRefining ? undefined : onOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        {/* Header */}
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('refine-title') || 'Refine Slide'}
          </DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('refine-description') || 'Describe how you would like to improve this slide'}
          </p>
        </DialogHeader>

        <Separator />

        <div className="gba:px-6 gba:py-5 gba:space-y-5 gba:max-h-[60vh] gba:overflow-y-auto">
          {/* Current slide preview */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium">{t('refine-current-slide') || 'Current Slide'}</Label>
            <div className="gba:flex gba:gap-4">
              {/* Thumbnail */}
              <div
                className="gba:w-40 gba:flex-shrink-0 gba:relative gba:overflow-hidden gba:rounded-lg gba:border"
                style={{ aspectRatio: '16 / 9' }}
              >
                <div
                  className="gba:absolute gba:inset-0"
                  style={{
                    backgroundColor: currentSlide.background?.color || '#fff',
                    background: currentSlide.background?.gradient
                      ? gradientToCss(currentSlide.background.gradient)
                      : undefined
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 1280,
                      height: 720,
                      transform: 'scale(0.125)',
                      transformOrigin: 'top left'
                    }}
                  >
                    {(currentSlide.elements || []).map(el => (
                      <div
                        key={el.id}
                        className="gba:absolute gba:overflow-hidden"
                        style={{
                          left: el.position.x,
                          top: el.position.y,
                          width: el.size.width,
                          height: el.size.height,
                          backgroundColor: el.type === 'shape' ? (el as ShapeElement).fill : 'transparent'
                        }}
                      >
                        {el.type === 'text' && (
                          <div
                            className="gba:w-full gba:h-full gba:overflow-hidden gba:whitespace-pre-wrap"
                            style={{
                              color: (el as TextElement).color,
                              fontSize: (el as TextElement).fontSize,
                              fontWeight: (el as TextElement).fontWeight,
                              fontFamily: (el as TextElement).fontFamily,
                              textAlign: (el as TextElement).textAlign,
                              lineHeight: (el as TextElement).lineHeight || 1.2
                            }}
                          >
                            {(el as TextElement).content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content summary */}
              <div className="gba:flex-1 gba:text-xs gba:text-muted-foreground gba:space-y-1 gba:bg-muted/30 gba:p-3 gba:rounded-lg gba:border">
                <pre className="gba:whitespace-pre-wrap gba:font-sans gba:leading-relaxed">
                  {slideSummary.textContent.slice(0, 300)}
                  {slideSummary.textContent.length > 300 && '...'}
                </pre>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="gba:space-y-2">
            <Label htmlFor="instructions" className="gba:text-sm gba:font-medium">
              {t('refine-instructions') || 'What would you like to change?'}
            </Label>
            <Textarea
              id="instructions"
              placeholder={
                t('refine-instructions-placeholder') ||
                'e.g., Add a pie chart showing the distribution, simplify the bullet points, make it more visual...'
              }
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              disabled={isRefining}
              className="gba:resize-none gba:text-sm"
              data-testid={`${testId}-instructions`}
            />
          </div>

          {/* Web search option */}
          <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:border gba:bg-muted/30">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Globe className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <div>
                <Label htmlFor="refine-web-search" className="gba:text-sm gba:font-medium gba:cursor-pointer">
                  {t('refine-web-search') || 'Search web for updated data'}
                </Label>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('refine-web-search-desc') || 'Find current statistics and information'}
                </p>
              </div>
            </div>
            <Switch
              id="refine-web-search"
              checked={useWebSearch}
              onCheckedChange={setUseWebSearch}
              disabled={isRefining}
              data-testid={`${testId}-web-search`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="gba:flex gba:items-start gba:gap-3 gba:p-4 gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:text-destructive gba:rounded-lg">
              <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
              <div className="gba:text-sm">
                <p className="gba:font-medium">{t('refine-failed') || 'Refinement failed'}</p>
                <p className="gba:text-destructive/80 gba:mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {isRefining && (
            <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-muted/20">
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-3">
                <Spinner className="gba:w-5 gba:h-5" />
                <span className="gba:text-sm gba:text-muted-foreground">
                  {phase === 'analyzing' && (t('refine-analyzing') || 'Analyzing current slide...')}
                  {phase === 'refining' && (t('refine-refining') || 'Refining slide...')}
                  {phase === 'building' && (t('refine-building') || 'Building refined slide...')}
                </span>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewSlide && !isRefining && (
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Check className="gba:w-4 gba:h-4 gba:text-success" />
                <Label className="gba:text-sm gba:font-medium gba:text-success">
                  {t('refine-preview') || 'Refined Slide Preview'}
                </Label>
              </div>
              <div
                className="gba:w-full gba:relative gba:overflow-hidden gba:rounded-lg gba:border-2 gba:border-success/30"
                style={{ aspectRatio: '16 / 9' }}
              >
                <div
                  className="gba:absolute gba:inset-0"
                  style={{
                    backgroundColor: previewSlide.background?.color || '#fff',
                    background: previewSlide.background?.gradient
                      ? gradientToCss(previewSlide.background.gradient)
                      : undefined
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 1280,
                      height: 720,
                      transform: 'scale(0.45)',
                      transformOrigin: 'top left'
                    }}
                  >
                    {(previewSlide.elements || []).map(el => (
                      <div
                        key={el.id}
                        className="gba:absolute gba:overflow-hidden"
                        style={{
                          left: el.position.x,
                          top: el.position.y,
                          width: el.size.width,
                          height: el.size.height,
                          backgroundColor: el.type === 'shape' ? (el as ShapeElement).fill : 'transparent'
                        }}
                      >
                        {el.type === 'text' && (
                          <div
                            className="gba:w-full gba:h-full gba:overflow-hidden gba:whitespace-pre-wrap"
                            style={{
                              color: (el as TextElement).color,
                              fontSize: (el as TextElement).fontSize,
                              fontWeight: (el as TextElement).fontWeight,
                              fontFamily: (el as TextElement).fontFamily,
                              textAlign: (el as TextElement).textAlign,
                              lineHeight: (el as TextElement).lineHeight || 1.2
                            }}
                          >
                            {(el as TextElement).content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="gba:px-6 gba:py-4 gba:bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isRefining}>
            {t('refine-cancel') || 'Cancel'}
          </Button>

          {previewSlide ? (
            <Button onClick={handleApply} className="gba:gap-2" data-testid={`${testId}-apply`}>
              <Check className="gba:w-4 gba:h-4" />
              {t('refine-apply') || 'Apply Changes'}
            </Button>
          ) : (
            <AiButton
              onClick={handleRefine}
              disabled={!isValid || isRefining}
              showIcon
              icon={isRefining ? <Spinner className="gba:w-4 gba:h-4" /> : <Sparkles className="gba:w-4 gba:h-4" />}
              iconPosition="before"
              data-testid={`${testId}-submit`}
            >
              {isRefining ? t('refine-refining-button') || 'Refining...' : t('refine-button') || 'Refine Slide'}
            </AiButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RefineSlideDialog
