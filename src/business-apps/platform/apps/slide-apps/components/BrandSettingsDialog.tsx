/**
 * BrandSettingsDialog Component
 *
 * Dialog for configuring brand identity settings for templates.
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  useTranslation
} from '@newwork/nw-design-system'
import { Building2, Palette, Image, FileText, Plus, X } from 'lucide-react'
import type {
  BrandIdentity,
  BrandLogo,
  BrandColors,
  BrandTypography,
  BrandFooter,
  LogoPosition,
  LogoSize
} from '../types/template'
import translations from '../_i18n'

/**
 * Sanitize URL to prevent XSS attacks.
 * Only allows http, https, and data:image URLs.
 */
const sanitizeImageUrl = (url: string): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('data:image/')) {
    return trimmed
  }
  return ''
}

export interface BrandSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBranding?: BrandIdentity
  onSave: (branding: BrandIdentity) => void
  'data-testid'?: string
}

const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: '#e91e8c',
  secondary: '#1a1a2e',
  accent: '#00d4aa',
  text: '#ffffff',
  mutedText: 'rgba(255,255,255,0.7)'
}

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' }
]

const LOGO_SIZES: { value: LogoSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
]

export const BrandSettingsDialog: React.FC<BrandSettingsDialogProps> = ({
  open,
  onOpenChange,
  initialBranding,
  onSave,
  'data-testid': testId = 'brand-settings-dialog'
}) => {
  const { t } = useTranslation(translations)

  const [companyName, setCompanyName] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [logo, setLogo] = useState<BrandLogo>({
    lightUrl: '',
    darkUrl: '',
    position: 'top-right',
    size: 'medium'
  })
  const [colors, setColors] = useState<BrandColors>(DEFAULT_BRAND_COLORS)
  const [typography, setTypography] = useState<BrandTypography>({})
  const [footer, setFooter] = useState<BrandFooter>({
    text: '',
    showOnAllSlides: true
  })
  const [activeTab, setActiveTab] = useState('identity')

  useEffect(() => {
    if (open && initialBranding) {
      setCompanyName(initialBranding.companyName || '')
      setKeywords(initialBranding.keywords || [])
      setLogo(
        initialBranding.logo || {
          lightUrl: '',
          darkUrl: '',
          position: 'top-right',
          size: 'medium'
        }
      )
      setColors(initialBranding.colors || DEFAULT_BRAND_COLORS)
      setTypography(initialBranding.typography || {})
      setFooter(initialBranding.footer || { text: '', showOnAllSlides: true })
    } else if (open) {
      setCompanyName('')
      setKeywords([])
      setLogo({
        lightUrl: '',
        darkUrl: '',
        position: 'top-right',
        size: 'medium'
      })
      setColors(DEFAULT_BRAND_COLORS)
      setTypography({})
      setFooter({ text: '', showOnAllSlides: true })
    }
  }, [open, initialBranding])

  const handleAddKeyword = useCallback(() => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }, [keywordInput, keywords])

  const handleRemoveKeyword = useCallback(
    (keyword: string) => {
      setKeywords(keywords.filter(k => k !== keyword))
    },
    [keywords]
  )

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddKeyword()
      }
    },
    [handleAddKeyword]
  )

  const handleColorChange = useCallback((field: keyof BrandColors, value: string) => {
    setColors(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(() => {
    const branding: BrandIdentity = {
      companyName,
      keywords,
      logo,
      colors,
      typography: Object.keys(typography).length > 0 ? typography : undefined,
      footer: footer.text ? footer : undefined
    }
    onSave(branding)
    onOpenChange(false)
  }, [companyName, keywords, logo, colors, typography, footer, onSave, onOpenChange])

  const isValid = companyName.trim().length > 0 && keywords.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight gba:flex gba:items-center gba:gap-2">
            <Building2 className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('brand-settings-title') || 'Brand Settings'}
          </DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('brand-settings-description') || 'Configure your brand identity for automatic template matching'}
          </p>
        </DialogHeader>

        <Separator />

        <div className="gba:px-6 gba:py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
              <TabsTrigger value="identity" className="gba:flex gba:items-center gba:gap-2">
                <Building2 className="gba:w-4 gba:h-4" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="colors" className="gba:flex gba:items-center gba:gap-2">
                <Palette className="gba:w-4 gba:h-4" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="logo" className="gba:flex gba:items-center gba:gap-2">
                <Image className="gba:w-4 gba:h-4" />
                Logo
              </TabsTrigger>
              <TabsTrigger value="footer" className="gba:flex gba:items-center gba:gap-2">
                <FileText className="gba:w-4 gba:h-4" />
                Footer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="gba:space-y-4 gba:mt-4">
              <div className="gba:space-y-2">
                <Label htmlFor="company-name">{t('brand-company-name') || 'Company Name'} *</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g., NEWWORK"
                  data-testid="brand-company-name-input"
                />
              </div>

              <div className="gba:space-y-2">
                <Label>{t('brand-keywords') || 'Keywords'} *</Label>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('brand-keywords-help') || 'Add keywords that identify your company in presentation topics'}
                </p>
                <div className="gba:flex gba:gap-2">
                  <Input
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="e.g., NEWWORK, NW Software, EveryOffice"
                    data-testid="brand-keyword-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddKeyword}
                    disabled={!keywordInput.trim()}
                    data-testid="brand-add-keyword-button"
                  >
                    <Plus className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
                    {keywords.map(keyword => (
                      <div
                        key={keyword}
                        className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:bg-primary/10 gba:text-primary gba:rounded-md gba:text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="gba:ml-1 gba:hover:text-primary/70"
                        >
                          <X className="gba:w-3 gba:h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="colors" className="gba:space-y-4 gba:mt-4">
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <Label htmlFor="color-primary">{t('brand-color-primary') || 'Primary Color'}</Label>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <input
                      type="color"
                      id="color-primary"
                      value={colors.primary}
                      onChange={e => handleColorChange('primary', e.target.value)}
                      className="gba:w-10 gba:h-10 gba:rounded gba:border gba:cursor-pointer"
                    />
                    <Input
                      value={colors.primary}
                      onChange={e => handleColorChange('primary', e.target.value)}
                      placeholder="#e91e8c"
                      className="gba:flex-1"
                    />
                  </div>
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="color-secondary">{t('brand-color-secondary') || 'Secondary Color'}</Label>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <input
                      type="color"
                      id="color-secondary"
                      value={colors.secondary}
                      onChange={e => handleColorChange('secondary', e.target.value)}
                      className="gba:w-10 gba:h-10 gba:rounded gba:border gba:cursor-pointer"
                    />
                    <Input
                      value={colors.secondary}
                      onChange={e => handleColorChange('secondary', e.target.value)}
                      placeholder="#1a1a2e"
                      className="gba:flex-1"
                    />
                  </div>
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="color-accent">{t('brand-color-accent') || 'Accent Color'}</Label>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <input
                      type="color"
                      id="color-accent"
                      value={colors.accent}
                      onChange={e => handleColorChange('accent', e.target.value)}
                      className="gba:w-10 gba:h-10 gba:rounded gba:border gba:cursor-pointer"
                    />
                    <Input
                      value={colors.accent}
                      onChange={e => handleColorChange('accent', e.target.value)}
                      placeholder="#00d4aa"
                      className="gba:flex-1"
                    />
                  </div>
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="color-text">{t('brand-color-text') || 'Text Color'}</Label>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <input
                      type="color"
                      id="color-text"
                      value={colors.text}
                      onChange={e => handleColorChange('text', e.target.value)}
                      className="gba:w-10 gba:h-10 gba:rounded gba:border gba:cursor-pointer"
                    />
                    <Input
                      value={colors.text}
                      onChange={e => handleColorChange('text', e.target.value)}
                      placeholder="#ffffff"
                      className="gba:flex-1"
                    />
                  </div>
                </div>
              </div>

              <Card className="gba:p-4">
                <Label className="gba:text-sm gba:font-medium gba:mb-3 gba:block">
                  {t('brand-color-preview') || 'Preview'}
                </Label>
                <div
                  className="gba:h-24 gba:rounded-lg gba:flex gba:items-center gba:justify-center"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <span className="gba:text-lg gba:font-semibold" style={{ color: colors.text }}>
                    {companyName || 'Company Name'}
                  </span>
                  <span
                    className="gba:ml-2 gba:px-2 gba:py-1 gba:rounded gba:text-sm"
                    style={{ backgroundColor: colors.primary, color: colors.text }}
                  >
                    Primary
                  </span>
                  <span
                    className="gba:ml-2 gba:px-2 gba:py-1 gba:rounded gba:text-sm"
                    style={{ backgroundColor: colors.accent, color: colors.secondary }}
                  >
                    Accent
                  </span>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="logo" className="gba:space-y-4 gba:mt-4">
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <Label htmlFor="logo-light">{t('brand-logo-light') || 'Light Logo (for dark backgrounds)'}</Label>
                  <Input
                    id="logo-light"
                    value={logo.lightUrl}
                    onChange={e => setLogo({ ...logo, lightUrl: e.target.value })}
                    placeholder="https://example.com/logo-white.svg"
                    data-testid="brand-logo-light-input"
                  />
                  {sanitizeImageUrl(logo.lightUrl) && (
                    <div className="gba:p-2 gba:bg-gray-800 gba:rounded gba:flex gba:justify-center">
                      {/* deepcode ignore DOMXSS: sanitizeImageUrl validates URL protocol */}
                      <img
                        src={sanitizeImageUrl(logo.lightUrl)}
                        alt="Light logo preview"
                        className="gba:max-h-12 gba:object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="logo-dark">{t('brand-logo-dark') || 'Dark Logo (for light backgrounds)'}</Label>
                  <Input
                    id="logo-dark"
                    value={logo.darkUrl}
                    onChange={e => setLogo({ ...logo, darkUrl: e.target.value })}
                    placeholder="https://example.com/logo-dark.svg"
                    data-testid="brand-logo-dark-input"
                  />
                  {sanitizeImageUrl(logo.darkUrl) && (
                    <div className="gba:p-2 gba:bg-gray-100 gba:rounded gba:flex gba:justify-center">
                      {/* deepcode ignore DOMXSS: sanitizeImageUrl validates URL protocol */}
                      <img
                        src={sanitizeImageUrl(logo.darkUrl)}
                        alt="Dark logo preview"
                        className="gba:max-h-12 gba:object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <Label>{t('brand-logo-position') || 'Position'}</Label>
                  <Select
                    value={logo.position}
                    onValueChange={(value: LogoPosition) => setLogo({ ...logo, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGO_POSITIONS.map(pos => (
                        <SelectItem key={pos.value} value={pos.value}>
                          {pos.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="gba:space-y-2">
                  <Label>{t('brand-logo-size') || 'Size'}</Label>
                  <Select value={logo.size} onValueChange={(value: LogoSize) => setLogo({ ...logo, size: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGO_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="footer" className="gba:space-y-4 gba:mt-4">
              <div className="gba:space-y-2">
                <Label htmlFor="footer-text">{t('brand-footer-text') || 'Footer Text'}</Label>
                <Input
                  id="footer-text"
                  value={footer.text}
                  onChange={e => setFooter({ ...footer, text: e.target.value })}
                  placeholder="e.g., © 2026 NEWWORK Software GmbH"
                  data-testid="brand-footer-text-input"
                />
              </div>

              <div className="gba:flex gba:items-center gba:gap-3">
                <Switch
                  id="footer-all-slides"
                  checked={footer.showOnAllSlides}
                  onCheckedChange={checked => setFooter({ ...footer, showOnAllSlides: checked })}
                />
                <Label htmlFor="footer-all-slides" className="gba:cursor-pointer">
                  {t('brand-footer-all-slides') || 'Show on all slides'}
                </Label>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Separator />

        <DialogFooter className="gba:px-6 gba:py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={!isValid} data-testid="brand-settings-save-button">
            {t('save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BrandSettingsDialog
