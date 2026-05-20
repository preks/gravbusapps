import React, { useCallback } from 'react'
import { Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { Lightning, ArrowRight } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import translations from '../_i18n'

interface EveryAISectionProps {
  'data-testid'?: string
}

export const EveryAISection: React.FC<EveryAISectionProps> = ({ 'data-testid': testId = 'customer-home-ai' }) => {
  const { t } = useTranslation(translations)

  const handleClick = useCallback(() => {
    navigateTo('/platform/every-ai')
  }, [])

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={`${testId}-section`}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-background" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        <Card
          className="gba:overflow-hidden gba:relative gba:border-0 gba:cursor-pointer gba:transition-all gba:duration-300 hover:gba:bg-ai/95 gba:group gba:bg-ai gba:text-ai-foreground"
          onClick={handleClick}
          data-testid={testId}
        >
          <CardContent className="gba:p-0">
            <div className="gba:flex gba:items-center gba:gap-5 gba:px-6 gba:py-5">
              <div className="gba:h-12 gba:w-12 gba:rounded-xl gba:bg-ai-foreground/15 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 group-hover:gba:bg-ai-foreground/25 gba:transition-colors gba:duration-300">
                <Lightning className="gba:h-6 gba:w-6 gba:text-ai-foreground" weight="duotone" />
              </div>

              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
                  <h3 className="gba:font-funnel-display gba:text-xl gba:font-semibold gba:tracking-tight gba:text-ai-foreground">
                    {t('ai-title')}
                  </h3>
                  <span className="gba:text-[9px] gba:font-semibold gba:tracking-[0.15em] gba:uppercase gba:text-ai-foreground/70">
                    {t('ai-badge')}
                  </span>
                </div>
                <p className="gba:text-sm gba:text-ai-foreground/85 gba:leading-relaxed">{t('ai-subtitle')}</p>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2 gba:text-ai-foreground gba:font-medium gba:text-sm gba:flex-shrink-0">
                <span>{t('ai-cta')}</span>
                <ArrowRight
                  className="gba:h-4 gba:w-4 gba:transition-transform group-hover:gba:translate-x-1"
                  weight="bold"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default EveryAISection
