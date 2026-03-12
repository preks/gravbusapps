/**
 * GeneratePresentationDialog Component
 *
 * Dialog for AI-powered presentation generation.
 * Modern, crisp design with clean visual hierarchy.
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
  Spinner,
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
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperSeparator,
  cn,
  useTranslation
} from '@newwork/nw-design-system'
import {
  AlertCircle,
  Globe,
  Search,
  Layers,
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
  Moon
} from 'lucide-react'
import { ContentAttachmentPicker } from './ContentAttachmentPicker'
import { useSlideGeneration, type MatchedTemplateInfo } from '../hooks/useSlideGeneration'
import type { SlideData } from './slideElements'
import { gradientToCss } from './slideElements'
import type { ContentReference, GenerationOptions } from '../services/SlideGenerationService'
import type { SlideTemplateSummary, TemplateCategory } from '../types'
import { SlidesApiService } from '../services/SlidesApiService'
import translations from '../_i18n'

export interface GeneratePresentationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (slides: SlideData[], title: string, matchedTemplate?: MatchedTemplateInfo) => void
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

  // Generation hook
  const { isGenerating, phase, error, progressMessage, generate, reset } = useSlideGeneration({
    accessToken,
    onSuccess: (slides, title, _sources, matchedTemplate) => {
      onGenerate(slides, title, matchedTemplate)
      onOpenChange(false)
    }
  })

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
      reset()
    }
  }, [open, reset])

  // Handle form submission
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return

    // Build style context for additional requirements
    const styleContext = style !== 'professional' ? `Style: ${style}` : ''
    const densityContext = density !== 'balanced' ? `Content density: ${density}` : ''
    const audienceContext = audience !== 'general' ? `Target audience: ${audience}` : ''
    const themeContext = themePreference !== 'auto' ? `Preferred theme: ${themePreference} (dark/light theme)` : ''

    const contextParts = [styleContext, densityContext, audienceContext, themeContext].filter(Boolean)
    const combinedRequirements = [additionalRequirements.trim(), ...contextParts].filter(Boolean).join('\n')

    const options: GenerationOptions = {
      description: description.trim(),
      length,
      additionalRequirements: combinedRequirements || undefined,
      references: references.length > 0 ? references : undefined,
      useWebSearch,
      templateId: selectedTemplateId || undefined,
      stylePreference: themePreference !== 'auto' ? themePreference : undefined,
      extractStyleFromReferences: references.length > 0 ? extractStyleFromReferences : undefined
    }

    await generate(options)
  }, [
    description,
    length,
    additionalRequirements,
    references,
    useWebSearch,
    selectedTemplateId,
    style,
    density,
    audience,
    themePreference,
    extractStyleFromReferences,
    generate
  ])

  // Get selected template object
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

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

          {/* Template Selector */}
          <Collapsible open={templateSectionOpen} onOpenChange={setTemplateSectionOpen}>
            <div className="gba:rounded-lg gba:border gba:bg-muted/20">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  disabled={isGenerating}
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
                                  style={{
                                    backgroundColor: templatePreviews[template.id].background?.color || '#fff',
                                    background: templatePreviews[template.id].background?.gradient
                                      ? gradientToCss(templatePreviews[template.id].background!.gradient!)
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
                  disabled={isGenerating}
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
                      disabled={isGenerating}
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
                      disabled={isGenerating}
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
                      disabled={isGenerating}
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
                      disabled={isGenerating}
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
                      disabled={isGenerating || references.length === 0}
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
              {/* Phase stepper using NewWork Stepper component */}
              <Stepper value={phase} linear={false} className="gba:mb-4">
                {useWebSearch && (
                  <>
                    <StepperItem value="research">
                      <StepperTrigger value="research" disabled className="gba:cursor-default">
                        <StepperIndicator value="research">
                          {getPhaseStatus('research') === 'active' ? (
                            <Spinner size="sm" />
                          ) : (
                            <Search className="gba:w-4 gba:h-4" />
                          )}
                        </StepperIndicator>
                        <StepperTitle>{t('generate-research')}</StepperTitle>
                      </StepperTrigger>
                    </StepperItem>
                    <StepperSeparator />
                  </>
                )}
                <StepperItem value="generation">
                  <StepperTrigger value="generation" disabled className="gba:cursor-default">
                    <StepperIndicator value="generation">
                      {getPhaseStatus('generate') === 'active' ? (
                        <Spinner size="sm" />
                      ) : (
                        <Layers className="gba:w-4 gba:h-4" />
                      )}
                    </StepperIndicator>
                    <StepperTitle>{t('generate-generate')}</StepperTitle>
                  </StepperTrigger>
                </StepperItem>
                <StepperSeparator />
                <StepperItem value="validation">
                  <StepperTrigger value="validation" disabled className="gba:cursor-default">
                    <StepperIndicator value="validation">
                      {getPhaseStatus('validate') === 'active' ? (
                        <Spinner size="sm" />
                      ) : (
                        <Check className="gba:w-4 gba:h-4" />
                      )}
                    </StepperIndicator>
                    <StepperTitle>{t('generate-validate')}</StepperTitle>
                  </StepperTrigger>
                </StepperItem>
              </Stepper>

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

export default GeneratePresentationDialog
