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
  useTranslation
} from '@newwork/nw-design-system'
import { LayoutTemplate, Briefcase, Palette, Minimize2, Folder, Building2 } from 'lucide-react'
import type { SlideData, SlideBackground } from './slideElements'
import type { TemplateCategory, BrandIdentity } from '../types'
import { SlidesApiService } from '../services/SlidesApiService'
import { gradientToCss } from './slideElements'
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
    }
  }, [open])

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
        contentJson: {
          slides,
          themeId
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
    onSaved,
    onOpenChange,
    t
  ])

  const isValid = name.trim().length > 0 && (category !== 'branded' || brandCompanyName.trim().length > 0)

  const thumbScale = 80 / 1280

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : onOpenChange}>
      <DialogContent className="gba:max-w-lg gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight gba:flex gba:items-center gba:gap-2">
            <LayoutTemplate className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('template-save-title') || 'Save as Template'}
          </DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('template-save-description') || 'Save your current slides as a reusable template'}
          </p>
        </DialogHeader>

        <Separator />

        <div className="gba:px-6 gba:py-5 gba:space-y-5">
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

        <Separator />

        <DialogFooter className="gba:px-6 gba:py-4">
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
