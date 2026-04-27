import React, { useCallback } from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useLocale
} from '@newwork/nw-design-system'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { useSetupTranslation } from '../../useSetupTranslation'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { resolveGravityPlatformAppOrigin } from '@/common/utils/serviceResolver'

export interface WelcomeStepProps {
  readonly onNext?: () => void
}

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'ro-RO', label: 'Română' }
]

const DATA_TEST_ID_PREFIX = 'WelcomeStep'

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { t } = useSetupTranslation()
  const { locale, setLocale } = useLocale()

  const handleLanguageChange = useCallback(
    (value: string) => {
      if (value === 'en-US' || value === 'de-DE' || value === 'ro-RO') {
        setLocale(value)
      }
    },
    [setLocale]
  )

  const origin = typeof window !== 'undefined' ? resolveGravityPlatformAppOrigin() : ''
  const logomarkSrc = origin ? `${origin}/platform/logomark.svg` : '/platform/logomark.svg'

  return (
    <PlatformShellLayout
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={onNext}
      hideBackButton={true}
      nextButtonText={t('buttons-start')}
      hideSteps
      className="gba:w-full gba:max-w-[720px]"
      frameClassName="gba:max-w-[940px]"
      frameMinHeightClassName="gba:min-h-[620px]"
    >
      <div className="gba:mx-auto gba:flex gba:w-full gba:max-w-[520px] gba:flex-col gba:items-center">
        <div className="gba:mb-6 gba:rounded-full gba:border gba:border-[#E7E5E4] gba:bg-[#FAFAF9] gba:px-4 gba:py-1 gba:text-xs gba:font-medium gba:uppercase gba:tracking-[0.18em] gba:text-[#57534E]">
          {t('welcome-badge')}
        </div>

        <div
          className="gba:mb-8 gba:flex gba:h-[72px] gba:w-[72px] gba:items-center gba:justify-center gba:rounded-[22px] gba:bg-gradient-to-br gba:from-[#F8FAFC] gba:via-white gba:to-[#FFF7ED] gba:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'logo-mark')}
        >
          <img src={logomarkSrc} alt="" width={48} height={48} className="gba:h-12 gba:w-12" />
        </div>

        <h1
          className="gba:mb-3 gba:text-center gba:text-4xl gba:font-bold gba:text-[#09090B]"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'heading')}
        >
          {t('welcome-title')}
        </h1>

        <p
          className="gba:mb-8 gba:text-center gba:text-sm gba:leading-6 gba:text-gray-600"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'description')}
        >
          {t('welcome-primary-text')}
        </p>

        <div
          className="gba:w-full gba:space-y-2"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'language-selector')}
        >
          <Label htmlFor="setup-language-select">{t('welcome-language-label')}</Label>
          <Select value={locale} onValueChange={handleLanguageChange}>
            <SelectTrigger id="setup-language-select" className="gba:w-full" aria-label={t('welcome-language-label')}>
              <SelectValue placeholder={t('welcome-language-label')} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </PlatformShellLayout>
  )
}

export default WelcomeStep
