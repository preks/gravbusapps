/**
 * GeneratePresentationDialog Component
 *
 * Dialog for AI-powered presentation generation.
 * Modern, crisp design with clean visual hierarchy.
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
import { AlertCircle, Globe, Search, Layers, Check, Wand2 } from 'lucide-react'
import { ContentAttachmentPicker } from './ContentAttachmentPicker'
import { useSlideGeneration } from '../hooks/useSlideGeneration'
import type { SlideData } from './slideElements'
import type { ContentReference, GenerationOptions } from '../services/SlideGenerationService'
import translations from '../_i18n'

export interface GeneratePresentationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (slides: SlideData[], title: string) => void
  accessToken: string
  'data-testid'?: string
}

type PresentationLength = 'short' | 'medium' | 'long'

const LENGTH_OPTIONS: { value: PresentationLength; label: string; slides: string }[] = [
  { value: 'short', label: 'Short', slides: '5-8 slides' },
  { value: 'medium', label: 'Medium', slides: '9-14 slides' },
  { value: 'long', label: 'Long', slides: '15-25 slides' }
]

export const GeneratePresentationDialog: React.FC<GeneratePresentationDialogProps> = ({
  open,
  onOpenChange,
  onGenerate,
  accessToken,
  'data-testid': testId = 'generate-presentation-dialog'
}) => {
  const { t } = useTranslation(translations)
  // Form state
  const [description, setDescription] = useState('')
  const [length, setLength] = useState<PresentationLength>('medium')
  const [additionalRequirements, setAdditionalRequirements] = useState('')
  const [references, setReferences] = useState<ContentReference[]>([])
  const [useWebSearch, setUseWebSearch] = useState(false)

  // Generation hook
  const { isGenerating, phase, error, progressMessage, generate, reset } = useSlideGeneration({
    accessToken,
    onSuccess: (slides, title) => {
      onGenerate(slides, title)
      onOpenChange(false)
    }
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDescription('')
      setLength('medium')
      setAdditionalRequirements('')
      setReferences([])
      setUseWebSearch(false)
      reset()
    }
  }, [open, reset])

  // Handle form submission
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return

    const options: GenerationOptions = {
      description: description.trim(),
      length,
      additionalRequirements: additionalRequirements.trim() || undefined,
      references: references.length > 0 ? references : undefined,
      useWebSearch
    }

    await generate(options)
  }, [description, length, additionalRequirements, references, useWebSearch, generate])

  const isValid = description.trim().length > 0

  // Determine phase status for stepper (uses hook phase, locale-independent)
  const getPhaseStatus = (step: 'research' | 'generate' | 'validate') => {
    const stepOrder = ['research', 'generation', 'validation', 'complete'] as const
    const currentIdx = stepOrder.indexOf(phase as (typeof stepOrder)[number])
    const stepIdx = { research: 0, generate: 1, validate: 2 }[step]
    if (currentIdx > stepIdx) return 'complete'
    if (currentIdx === stepIdx) return 'active'
    return 'pending'
  }

  return (
    <Dialog open={open} onOpenChange={isGenerating ? undefined : onOpenChange}>
      <DialogContent className="gba:max-w-xl gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        {/* Header */}
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight">{t('generate-title')}</DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('generate-description')}</p>
        </DialogHeader>

        <Separator />

        <div className="gba:px-6 gba:py-5 gba:space-y-5 gba:max-h-[60vh] gba:overflow-y-auto">
          {/* Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="description" className="gba:text-sm gba:font-medium">
              {t('generate-topic')}
            </Label>
            <Textarea
              id="description"
              placeholder={t('generate-topic-placeholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              disabled={isGenerating}
              className="gba:resize-none gba:text-sm"
              data-testid={`${testId}-description`}
            />
          </div>

          {/* Length selector - horizontal pills */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium">{t('generate-length')}</Label>
            <div className="gba:flex gba:gap-2">
              {LENGTH_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !isGenerating && setLength(opt.value)}
                  disabled={isGenerating}
                  className={`gba:flex-1 gba:py-2.5 gba:px-3 gba:rounded-lg gba:border gba:text-sm gba:transition-all gba:duration-150 ${
                    length === opt.value
                      ? 'gba:border-primary gba:bg-primary/5 gba:text-primary gba:font-medium'
                      : 'gba:border-border gba:bg-background hover:gba:border-muted-foreground/30 gba:text-foreground'
                  } ${isGenerating ? 'gba:opacity-50 gba:cursor-not-allowed' : 'gba:cursor-pointer'}`}
                  data-testid={`${testId}-length-${opt.value}`}
                >
                  <div className="gba:font-medium">
                    {opt.value === 'short'
                      ? t('generate-length-short')
                      : opt.value === 'medium'
                        ? t('generate-length-medium')
                        : t('generate-length-long')}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    {opt.value === 'short'
                      ? t('generate-slides-short')
                      : opt.value === 'medium'
                        ? t('generate-slides-medium')
                        : t('generate-slides-long')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options row */}
          <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:border gba:bg-muted/30">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Globe className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <div>
                <Label htmlFor="web-search" className="gba:text-sm gba:font-medium gba:cursor-pointer">
                  {t('generate-web-search')}
                </Label>
                <p className="gba:text-xs gba:text-muted-foreground">{t('generate-web-search-desc')}</p>
              </div>
            </div>
            <Switch
              id="web-search"
              checked={useWebSearch}
              onCheckedChange={setUseWebSearch}
              disabled={isGenerating}
              data-testid={`${testId}-web-search`}
            />
          </div>

          {/* Reference materials */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium">
              {t('generate-references')}
              <span className="gba:text-muted-foreground gba:font-normal gba:ml-1">
                {t('generate-references-optional')}
              </span>
            </Label>
            <ContentAttachmentPicker
              selectedItems={references}
              onSelectionChange={setReferences}
              maxItems={5}
              accessToken={accessToken}
              data-testid={`${testId}-attachments`}
            />
          </div>

          {/* Additional requirements - collapsible feel */}
          <div className="gba:space-y-2">
            <Label htmlFor="requirements" className="gba:text-sm gba:font-medium">
              {t('generate-additional-instructions')}
              <span className="gba:text-muted-foreground gba:font-normal gba:ml-1">
                {t('generate-references-optional')}
              </span>
            </Label>
            <Textarea
              id="requirements"
              placeholder={t('generate-requirements-placeholder')}
              value={additionalRequirements}
              onChange={e => setAdditionalRequirements(e.target.value)}
              rows={2}
              disabled={isGenerating}
              className="gba:resize-none gba:text-sm"
              data-testid={`${testId}-requirements`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="gba:flex gba:items-start gba:gap-3 gba:p-4 gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:text-destructive gba:rounded-lg">
              <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
              <div className="gba:text-sm">
                <p className="gba:font-medium">{t('generate-failed')}</p>
                <p className="gba:text-destructive/80 gba:mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-muted/20">
              {/* Phase stepper */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                {useWebSearch && (
                  <>
                    <PhaseIndicator
                      label={t('generate-research')}
                      status={getPhaseStatus('research')}
                      icon={<Search className="gba:w-3.5 gba:h-3.5" />}
                    />
                    <div className="gba:flex-1 gba:h-px gba:bg-border gba:mx-3" />
                  </>
                )}
                <PhaseIndicator
                  label={t('generate-generate')}
                  status={getPhaseStatus('generate')}
                  icon={<Layers className="gba:w-3.5 gba:h-3.5" />}
                />
                <div className="gba:flex-1 gba:h-px gba:bg-border gba:mx-3" />
                <PhaseIndicator
                  label={t('generate-validate')}
                  status={getPhaseStatus('validate')}
                  icon={<Check className="gba:w-3.5 gba:h-3.5" />}
                />
              </div>

              {/* Status text */}
              {progressMessage && (
                <p className="gba:text-xs gba:text-muted-foreground gba:text-center">{progressMessage}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="gba:px-6 gba:py-4 gba:bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            {t('generate-cancel')}
          </Button>
          <AiButton
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            showIcon
            icon={isGenerating ? <Spinner className="gba:w-4 gba:h-4" /> : <Wand2 className="gba:w-4 gba:h-4" />}
            iconPosition="before"
            data-testid={`${testId}-submit`}
          >
            {isGenerating ? t('generate-generating') : t('generate-button')}
          </AiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Phase indicator component for the progress stepper */
const PhaseIndicator: React.FC<{
  label: string
  status: 'pending' | 'active' | 'complete'
  icon: React.ReactNode
}> = ({ label, status, icon }) => {
  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
      <div
        className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:transition-all gba:duration-300 ${
          status === 'active'
            ? 'gba:bg-primary gba:text-primary-foreground'
            : status === 'complete'
              ? 'gba:bg-success/10 gba:text-success gba:border gba:border-success/30'
              : 'gba:bg-muted gba:text-muted-foreground'
        }`}
      >
        {status === 'active' ? (
          <Spinner size="sm" />
        ) : status === 'complete' ? (
          <Check className="gba:w-4 gba:h-4" />
        ) : (
          icon
        )}
      </div>
      <span
        className={`gba:text-xs gba:font-medium ${
          status === 'active'
            ? 'gba:text-primary'
            : status === 'complete'
              ? 'gba:text-success'
              : 'gba:text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

export default GeneratePresentationDialog
