/**
 * SaveTemplateDialog Component
 *
 * Dialog for saving current slides as a reusable template.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  Spinner,
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  LayoutTemplate,
  Briefcase,
  Palette,
  Minimize2,
  Folder,
  Building2,
  ChevronDown,
  Wand2,
  Settings2
} from 'lucide-react'
import type { SlideData, SlideBackground } from './slideElements'
import type { TemplateCategory, BrandIdentity, SlideTemplateMeta } from '../types'
import { SlidesApiService } from '../services/SlidesApiService'
import { gradientToCss } from './slideElements'
import { inferPurposeFromSlide, createDefaultMeta, PURPOSE_DEFINITIONS } from '../services/SlideMetadataService'
import { SlideMetaEditor } from './SlideMetaEditor'
import translations from '../_i18n'

const getBackgroundStyle = (background: SlideBackground): React.CSSProperties => {
  switch (background.type) {
    case 'gradient':
      return background.gradient ? { background: gradientToCss(background.gradient) } : {}
    case 'branded': {
      const layers: string[] = []
      if (background.overlay) {
        layers.push(gradientToCss(background.overlay))
      }
      if (background.gradient) {
        layers.push(gradientToCss(background.gradient))
      }
      const baseColor = background.color || '#0a0a0a'
      if (layers.length > 0) {
        return { background: `${layers.join(', ')}, ${baseColor}` }
      }
      return { backgroundColor: baseColor }
    }
    case 'image':
      return background.imageUrl
        ? { backgroundImage: `url(${background.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {}
    case 'video':
      return { backgroundColor: '#000000' }
    default:
      return { backgroundColor: background.color || '#ffffff' }
  }
}

export interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slides: SlideData[]
  themeId: string
  masters?: import('../types/slideMaster').SlideMaster[]
  onSaved?: () => void
  'data-testid'?: string
}

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'branded', label: 'Branded', icon: <Building2 className="gba:w-4 gba:h-4" /> },
  { value: 'business', label: 'Business', icon: <Briefcase className="gba:w-4 gba:h-4" /> },
  { value: 'creative', label: 'Creative', icon: <Palette className="gba:w-4 gba:h-4" /> },
  { value: 'minimal', label: 'Minimal', icon: <Minimize2 className="gba:w-4 gba:h-4" /> },
  { value: 'custom', label: 'Custom', icon: <Folder className="gba:w-4 gba:h-4" /> }
]

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  open,
  onOpenChange,
  slides,
  themeId,
  masters,
  onSaved,
  'data-testid': testId = 'save-template-dialog'
}) => {
  const { t } = useTranslation(translations)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Brand settings for branded templates
  const [brandCompanyName, setBrandCompanyName] = useState('')
  const [brandKeywords, setBrandKeywords] = useState('')

  // Slide metadata
  const [slideMeta, setSlideMeta] = useState<SlideTemplateMeta[]>([])
  const [isInferring, setIsInferring] = useState(false)
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setCategory('custom')
      setIsPublic(false)
      setIsSaving(false)
      setError(null)
      setBrandCompanyName('')
      setBrandKeywords('')
      setSlideMeta([])
      setExpandedSlide(null)
      setIsInferring(false)
    }
  }, [open])

  // Auto-infer slide purposes when dialog opens
  useEffect(() => {
    if (open && slides.length > 0 && slideMeta.length === 0) {
      handleAutoDetectAll()
    }
  }, [open, slides])

  const handleAutoDetectAll = useCallback(async () => {
    setIsInferring(true)
    try {
      const inferred = slides.map((slide, index) => {
        const purpose = inferPurposeFromSlide(slide, index, slides.length)
        return createDefaultMeta(purpose)
      })
      setSlideMeta(inferred)
    } finally {
      setIsInferring(false)
    }
  }, [slides])

  const handleAutoDetectSlide = useCallback(
    (index: number) => {
      const slide = slides[index]
      if (!slide) return
      const purpose = inferPurposeFromSlide(slide, index, slides.length)
      const newMeta = [...slideMeta]
      newMeta[index] = createDefaultMeta(purpose)
      setSlideMeta(newMeta)
    },
    [slides, slideMeta]
  )

  const handleSlideMetaChange = useCallback(
    (index: number, meta: SlideTemplateMeta) => {
      const newMeta = [...slideMeta]
      newMeta[index] = meta
      setSlideMeta(newMeta)
    },
    [slideMeta]
  )

  const handleSave = useCallback(async () => {
    if (!name.trim()) return

    // Validate brand fields when category is branded
    if (category === 'branded' && !brandCompanyName.trim()) {
      setError(t('template-brand-company-required') || 'Company name is required for branded templates')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Build branding object for branded templates
      const branding: BrandIdentity | undefined =
        category === 'branded'
          ? {
              companyName: brandCompanyName.trim(),
              keywords: brandKeywords
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 0),
              logo: { lightUrl: '', darkUrl: '' },
              colors: { primary: '#E11D48', secondary: '#1e293b' }
            }
          : undefined

      const result = await SlidesApiService.createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        isPublic,
        branding,
        slideMeta: slideMeta.length > 0 ? slideMeta : undefined,
        contentJson: {
          slides,
          themeId,
          ...(masters && masters.length > 0 ? { masters } : {})
        }
      })

      if (result) {
        onSaved?.()
        onOpenChange(false)
      } else {
        setError(t('template-save-error') || 'Failed to save template')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('template-save-error') || 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }, [
    name,
    description,
    category,
    isPublic,
    brandCompanyName,
    brandKeywords,
    slides,
    themeId,
    slideMeta,
    onSaved,
    onOpenChange,
    t
  ])

  const isValid = name.trim().length > 0 && (category !== 'branded' || brandCompanyName.trim().length > 0)

  const thumbScale = 80 / 1280

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : onOpenChange}>
      <DialogContent
        className="gba:max-w-lg gba:max-h-[90vh] gba:p-0 gba:gap-0 gba:flex gba:flex-col"
        data-testid={testId}
      >
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4 gba:flex-shrink-0">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight gba:flex gba:items-center gba:gap-2">
            <LayoutTemplate className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('template-save-title') || 'Save as Template'}
          </DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('template-save-description') || 'Save your current slides as a reusable template'}
          </p>
        </DialogHeader>

        <Separator className="gba:flex-shrink-0" />

        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-6 gba:py-5 gba:space-y-5">
          {/* Slides Preview */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium">
              {t('template-slides-preview') || 'Slides'} ({slides.length})
            </Label>
            <div className="gba:flex gba:gap-2 gba:overflow-x-auto gba:pb-2">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="gba:flex-shrink-0 gba:rounded gba:border gba:overflow-hidden"
                  style={{ width: 80, aspectRatio: '16/9' }}
                >
                  <div
                    className="gba:relative gba:w-full gba:h-full"
                    style={getBackgroundStyle(slide.background || { type: 'solid', color: '#ffffff' })}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1280,
                        height: 720,
                        transform: `scale(${thumbScale})`,
                        transformOrigin: 'top left'
                      }}
                    >
                      {(slide.elements || []).slice(0, 5).map(el => (
                        <div
                          key={el.id}
                          className="gba:absolute gba:overflow-hidden"
                          style={{
                            left: el.position.x,
                            top: el.position.y,
                            width: el.size.width,
                            height: el.size.height,
                            backgroundColor: el.type === 'shape' ? (el as any).fill : 'transparent'
                          }}
                        >
                          {el.type === 'text' && (
                            <div
                              className="gba:w-full gba:h-full gba:overflow-hidden"
                              style={{
                                color: (el as any).color,
                                fontSize: (el as any).fontSize,
                                fontWeight: (el as any).fontWeight,
                                textAlign: (el as any).textAlign
                              }}
                            >
                              {(el as any).content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="gba:absolute gba:bottom-0.5 gba:left-0.5 gba:min-w-3 gba:h-3 gba:px-0.5 gba:flex gba:items-center gba:justify-center gba:rounded-sm gba:bg-black/50">
                      <span className="gba:text-[8px] gba:font-medium gba:text-white gba:leading-none">{idx + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="template-name" className="gba:text-sm gba:font-medium">
              {t('template-name-label') || 'Template Name'} *
            </Label>
            <Input
              id="template-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('template-name-placeholder') || 'e.g., Sales Pitch Template'}
              disabled={isSaving}
              data-testid={`${testId}-name-input`}
            />
          </div>

          {/* Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="template-description" className="gba:text-sm gba:font-medium">
              {t('template-description-label') || 'Description'}
            </Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('template-description-placeholder') || 'Describe when to use this template...'}
              rows={2}
              disabled={isSaving}
              data-testid={`${testId}-description-input`}
            />
          </div>

          {/* Category */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium">{t('template-category-label') || 'Category'}</Label>
            <Select
              value={category}
              onValueChange={value => setCategory(value as TemplateCategory)}
              disabled={isSaving}
            >
              <SelectTrigger data-testid={`${testId}-category-select`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="gba:flex gba:items-center gba:gap-2">
                      {opt.icon}
                      {t(`template-category-${opt.value}`) || opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Settings (shown when Branded category is selected) */}
          {category === 'branded' && (
            <div className="gba:space-y-4 gba:p-4 gba:rounded-lg gba:border gba:border-primary/20 gba:bg-primary/5">
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium gba:text-primary">
                <Building2 className="gba:w-4 gba:h-4" />
                {t('template-brand-settings') || 'Brand Settings'}
              </div>

              {/* Company Name */}
              <div className="gba:space-y-2">
                <Label htmlFor="brand-company" className="gba:text-sm gba:font-medium">
                  {t('template-brand-company') || 'Company Name'} *
                </Label>
                <Input
                  id="brand-company"
                  value={brandCompanyName}
                  onChange={e => setBrandCompanyName(e.target.value)}
                  placeholder={t('template-brand-company-placeholder') || 'e.g., NEWWORK'}
                  disabled={isSaving}
                  data-testid={`${testId}-brand-company-input`}
                />
              </div>

              {/* Keywords */}
              <div className="gba:space-y-2">
                <Label htmlFor="brand-keywords" className="gba:text-sm gba:font-medium">
                  {t('template-brand-keywords') || 'Detection Keywords'}
                </Label>
                <Input
                  id="brand-keywords"
                  value={brandKeywords}
                  onChange={e => setBrandKeywords(e.target.value)}
                  placeholder={t('template-brand-keywords-placeholder') || 'e.g., newwork, gravity, everyoffice'}
                  disabled={isSaving}
                  data-testid={`${testId}-brand-keywords-input`}
                />
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('template-brand-keywords-help') ||
                    'Comma-separated keywords to auto-detect this brand in presentation topics'}
                </p>
              </div>
            </div>
          )}

          {/* Slide Roles Configuration */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="gba:w-full gba:justify-between"
                disabled={isSaving}
                data-testid={`${testId}-configure-slides-btn`}
              >
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Settings2 className="gba:w-4 gba:h-4" />
                  {t('template-configure-slides') || 'Configure Slides'}
                  {slideMeta.length > 0 && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {t('template-structured-slides', { count: slideMeta.length }) ||
                        `${slideMeta.length} slides defined`}
                    </Badge>
                  )}
                </span>
                <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform [[data-state=open]_&]:gba:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="gba:pt-4 gba:space-y-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('template-slide-roles-desc') || 'Define what each slide is for'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDetectAll}
                  disabled={isSaving || isInferring}
                  data-testid={`${testId}-auto-detect-btn`}
                >
                  {isInferring ? (
                    <>
                      <Spinner className="gba:w-3 gba:h-3 gba:mr-1" />
                      {t('template-inferring') || 'Detecting...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="gba:w-3 gba:h-3 gba:mr-1" />
                      {t('template-auto-detect-all') || 'Auto-detect All'}
                    </>
                  )}
                </Button>
              </div>

              <div className="gba:space-y-2 gba:max-h-[280px] gba:overflow-y-auto gba:pr-1">
                {slides.map((slide, index) => {
                  const meta = slideMeta[index] || createDefaultMeta('content')
                  const isExpanded = expandedSlide === index

                  return (
                    <div key={slide.id} className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <button
                        type="button"
                        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:hover:bg-muted/50 gba:transition-colors"
                        onClick={() => setExpandedSlide(isExpanded ? null : index)}
                        disabled={isSaving}
                      >
                        {/* Thumbnail */}
                        <div
                          className="gba:flex-shrink-0 gba:rounded gba:border gba:overflow-hidden"
                          style={{ width: 48, aspectRatio: '16/9' }}
                        >
                          <div
                            className="gba:w-full gba:h-full"
                            style={getBackgroundStyle(slide.background || { type: 'solid', color: '#ffffff' })}
                          />
                        </div>

                        {/* Info */}
                        <div className="gba:flex-1 gba:text-left gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:text-xs gba:font-medium">Slide {index + 1}</span>
                            <Badge
                              variant="outline"
                              className="gba:text-[10px] gba:py-0"
                              data-testid={`${testId}-slide-${index}-purpose-badge`}
                            >
                              {t(`slide-purpose-${meta.purpose}`) || PURPOSE_DEFINITIONS[meta.purpose].label}
                            </Badge>
                          </div>
                          <p className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                            {t(`slide-position-${meta.position}`) || meta.position}
                            {meta.maxUsage && ` · Max ${meta.maxUsage}x`}
                          </p>
                        </div>

                        <ChevronDown
                          className={`gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform ${isExpanded ? 'gba:rotate-180' : ''}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="gba:border-t gba:p-3 gba:bg-muted/30">
                          <SlideMetaEditor
                            slideMeta={meta}
                            slideIndex={index}
                            slidePreview={slide}
                            onChange={newMeta => handleSlideMetaChange(index, newMeta)}
                            onAutoDetect={() => handleAutoDetectSlide(index)}
                            disabled={isSaving}
                            data-testid={`${testId}-slide-${index}-edit-btn`}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Public Toggle */}
          <div className="gba:flex gba:items-center gba:justify-between gba:py-2">
            <div>
              <Label className="gba:text-sm gba:font-medium">
                {t('template-public-label') || 'Share with organization'}
              </Label>
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('template-public-description') || 'Make this template available to all users'}
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isSaving}
              data-testid={`${testId}-public-switch`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive gba:text-sm">{error}</div>
          )}
        </div>

        <Separator className="gba:flex-shrink-0" />

        <DialogFooter className="gba:px-6 gba:py-4 gba:flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid={`${testId}-cancel-btn`}
          >
            {t('template-cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving} data-testid={`${testId}-save-btn`}>
            {isSaving ? (
              <>
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('template-saving') || 'Saving...'}
              </>
            ) : (
              t('template-save-btn') || 'Save Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SaveTemplateDialog
