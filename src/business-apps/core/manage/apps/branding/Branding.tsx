import React, { useCallback, useMemo } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageLayout,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { FloppyDiskIcon, PaintBrushIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { BRANDING_LOGOMARK_ACCEPT, BRANDING_WORDMARK_ACCEPT } from './brandingFileUtils'
import { BrandingWordmarkField } from './components/BrandingWordmarkField'
import { useBrandingWordmark } from './hooks/useBrandingWordmark'
import { useBrandingLogomark } from './hooks/useBrandingLogomark'

interface FutureFeatureCardProps {
  badgeLabel: string
  title: string
  description: string
  helperText: string
  children: React.ReactNode
}

const FUTURE_COLOR_SWATCHES = [
  { color: '#111827', labelKey: 'branding-future-color-primary' },
  { color: '#64748B', labelKey: 'branding-future-color-secondary' },
  { color: '#CBD5E1', labelKey: 'branding-future-color-accent' }
] as const

const FutureFeatureCard: React.FC<FutureFeatureCardProps> = ({
  badgeLabel,
  title,
  description,
  helperText,
  children
}) => {
  return (
    <Card className="gba:opacity-50 gba:border-dashed">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="secondary">{badgeLabel}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {children}
        <p className="gba:text-sm gba:text-muted-foreground">{helperText}</p>
      </CardContent>
    </Card>
  )
}

export const Branding: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)

  const {
    previewWordmarkUrl,
    hasStoredWordmark,
    hasUnsavedChanges: wordmarkHasUnsavedChanges,
    isLoading: wordmarkIsLoading,
    isSaving: wordmarkIsSaving,
    resetChanges: resetWordmarkChanges,
    removeWordmark,
    selectWordmark,
    saveWordmark
  } = useBrandingWordmark(context)

  const {
    previewLogomarkUrl,
    hasStoredLogomark,
    hasUnsavedChanges: logomarkHasUnsavedChanges,
    isLoading: logomarkIsLoading,
    isSaving: logomarkIsSaving,
    resetChanges: resetLogomarkChanges,
    removeLogomark,
    selectLogomark,
    saveLogomark
  } = useBrandingLogomark(context)

  const displayedWordmarkUrl = previewWordmarkUrl ?? '/wordmark.svg'
  const displayedLogomarkUrl = previewLogomarkUrl ?? '/logomark.svg'

  const handleWordmarkFileSelect = useCallback(
    (file: File) => {
      selectWordmark(file)
    },
    [selectWordmark]
  )

  const handleLogomarkFileSelect = useCallback(
    (file: File) => {
      selectLogomark(file)
    },
    [selectLogomark]
  )

  const handleSaveWordmark = useCallback(async () => {
    try {
      await saveWordmark()
    } catch {
      /* badge reflects state */
    }
  }, [saveWordmark])

  const handleSaveLogomark = useCallback(async () => {
    try {
      await saveLogomark()
    } catch {
      /* badge reflects state */
    }
  }, [saveLogomark])

  const wordmarkIsLive = !wordmarkHasUnsavedChanges && !!previewWordmarkUrl
  const logomarkIsLive = !logomarkHasUnsavedChanges && !!previewLogomarkUrl

  const wordmarkStatusLabel = useMemo(() => {
    if (wordmarkHasUnsavedChanges && !previewWordmarkUrl && hasStoredWordmark)
      return t('branding-section-wordmark-status-pending-delete')
    if (wordmarkHasUnsavedChanges) return t('branding-section-wordmark-status-unsaved')
    if (previewWordmarkUrl) return t('branding-section-wordmark-status-live')
    return t('branding-section-wordmark-status-empty')
  }, [hasStoredWordmark, wordmarkHasUnsavedChanges, previewWordmarkUrl, t])

  const logomarkStatusLabel = useMemo(() => {
    if (logomarkHasUnsavedChanges && !previewLogomarkUrl && hasStoredLogomark)
      return t('branding-section-logomark-status-pending-delete')
    if (logomarkHasUnsavedChanges) return t('branding-section-logomark-status-unsaved')
    if (previewLogomarkUrl) return t('branding-section-logomark-status-live')
    return t('branding-section-logomark-status-empty')
  }, [hasStoredLogomark, logomarkHasUnsavedChanges, previewLogomarkUrl, t])

  return (
    <div data-testid="branding-app" className="gba:w-full">
      <PageLayout
        headerIcon={PaintBrushIcon}
        headerTitle={t('branding-title')}
        headerDescription={t('branding-description')}
        className="gba:min-h-screen"
      >
        <div className="gba:space-y-6 gba:p-1">
          <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
            {/* Wordmark */}
            <Card>
              <CardHeader>
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <PaintBrushIcon className="gba:h-4 gba:w-4" />
                    <CardTitle>{t('branding-section-wordmark-title')}</CardTitle>
                  </div>
                  <Badge variant={wordmarkIsLive ? 'success' : 'secondary'}>{wordmarkStatusLabel}</Badge>
                </div>
                <CardDescription>{t('branding-section-wordmark-description')}</CardDescription>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <BrandingWordmarkField
                  accept={BRANDING_WORDMARK_ACCEPT}
                  buttonLabel={t('branding-wordmark-select-file')}
                  disabled={wordmarkIsSaving}
                  isLoading={wordmarkIsLoading}
                  onFileSelect={handleWordmarkFileSelect}
                  previewAlt={t('branding-section-wordmark-title')}
                  previewUrl={displayedWordmarkUrl}
                />
                <p className="gba:text-sm gba:text-muted-foreground">{t('branding-wordmark-guidelines')}</p>
                <div className="gba:flex gba:flex-wrap gba:gap-3">
                  <Button
                    onClick={handleSaveWordmark}
                    disabled={!wordmarkHasUnsavedChanges || wordmarkIsSaving || wordmarkIsLoading}
                  >
                    {wordmarkIsSaving ? <Spinner size="sm" /> : <FloppyDiskIcon className="gba:h-4 gba:w-4 gba:mr-2" />}
                    {t('branding-wordmark-save')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={resetWordmarkChanges}
                    disabled={!wordmarkHasUnsavedChanges || wordmarkIsSaving}
                  >
                    {t('branding-wordmark-reset')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={removeWordmark}
                    disabled={(!hasStoredWordmark && !previewWordmarkUrl) || wordmarkIsSaving}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                    {t('branding-wordmark-remove')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logomark */}
            <Card>
              <CardHeader>
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <PaintBrushIcon className="gba:h-4 gba:w-4" />
                    <CardTitle>{t('branding-section-logomark-title')}</CardTitle>
                  </div>
                  <Badge variant={logomarkIsLive ? 'success' : 'secondary'}>{logomarkStatusLabel}</Badge>
                </div>
                <CardDescription>{t('branding-section-logomark-description')}</CardDescription>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <BrandingWordmarkField
                  accept={BRANDING_LOGOMARK_ACCEPT}
                  buttonLabel={t('branding-logomark-select-file')}
                  disabled={logomarkIsSaving}
                  isLoading={logomarkIsLoading}
                  onFileSelect={handleLogomarkFileSelect}
                  previewAlt={t('branding-section-logomark-title')}
                  previewUrl={displayedLogomarkUrl}
                />
                <p className="gba:text-sm gba:text-muted-foreground">{t('branding-logomark-guidelines')}</p>
                <div className="gba:flex gba:flex-wrap gba:gap-3">
                  <Button
                    onClick={handleSaveLogomark}
                    disabled={!logomarkHasUnsavedChanges || logomarkIsSaving || logomarkIsLoading}
                  >
                    {logomarkIsSaving ? <Spinner size="sm" /> : <FloppyDiskIcon className="gba:h-4 gba:w-4 gba:mr-2" />}
                    {t('branding-logomark-save')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={resetLogomarkChanges}
                    disabled={!logomarkHasUnsavedChanges || logomarkIsSaving}
                  >
                    {t('branding-logomark-reset')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={removeLogomark}
                    disabled={(!hasStoredLogomark && !previewLogomarkUrl) || logomarkIsSaving}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                    {t('branding-logomark-remove')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Color scheme — future feature */}
          <FutureFeatureCard
            badgeLabel={t('branding-future-badge')}
            title={t('branding-future-color-title')}
            description={t('branding-future-color-description')}
            helperText={t('branding-future-color-help')}
          >
            <div className="gba:grid gba:grid-cols-3 gba:gap-3">
              {FUTURE_COLOR_SWATCHES.map(colorSwatch => (
                <div key={colorSwatch.labelKey} className="gba:space-y-2">
                  <div
                    className="gba:h-12 gba:rounded-md gba:border gba:border-border"
                    style={{ backgroundColor: colorSwatch.color }}
                  />
                  <div className="gba:text-xs gba:text-muted-foreground">{t(colorSwatch.labelKey)}</div>
                </div>
              ))}
            </div>
            <Button variant="secondary" disabled>
              {t('branding-future-badge')}
            </Button>
          </FutureFeatureCard>
        </div>
      </PageLayout>
    </div>
  )
}

export default Branding
