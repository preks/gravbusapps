/**
 * GeneratePresentationDialogChat Component
 *
 * Dialog for AI-powered presentation generation via EveryAI chat.
 * Used by dropdown menu "Generate with AI" option.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
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
  Switch,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  Badge,
  ScrollArea,
  Skeleton,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  ToggleGroup,
  ToggleGroupItem,
  RadioGroup,
  RadioGroupItem,
  cn,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Globe,
  Check,
  Wand2,
  LayoutTemplate,
  ChevronDown,
  X,
  Briefcase,
  Palette,
  Minimize2,
  Settings2,
  Users,
  Sparkles,
  FileText,
  Moon,
  Building2,
  Undo2
} from 'lucide-react'
import { ContentAttachmentPicker } from './ContentAttachmentPicker'
import type { SlideData, SlideBackground } from './slideElements'
import { gradientToCss } from './slideElements'
import type { ContentReference } from '../services/SlideGenerationService'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { Navigation } from '@/common/utils/navigationUtils'

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
import type { SlideTemplateSummary, TemplateCategory, SlideTemplate } from '../types'
import { SlidesApiService } from '../services/SlidesApiService'
import { findBrandedTemplate, type BrandMatch } from '../services/BrandMatchingService'
import translations from '../_i18n'

export interface GeneratePresentationDialogChatProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  'data-testid'?: string
}

type PresentationLength = 'short' | 'medium' | 'long'
type PresentationStyle = 'professional' | 'creative' | 'minimal' | 'bold'
type ThemePreference = 'auto' | 'dark' | 'light' | 'branded'
type ContentDensity = 'detailed' | 'balanced' | 'visual'
type TargetAudience = 'executive' | 'technical' | 'sales' | 'general'

const LENGTH_OPTIONS: { value: PresentationLength; label: string; slides: string }[] = [
  { value: 'short', label: 'Short', slides: '5-8 slides' },
  { value: 'medium', label: 'Medium', slides: '9-14 slides' },
  { value: 'long', label: 'Long', slides: '15-25 slides' }
]

const STYLE_OPTIONS: { value: PresentationStyle; labelKey: string }[] = [
  { value: 'professional', labelKey: 'generate-style-professional' },
  { value: 'creative', labelKey: 'generate-style-creative' },
  { value: 'minimal', labelKey: 'generate-style-minimal' },
  { value: 'bold', labelKey: 'generate-style-bold' }
]

const DENSITY_OPTIONS: { value: ContentDensity; labelKey: string; descKey: string }[] = [
  { value: 'detailed', labelKey: 'generate-density-detailed', descKey: 'generate-density-detailed-desc' },
  { value: 'balanced', labelKey: 'generate-density-balanced', descKey: 'generate-density-balanced-desc' },
  { value: 'visual', labelKey: 'generate-density-visual', descKey: 'generate-density-visual-desc' }
]

const AUDIENCE_OPTIONS: { value: TargetAudience; labelKey: string }[] = [
  { value: 'executive', labelKey: 'generate-audience-executive' },
  { value: 'technical', labelKey: 'generate-audience-technical' },
  { value: 'sales', labelKey: 'generate-audience-sales' },
  { value: 'general', labelKey: 'generate-audience-general' }
]

const THEME_PREFERENCE_OPTIONS: { value: ThemePreference; labelKey: string; descKey: string }[] = [
  { value: 'auto', labelKey: 'generate-theme-auto', descKey: 'generate-theme-auto-desc' },
  { value: 'dark', labelKey: 'generate-theme-dark', descKey: 'generate-theme-dark-desc' },
  { value: 'light', labelKey: 'generate-theme-light', descKey: 'generate-theme-light-desc' },
  { value: 'branded', labelKey: 'generate-theme-branded', descKey: 'generate-theme-branded-desc' }
]

const TEMPLATE_CATEGORIES: Array<{ value: TemplateCategory | 'all'; labelKey: string; icon: React.ReactNode }> = [
  { value: 'all', labelKey: 'template-tab-all', icon: <LayoutTemplate className="gba:size-3.5" /> },
  { value: 'business', labelKey: 'template-category-business', icon: <Briefcase className="gba:size-3.5" /> },
  { value: 'creative', labelKey: 'template-category-creative', icon: <Palette className="gba:size-3.5" /> },
  { value: 'minimal', labelKey: 'template-category-minimal', icon: <Minimize2 className="gba:size-3.5" /> }
]

export const GeneratePresentationDialogChat: React.FC<GeneratePresentationDialogChatProps> = ({
  open,
  onOpenChange,
  accessToken,
  'data-testid': testId = 'generate-presentation-dialog-chat'
}) => {
  const { t } = useTranslation(translations)
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [length, setLength] = useState<PresentationLength>('medium')
  const [additionalRequirements, setAdditionalRequirements] = useState('')
  const [references, setReferences] = useState<ContentReference[]>([])
  const [useWebSearch, setUseWebSearch] = useState(false)

  // Advanced options state
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false)
  const [style, setStyle] = useState<PresentationStyle>('professional')
  const [density, setDensity] = useState<ContentDensity>('balanced')
  const [audience, setAudience] = useState<TargetAudience>('general')
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto')
  const [extractStyleFromReferences, setExtractStyleFromReferences] = useState(true)

  // Template state
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [templates, setTemplates] = useState<SlideTemplateSummary[]>([])
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, SlideData>>({})
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const templateScrollRef = useRef<HTMLDivElement>(null)

  // Brand matching state
  const [detectedBrand, setDetectedBrand] = useState<BrandMatch | null>(null)
  const [brandedTemplates, setBrandedTemplates] = useState<SlideTemplate[]>([])
  const [useBrandedTemplate, setUseBrandedTemplate] = useState(true)
  const brandMatchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch templates when section opens or category changes
  useEffect(() => {
    if (!templateSectionOpen) return

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true)
      try {
        const filters: Record<string, unknown> = {}
        if (selectedCategory !== 'all') {
          filters.category = selectedCategory
        }
        const result = await SlidesApiService.listTemplates(filters as any)
        setTemplates(result)

        // Fetch previews for templates (first slide of each)
        const previewPromises = result
          .filter(t => !templatePreviews[t.id])
          .slice(0, 9)
          .map(async template => {
            const full = await SlidesApiService.getTemplate(template.id)
            if (full?.contentJson?.slides?.[0]) {
              return { id: template.id, slide: full.contentJson.slides[0] }
            }
            return null
          })

        const previews = await Promise.all(previewPromises)
        const newPreviews: Record<string, SlideData> = { ...templatePreviews }
        previews.forEach(p => {
          if (p) newPreviews[p.id] = p.slide
        })
        setTemplatePreviews(newPreviews)
      } catch (error) {
        console.error('[GeneratePresentationDialog] Failed to fetch templates:', error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [templateSectionOpen, selectedCategory])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setLength('medium')
      setAdditionalRequirements('')
      setReferences([])
      setUseWebSearch(false)
      setSelectedTemplateId(null)
      setTemplateSectionOpen(false)
      setAdvancedOptionsOpen(false)
      setStyle('professional')
      setDensity('balanced')
      setAudience('general')
      setThemePreference('auto')
      setExtractStyleFromReferences(true)
      setDetectedBrand(null)
      setUseBrandedTemplate(true)
    }
  }, [open])

  // Fetch branded templates when dialog opens
  useEffect(() => {
    if (!open) return

    const fetchBrandedTemplates = async () => {
      try {
        const allTemplates = await SlidesApiService.listBrandedTemplates()
        setBrandedTemplates(allTemplates)
      } catch (error) {
        console.error('[GeneratePresentationDialogChat] Failed to fetch branded templates:', error)
      }
    }

    fetchBrandedTemplates()
  }, [open])

  // Detect brand match when description changes
  useEffect(() => {
    if (!description.trim() || brandedTemplates.length === 0 || !useBrandedTemplate) {
      setDetectedBrand(null)
      return
    }

    if (brandMatchDebounceRef.current) {
      clearTimeout(brandMatchDebounceRef.current)
    }

    brandMatchDebounceRef.current = setTimeout(() => {
      const match = findBrandedTemplate(description, brandedTemplates)
      setDetectedBrand(match)

      if (match) {
        setThemePreference('branded')
        console.log(
          `[GeneratePresentationDialog] Brand detected: ${match.companyName} (confidence: ${(match.confidence * 100).toFixed(0)}%)`
        )
      }
    }, 300)

    return () => {
      if (brandMatchDebounceRef.current) {
        clearTimeout(brandMatchDebounceRef.current)
      }
    }
  }, [description, brandedTemplates, useBrandedTemplate])

  // Handle form submission
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return

    // Build prompt in EverySlides format
    const lengthMap = {
      short: '5-8 slides',
      medium: '9-14 slides',
      long: '15-25 slides'
    }

    let prompt = `Create a new EverySlides presentation: ${description.trim()}\n\nPresentation details:\n- Target length: ${lengthMap[length]}`

    // Collect additional requirements
    const requirements = []
    if (title.trim()) requirements.push(`Title: ${title.trim()}`)
    if (style !== 'professional') requirements.push(`Style: ${style}`)
    if (density !== 'balanced') requirements.push(`Content density: ${density}`)
    if (audience !== 'general') requirements.push(`Target audience: ${audience}`)
    if (themePreference !== 'auto') requirements.push(`Theme preference: ${themePreference}`)
    if (additionalRequirements.trim()) requirements.push(additionalRequirements.trim())

    // Add reference materials
    if (references.length > 0) {
      requirements.push(`Reference materials: ${references.map(r => r.title || r.id).join(', ')}`)
    }

    // Add template info
    const currentTemplate = templates.find(t => t.id === selectedTemplateId)
    if (currentTemplate) {
      requirements.push(`Use template: ${currentTemplate.name}`)
    } else if (detectedBrand) {
      requirements.push(`Use branded template for: ${detectedBrand.companyName}`)
    }

    // Add web search flag
    if (useWebSearch) {
      requirements.push('Use web search for up-to-date information')
    }

    const additionalReqs = requirements.length > 0 ? requirements.join('\n- ') : ''

    // Build instructions in EverySlides format
    prompt += `\n\nInstructions:\n1. FIRST call create_everyslides_presentation tool with:`
    prompt += `\n   - reason: "User requested new presentation"`
    prompt += `\n   - description: "${description.trim()}"`
    prompt += `\n   - length: "${length}"`
    if (title.trim()) {
      prompt += `\n   - title: "${title.trim()}"`
    }
    if (additionalReqs) {
      prompt += `\n   - additional_requirements: "${additionalReqs}"`
    } else {
      prompt += `\n   - additional_requirements: ""`
    }
    prompt += `\n2. ONLY if presentation creation fails due to missing data, then gather additional facts.`
    prompt += `\n3. Return the presentation link when created.`

    // Build additional context for Flowbot
    const additionInfo = JSON.stringify({
      title: title.trim() || undefined,
      length,
      style,
      density,
      audience,
      themePreference,
      extractStyleFromReferences,
      references: references.map(r => ({ id: r.id, title: r.title, type: r.type })),
      selectedTemplateId,
      detectedBrand: detectedBrand
        ? {
            companyName: detectedBrand.companyName,
            templateId: detectedBrand.templateId,
            confidence: detectedBrand.confidence
          }
        : undefined,
      useWebSearch
    })

    // Open EveryAI with the constructed prompt
    openEveryAI({
      prompt,
      additionInfo,
      skills: ['Slides']
    })

    // Close dialog
    onOpenChange(false)

    // Fallback: if EveryAI sidebar is not mounted, navigate directly
    setTimeout(() => {
      const everyAiMounted = Boolean(document.querySelector('[data-testid="every-ai-app"]'))
      if (!everyAiMounted) {
        console.log('[GeneratePresentationDialogChat] EveryAI sidebar not mounted, navigating directly')
        window.location.href = Navigation.PLATFORM_AI_CHAT
      }
    }, 500)
  }, [
    description,
    title,
    length,
    style,
    density,
    audience,
    themePreference,
    additionalRequirements,
    references,
    selectedTemplateId,
    templates,
    detectedBrand,
    useWebSearch,
    extractStyleFromReferences,
    onOpenChange
  ])

  // Get selected template object
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  const isValid = description.trim().length > 0 || title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-xl gba:max-h-[90vh] gba:p-0 gba:gap-0 gba:overflow-hidden gba:flex gba:flex-col"
        data-testid={testId}
      >
        {/* Header */}
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4 gba:flex-shrink-0">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight">{t('generate-title')}</DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('generate-description')}</p>
        </DialogHeader>

        <Separator className="gba:flex-shrink-0" />

        <div className="gba:px-6 gba:py-5 gba:space-y-5 gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
          {/* Title */}
          <div className="gba:space-y-2">
            <Label htmlFor="title" className="gba:text-sm gba:font-medium">
              {t('generate-presentation-title-label') || 'Presentation Title'}
            </Label>
            <Textarea
              id="title"
              placeholder={t('generate-presentation-title-placeholder') || 'e.g., Q4 Business Review'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              rows={1}
              disabled={false}
              className="gba:resize-none gba:text-sm"
              data-testid={`${testId}-title`}
            />
          </div>

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
              disabled={false}
              className="gba:resize-none gba:text-sm"
              data-testid={`${testId}-description`}
            />
          </div>

          {/* Detected Brand Alert */}
          {detectedBrand && useBrandedTemplate && (
            <div
              className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg gba:border gba:border-primary/30 gba:bg-primary/5"
              data-testid={`${testId}-brand-detected`}
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10">
                  <Building2 className="gba:w-4 gba:h-4 gba:text-primary" />
                </div>
                <div>
                  <p className="gba:text-sm gba:font-medium">
                    {t('generate-brand-detected') || 'Brand detected'}:{' '}
                    <span className="gba:text-primary">{detectedBrand.companyName}</span>
                  </p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {t('generate-brand-detected-desc') || 'Brand template will be applied automatically'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUseBrandedTemplate(false)
                  setDetectedBrand(null)
                  setThemePreference('auto')
                }}
                className="gba:text-xs gba:h-7"
                data-testid={`${testId}-brand-dismiss`}
              >
                <Undo2 className="gba:w-3 gba:h-3 gba:mr-1" />
                {t('generate-brand-dismiss') || 'Use different template'}
              </Button>
            </div>
          )}

          {/* Length selector - horizontal pills */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium">{t('generate-length')}</Label>
            <div className="gba:flex gba:gap-2">
              {LENGTH_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLength(opt.value)}
                  disabled={false}
                  className={`gba:flex-1 gba:py-2.5 gba:px-3 gba:rounded-lg gba:border gba:text-sm gba:transition-all gba:duration-150 gba:cursor-pointer ${
                    length === opt.value
                      ? 'gba:border-primary gba:bg-primary/5 gba:text-primary gba:font-medium'
                      : 'gba:border-border gba:bg-background hover:gba:border-muted-foreground/30 gba:text-foreground'
                  }`}
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

          {/* Template Selector */}
          <Collapsible open={templateSectionOpen} onOpenChange={setTemplateSectionOpen}>
            <div className="gba:rounded-lg gba:border gba:bg-muted/20">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  disabled={false}
                  className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:text-sm hover:gba:bg-muted/40 gba:transition-colors disabled:gba:opacity-50"
                  data-testid={`${testId}-template-toggle`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <LayoutTemplate className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <div className="gba:text-left">
                      <span className="gba:font-medium">{t('generate-use-template') || 'Use Template'}</span>
                      {selectedTemplate && (
                        <span className="gba:ml-2 gba:text-primary gba:text-xs">({selectedTemplate.name})</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform',
                      templateSectionOpen && 'gba:rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="gba:px-4 gba:pb-4 gba:space-y-3">
                  <Separator />

                  {/* Category Tabs */}
                  <Tabs
                    value={selectedCategory}
                    onValueChange={v => setSelectedCategory(v as TemplateCategory | 'all')}
                  >
                    <TabsList className="gba:w-full gba:justify-start gba:h-8">
                      {TEMPLATE_CATEGORIES.map(cat => (
                        <TabsTrigger
                          key={cat.value}
                          value={cat.value}
                          className="gba:text-xs gba:px-2 gba:py-1"
                          startIcon={cat.icon}
                          data-testid={`${testId}-template-category-${cat.value}`}
                        >
                          {t(cat.labelKey) || cat.value}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  {/* Template Grid */}
                  <ScrollArea className="gba:h-40" ref={templateScrollRef}>
                    {isLoadingTemplates ? (
                      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="gba:h-20 gba:rounded-md" />
                        ))}
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:text-sm">
                        {t('template-empty-title') || 'No templates found'}
                      </div>
                    ) : (
                      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                        {templates.slice(0, 9).map(template => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() =>
                              setSelectedTemplateId(selectedTemplateId === template.id ? null : template.id)
                            }
                            className={cn(
                              'gba:relative gba:rounded-md gba:border gba:p-2 gba:text-left gba:transition-all hover:gba:border-primary/50',
                              selectedTemplateId === template.id
                                ? 'gba:border-primary gba:bg-primary/5 gba:ring-1 gba:ring-primary'
                                : 'gba:border-border gba:bg-background'
                            )}
                            data-testid={`${testId}-template-${template.id}`}
                          >
                            <div className="gba:aspect-video gba:rounded gba:mb-1.5 gba:overflow-hidden gba:relative gba:bg-muted">
                              {templatePreviews[template.id] ? (
                                <div
                                  className="gba:absolute gba:inset-0"
                                  style={getBackgroundStyle(
                                    templatePreviews[template.id].background || { type: 'solid', color: '#ffffff' }
                                  )}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: 1280,
                                      height: 720,
                                      transform: 'scale(0.08)',
                                      transformOrigin: 'top left'
                                    }}
                                  >
                                    {(templatePreviews[template.id].elements || []).slice(0, 6).map(el => (
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
                                </div>
                              ) : (
                                <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
                                  <LayoutTemplate className="gba:w-5 gba:h-5 gba:text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <p className="gba:text-xs gba:font-medium gba:line-clamp-1">{template.name}</p>
                            <div className="gba:flex gba:items-center gba:gap-1 gba:mt-0.5">
                              <Badge variant="secondary" className="gba:text-[9px] gba:px-1 gba:py-0">
                                {template.slideCount} {template.slideCount === 1 ? 'slide' : 'slides'}
                              </Badge>
                            </div>
                            {selectedTemplateId === template.id && (
                              <div className="gba:absolute gba:top-1 gba:right-1 gba:w-4 gba:h-4 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
                                <Check className="gba:w-2.5 gba:h-2.5 gba:text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Clear selection */}
                  {selectedTemplateId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTemplateId(null)}
                      className="gba:w-full gba:text-xs"
                    >
                      <X className="gba:w-3 gba:h-3 gba:mr-1" />
                      {t('generate-clear-template') || 'Clear Template Selection'}
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Advanced Options */}
          <Collapsible open={advancedOptionsOpen} onOpenChange={setAdvancedOptionsOpen}>
            <div className="gba:rounded-lg gba:border gba:bg-muted/20">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  disabled={false}
                  className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:text-sm hover:gba:bg-muted/40 gba:transition-colors disabled:gba:opacity-50"
                  data-testid={`${testId}-advanced-toggle`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Settings2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <span className="gba:font-medium">{t('generate-advanced-options') || 'Advanced Options'}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform',
                      advancedOptionsOpen && 'gba:rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="gba:px-4 gba:pb-4 gba:space-y-4">
                  <Separator />

                  {/* Style/Tone */}
                  <div className="gba:space-y-2">
                    <Label className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                      <Sparkles className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                      {t('generate-style') || 'Style'}
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={style}
                      onValueChange={v => v && setStyle(v as PresentationStyle)}
                      variant="outline"
                      className="gba:w-full"
                      disabled={false}
                    >
                      {STYLE_OPTIONS.map(opt => (
                        <ToggleGroupItem
                          key={opt.value}
                          value={opt.value}
                          className="gba:flex-1 gba:text-sm"
                          data-testid={`${testId}-style-${opt.value}`}
                        >
                          {t(opt.labelKey) || opt.value}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  {/* Content Density */}
                  <div className="gba:space-y-2">
                    <Label className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                      <FileText className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                      {t('generate-density') || 'Content Density'}
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={density}
                      onValueChange={v => v && setDensity(v as ContentDensity)}
                      variant="outline"
                      className="gba:w-full"
                      disabled={false}
                    >
                      {DENSITY_OPTIONS.map(opt => (
                        <ToggleGroupItem
                          key={opt.value}
                          value={opt.value}
                          className="gba:flex-1 gba:text-sm"
                          data-testid={`${testId}-density-${opt.value}`}
                        >
                          {t(opt.labelKey) || opt.value}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  {/* Target Audience */}
                  <div className="gba:space-y-2">
                    <Label className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                      <Users className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                      {t('generate-audience') || 'Target Audience'}
                    </Label>
                    <RadioGroup
                      value={audience}
                      onValueChange={v => setAudience(v as TargetAudience)}
                      className="gba:grid gba:grid-cols-2 gba:gap-2"
                      disabled={false}
                    >
                      {AUDIENCE_OPTIONS.map(opt => (
                        <div key={opt.value} className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem
                            value={opt.value}
                            id={`audience-${opt.value}`}
                            data-testid={`${testId}-audience-${opt.value}`}
                          />
                          <Label
                            htmlFor={`audience-${opt.value}`}
                            className="gba:text-xs gba:cursor-pointer gba:font-normal"
                          >
                            {t(opt.labelKey) || opt.value}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Theme Preference */}
                  <div className="gba:space-y-2">
                    <Label className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                      <Moon className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                      {t('generate-theme-preference') || 'Theme'}
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={themePreference}
                      onValueChange={v => v && setThemePreference(v as ThemePreference)}
                      variant="outline"
                      className="gba:w-full"
                      disabled={false}
                    >
                      {THEME_PREFERENCE_OPTIONS.map(opt => (
                        <ToggleGroupItem
                          key={opt.value}
                          value={opt.value}
                          className="gba:flex-1 gba:text-sm"
                          data-testid={`${testId}-theme-${opt.value}`}
                        >
                          {t(opt.labelKey) || opt.value}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {t(
                        THEME_PREFERENCE_OPTIONS.find(o => o.value === themePreference)?.descKey ||
                          'generate-theme-auto-desc'
                      ) || 'Auto-detect theme from reference materials'}
                    </p>
                  </div>

                  {/* Extract Style from References */}
                  <div className="gba:flex gba:items-center gba:justify-between gba:py-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Palette className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                      <Label htmlFor="extract-style" className="gba:text-xs gba:cursor-pointer gba:font-normal">
                        {t('generate-extract-style') || 'Extract style from references'}
                      </Label>
                    </div>
                    <Switch
                      id="extract-style"
                      checked={extractStyleFromReferences}
                      onCheckedChange={setExtractStyleFromReferences}
                      disabled={references.length === 0}
                      data-testid={`${testId}-extract-style`}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Web Search Option */}
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
              disabled={false}
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
              disabled={false}
              className="gba:resize-none gba:text-sm"
              data-testid={`${testId}-requirements`}
            />
          </div>
        </div>

        <Separator className="gba:flex-shrink-0" />

        {/* Footer */}
        <DialogFooter className="gba:px-6 gba:py-4 gba:bg-muted/30 gba:flex-shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('generate-cancel')}
          </Button>
          <AiButton
            onClick={handleGenerate}
            disabled={!isValid}
            showIcon
            icon={<Wand2 className="gba:w-4 gba:h-4" />}
            iconPosition="before"
            data-testid={`${testId}-submit`}
          >
            {t('generate-button')}
          </AiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GeneratePresentationDialogChat
