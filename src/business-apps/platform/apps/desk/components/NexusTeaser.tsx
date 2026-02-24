/**
 * NexusTeaser - Promotional teaser for Nexus on Every Office (Desk)
 *
 * A beautiful banner that invites users to try Nexus, the AI-powered
 * intelligent content workspace. Redirects to /platform/nexus.
 */

import React, { useCallback } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { navigateTo } from '@/common/utils/navigationUtils'
import deskTranslations from '../_i18n'

const NEXUS_URL = '/platform/nexus'

export interface NexusTeaserProps {
  'data-testid'?: string
}

/**
 * NexusTeaser - Compact promotional banner linking to Nexus
 */
const NexusTeaser: React.FC<NexusTeaserProps> = ({ 'data-testid': testId = 'desk-nexus-teaser' }) => {
  const { t } = useTranslation(deskTranslations)
  const handleClick = useCallback(() => {
    navigateTo(NEXUS_URL)
  }, [])

  return (
    <section
      className="gba:py-4 gba:px-6 gba:relative"
      data-testid={`${testId}-section`}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.25s both' }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-background" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        <Card
          className="gba:overflow-hidden gba:relative gba:border-0 gba:cursor-pointer gba:transition-all gba:duration-300 hover:gba:bg-ai/95 gba:group gba:bg-ai gba:text-ai-foreground"
          onClick={handleClick}
          data-testid={testId}
        >
          <CardContent className="gba:p-0">
            <div className="gba:flex gba:items-center gba:gap-4 gba:px-4 gba:py-3">
              <div className="gba:h-9 gba:w-9 gba:rounded-lg gba:bg-ai-foreground/15 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:group-hover:gba:bg-ai-foreground/25 gba:transition-colors gba:duration-300">
                <Sparkles className="gba:h-4 gba:w-4 gba:text-ai-foreground" />
              </div>

              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h3 className="gba:font-funnel-display gba:text-base gba:font-semibold gba:tracking-tight gba:text-ai-foreground">
                    {t('nexus-title')}
                  </h3>
                  <span className="gba:text-[9px] gba:font-semibold gba:tracking-[0.15em] gba:uppercase gba:text-ai-foreground/70">
                    {t('nexus-badge')}
                  </span>
                </div>
                <p className="gba:text-xs gba:text-ai-foreground/90 gba:leading-snug gba:mt-0.5">
                  {t('nexus-description')}
                </p>
              </div>

              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-ai-foreground gba:font-medium gba:text-sm gba:flex-shrink-0">
                <span>{t('nexus-try')}</span>
                <ArrowRight className="gba:h-3.5 gba:w-3.5 gba:transition-transform group-hover:gba:translate-x-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export { NexusTeaser }
export default NexusTeaser
