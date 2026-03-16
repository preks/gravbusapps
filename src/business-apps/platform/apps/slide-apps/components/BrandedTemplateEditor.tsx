/**
 * BrandedTemplateEditor Component
 *
 * Comprehensive editor for creating and editing branded templates.
 * Combines template content editing with brand identity configuration.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  Badge,
  Alert,
  AlertDescription,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Building2,
  Plus,
  Eye,
  Save,
  LayoutTemplate,
  Settings,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Wand2,
  Sparkles
} from 'lucide-react'
import type { SlideData, SlideBackground } from './slideElements'
import type { SlideTemplate, BrandIdentity, TemplateCategory, SlideTemplateMeta } from '../types/template'
import { gradientToCss } from './slideElements'
import { BrandSettingsDialog } from './BrandSettingsDialog'
import { SlideMetaEditor } from './SlideMetaEditor'
import { inferPurposeFromSlide, createDefaultMeta, PURPOSE_DEFINITIONS } from '../services/SlideMetadataService'
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

export interface BrandedTemplateEditorProps {
  template?: SlideTemplate
  slides: SlideData[]
  themeId: string
  onSave: (template: Partial<SlideTemplate>) => Promise<void>
  onCancel?: () => void
  'data-testid'?: string
}

export const BrandedTemplateEditor: React.FC<BrandedTemplateEditorProps> = ({
  template,
  slides,
  themeId,
  onSave,
  onCancel,
  'data-testid': testId = 'branded-template-editor'
}) => {
  const { t } = useTranslation(translations)
  const isEditing = !!template

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('branded')
  const [isPublic, setIsPublic] = useState(false)
  const [branding, setBranding] = useState<BrandIdentity | null>(null)
  const [slideMeta, setSlideMeta] = useState<SlideTemplateMeta[]>([])
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null)
  const [isInferring, setIsInferring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBrandSettings, setShowBrandSettings] = useState(false)

  useEffect(() => {
    if (template) {
      setName(template.name || '')
      setDescription(template.description || '')
      setCategory(template.category || 'branded')
      setIsPublic(template.isPublic || false)
      setBranding(template.branding || template.contentJson?._templateMeta?.branding || null)
      setSlideMeta(template.slideMeta || template.contentJson?._templateMeta?.slideMeta || [])
    } else {
      setName('')
      setDescription('')
      setCategory('branded')
      setIsPublic(false)
      setBranding(null)
      setSlideMeta([])
    }
  }, [template])

  // Auto-infer slide purposes when slides change and no metadata exists
  useEffect(() => {
    if (slides.length > 0 && slideMeta.length === 0) {
      handleAutoDetectAll()
    }
  }, [slides])

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
      if (slides[index]) {
        const purpose = inferPurposeFromSlide(slides[index], index, slides.length)
        const newMeta = createDefaultMeta(purpose)
        setSlideMeta(prev => {
          const updated = [...prev]
          updated[index] = newMeta
          return updated
        })
      }
    },
    [slides]
  )

  const handleSlideMetaChange = useCallback((index: number, newMeta: SlideTemplateMeta) => {
    setSlideMeta(prev => {
      const updated = [...prev]
      updated[index] = newMeta
      return updated
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError(t('template-name-required') || 'Template name is required')
      return
    }

    if (!branding) {
      setError(t('brand-settings-required') || 'Brand settings are required for branded templates')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        isPublic,
        slideMeta: slideMeta.length > 0 ? slideMeta : undefined,
        contentJson: {
          slides,
          themeId,
          _templateMeta: {
            isTemplate: true,
            category,
            isPublic,
            isBranded: true,
            branding,
            slideMeta: slideMeta.length > 0 ? slideMeta : undefined
          }
        },
        branding,
        isBranded: true
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('template-save-error') || 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }, [name, description, category, isPublic, branding, slideMeta, slides, themeId, onSave, t])

  const handleBrandingUpdate = useCallback((newBranding: BrandIdentity) => {
    setBranding(newBranding)
  }, [])

  const isValid = name.trim().length > 0 && branding !== null

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h2 className="gba:text-2xl gba:font-semibold gba:flex gba:items-center gba:gap-2">
            <Building2 className="gba:w-6 gba:h-6 gba:text-primary" />
            {isEditing
              ? t('edit-branded-template') || 'Edit Branded Template'
              : t('create-branded-template') || 'Create Branded Template'}
          </h2>
          <p className="gba:text-muted-foreground gba:mt-1">
            {t('branded-template-description') ||
              'Create a template with your company branding for AI-powered presentations'}
          </p>
        </div>
        <div className="gba:flex gba:gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {t('cancel') || 'Cancel'}
            </Button>
          )}
          <Button onClick={handleSave} disabled={!isValid || isSaving} data-testid="branded-template-save-button">
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('save-template') || 'Save Template'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="gba:w-4 gba:h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="gba:grid gba:grid-cols-3 gba:gap-6">
        {/* Left: Template Info */}
        <div className="gba:col-span-2 gba:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <LayoutTemplate className="gba:w-5 gba:h-5" />
                {t('template-info') || 'Template Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:space-y-2">
                <Label htmlFor="template-name">{t('template-name') || 'Name'} *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('template-name-placeholder') || 'e.g., NEWWORK Corporate Template'}
                  data-testid="template-name-input"
                />
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="template-description">{t('template-description-label') || 'Description'}</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('template-description-placeholder') || 'Describe when to use this template...'}
                  rows={3}
                />
              </div>

              <div className="gba:flex gba:items-center gba:gap-3">
                <Switch id="template-public" checked={isPublic} onCheckedChange={setIsPublic} />
                <Label htmlFor="template-public" className="gba:cursor-pointer">
                  {t('template-public') || 'Make available to all users'}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Slides Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Eye className="gba:w-5 gba:h-5" />
                {t('slides-preview') || 'Slides Preview'} ({slides.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:flex gba:gap-2 gba:overflow-x-auto gba:pb-2">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="gba:flex-shrink-0 gba:rounded gba:border gba:overflow-hidden gba:relative"
                    style={{ width: 120, aspectRatio: '16/9' }}
                  >
                    <div
                      className="gba:absolute gba:inset-0"
                      style={getBackgroundStyle(slide.background || { type: 'solid', color: '#ffffff' })}
                    />
                    <div
                      className="gba:relative"
                      style={{
                        width: 1280,
                        height: 720,
                        transform: `scale(${120 / 1280})`,
                        transformOrigin: 'top left'
                      }}
                    >
                      {slide.elements
                        .filter(el => el.type === 'text')
                        .slice(0, 3)
                        .map(el => (
                          <div
                            key={el.id}
                            className="gba:absolute gba:truncate"
                            style={{
                              left: el.position.x,
                              top: el.position.y,
                              width: el.size.width,
                              fontSize: '24px',
                              color: (el as { color?: string }).color || '#000'
                            }}
                          >
                            {(el as { content?: string }).content?.substring(0, 50)}
                          </div>
                        ))}
                    </div>
                    <div className="gba:absolute gba:bottom-1 gba:right-1 gba:text-xs gba:bg-black/50 gba:text-white gba:px-1 gba:rounded">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Slide Purpose Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Sparkles className="gba:w-5 gba:h-5" />
                  {t('template-slide-roles') || 'Slide Roles'}
                </span>
                {slideMeta.length > 0 && (
                  <Badge variant="outline" className="gba:text-green-600">
                    <CheckCircle2 className="gba:w-3 gba:h-3 gba:mr-1" />
                    {slideMeta.length} {t('configured') || 'configured'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('template-slide-roles-desc') ||
                  'Define the purpose of each slide to help AI match content intelligently'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <p className="gba:text-sm gba:text-muted-foreground">
                  {t('template-auto-detect-description') || 'AI will analyze slide content to suggest purposes'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDetectAll}
                  disabled={isInferring || isSaving}
                  data-testid={`${testId}-auto-detect-all`}
                >
                  {isInferring ? (
                    <>
                      <span className="gba:animate-spin gba:mr-2">⟳</span>
                      {t('template-inferring') || 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('template-auto-detect-all') || 'Auto-detect All'}
                    </>
                  )}
                </Button>
              </div>

              <div className="gba:space-y-2 gba:max-h-[400px] gba:overflow-y-auto gba:pr-1">
                {slides.map((slide, index) => {
                  const meta = slideMeta[index] || createDefaultMeta('content')
                  const isExpanded = expandedSlide === index
                  return (
                    <Collapsible
                      key={slide.id}
                      open={isExpanded}
                      onOpenChange={open => setExpandedSlide(open ? index : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:hover:bg-muted/50 gba:transition-colors gba:text-left"
                          disabled={isSaving}
                        >
                          <div
                            className="gba:w-16 gba:rounded gba:overflow-hidden gba:flex-shrink-0 gba:border"
                            style={{ aspectRatio: '16/9' }}
                          >
                            <div
                              className="gba:w-full gba:h-full"
                              style={getBackgroundStyle(slide.background || { type: 'solid', color: '#ffffff' })}
                            />
                          </div>
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:text-sm gba:font-medium">
                              {t('template-slide-number', { number: index + 1 }) || `Slide ${index + 1}`}
                            </div>
                            <Badge variant="secondary" className="gba:text-xs gba:mt-1">
                              {t(`slide-purpose-${meta.purpose}`) || PURPOSE_DEFINITIONS[meta.purpose].label}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform ${isExpanded ? 'gba:rotate-180' : ''}`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="gba:pt-2 gba:pl-4">
                        <SlideMetaEditor
                          slideMeta={meta}
                          slideIndex={index}
                          slidePreview={slide}
                          onChange={newMeta => handleSlideMetaChange(index, newMeta)}
                          onAutoDetect={() => handleAutoDetectSlide(index)}
                          disabled={isSaving}
                          data-testid={`${testId}-slide-${index}-meta-editor`}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Brand Settings */}
        <div className="gba:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Building2 className="gba:w-5 gba:h-5" />
                  {t('brand-identity') || 'Brand Identity'}
                </span>
                {branding && (
                  <Badge variant="outline" className="gba:text-green-600">
                    <CheckCircle2 className="gba:w-3 gba:h-3 gba:mr-1" />
                    {t('configured') || 'Configured'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('brand-identity-description') || 'Configure how AI will recognize and apply your brand'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              {branding ? (
                <>
                  <div className="gba:space-y-3">
                    <div>
                      <Label className="gba:text-xs gba:text-muted-foreground">{t('company') || 'Company'}</Label>
                      <p className="gba:font-medium">{branding.companyName}</p>
                    </div>

                    <div>
                      <Label className="gba:text-xs gba:text-muted-foreground">{t('keywords') || 'Keywords'}</Label>
                      <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
                        {branding.keywords.map(kw => (
                          <Badge key={kw} variant="secondary" className="gba:text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="gba:text-xs gba:text-muted-foreground">{t('colors') || 'Colors'}</Label>
                      <div className="gba:flex gba:gap-2 gba:mt-1">
                        <div
                          className="gba:w-6 gba:h-6 gba:rounded gba:border"
                          style={{ backgroundColor: branding.colors.primary }}
                          title="Primary"
                        />
                        <div
                          className="gba:w-6 gba:h-6 gba:rounded gba:border"
                          style={{ backgroundColor: branding.colors.secondary }}
                          title="Secondary"
                        />
                        <div
                          className="gba:w-6 gba:h-6 gba:rounded gba:border"
                          style={{ backgroundColor: branding.colors.accent }}
                          title="Accent"
                        />
                      </div>
                    </div>

                    {branding.logo && (branding.logo.lightUrl || branding.logo.darkUrl) && (
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('logo') || 'Logo'}</Label>
                        <div className="gba:mt-1 gba:p-2 gba:bg-muted gba:rounded gba:flex gba:justify-center">
                          <img
                            src={branding.logo.darkUrl || branding.logo.lightUrl}
                            alt="Brand logo"
                            className="gba:max-h-8 gba:object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" className="gba:w-full" onClick={() => setShowBrandSettings(true)}>
                    <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('edit-brand-settings') || 'Edit Brand Settings'}
                  </Button>
                </>
              ) : (
                <div className="gba:text-center gba:py-6">
                  <Building2 className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground gba:mb-3" />
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                    {t('no-brand-configured') || 'No brand identity configured yet'}
                  </p>
                  <Button onClick={() => setShowBrandSettings(true)}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('configure-brand') || 'Configure Brand'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-sm">{t('quick-tips') || 'Quick Tips'}</CardTitle>
            </CardHeader>
            <CardContent className="gba:text-sm gba:text-muted-foreground gba:space-y-2">
              <p>
                <strong>{t('keywords-tip-title') || 'Keywords:'}</strong>{' '}
                {t('keywords-tip') || 'Add variations of your company name that users might type'}
              </p>
              <p>
                <strong>{t('logo-tip-title') || 'Logo:'}</strong>{' '}
                {t('logo-tip') || 'Provide both light and dark versions for different slide backgrounds'}
              </p>
              <p>
                <strong>{t('colors-tip-title') || 'Colors:'}</strong>{' '}
                {t('colors-tip') || 'Use your official brand colors for consistency'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Brand Settings Dialog */}
      <BrandSettingsDialog
        open={showBrandSettings}
        onOpenChange={setShowBrandSettings}
        initialBranding={branding || undefined}
        onSave={handleBrandingUpdate}
      />
    </div>
  )
}

export default BrandedTemplateEditor
