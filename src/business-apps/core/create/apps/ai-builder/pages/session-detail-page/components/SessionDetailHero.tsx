import React from 'react'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Badge, Button } from '@newwork/nw-design-system'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SessionDetailHeroProps {
  sessionId: string
  onBackToSessions: () => void
  'data-testid'?: string
}

const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

export const SessionDetailHero: React.FC<SessionDetailHeroProps> = ({
  sessionId,
  onBackToSessions,
  'data-testid': testId = 'session-detail-hero'
}) => {
  return (
    <div data-testid={testId} className="gba:w-full gba:h-[180px] gba:shrink-0">
      <div className="gba:relative gba:overflow-hidden gba:h-full">
        {useVideo ? (
          <video
            src={HERO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
            aria-hidden
            data-testid={`${testId}-video`}
          />
        ) : (
          <SpaceHeroBackground />
        )}

        {/* eslint-disable newwork-local/no-hardcoded-colors */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none"
          style={{
            background: `linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)`
          }}
          aria-hidden
        />
        {/* eslint-enable newwork-local/no-hardcoded-colors */}

        <div className="gba:relative gba:h-full gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-6 gba:flex gba:flex-col gba:justify-between">
          <div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onBackToSessions}
              className="gba:gap-2 gba:text-white hover:gba:bg-white/10 gba:-ml-2"
              data-testid={`${testId}-back-button`}
            >
              <ArrowLeft className="gba:w-4 gba:h-4" />
              <span>{getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions_button', 'Sessions')}</span>
            </Button>
          </div>

          <div>
            <div className="gba:mb-3">
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
                NEWWORK
              </span>
            </div>

            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
              <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/10 gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
              <div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h1
                    className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-semibold gba:text-white gba:tracking-tight"
                    data-testid={`${testId}-title`}
                  >
                    AI <span className="gba:font-normal">Builder</span>
                  </h1>
                  <Badge
                    variant="aiGenerated"
                    className="gba:text-[10px] gba:px-2 gba:py-0.5 gba:bg-white/20 gba:text-white gba:border-white/30"
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.beta_badge', 'BETA')}
                  </Badge>
                </div>
              </div>
            </div>

            <p
              className="gba:text-sm gba:text-white/60 gba:max-w-xl gba:flex gba:items-center gba:gap-2"
              data-testid={`${testId}-tagline`}
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.subtitle',
                'Build screens with natural language • Powered by Claude 4.5 Sonnet'
              )}
              {sessionId && (
                <span className="gba:px-2 gba:py-0.5 gba:bg-white/10 gba:rounded gba:font-mono gba:text-[10px] gba:text-white/80 gba:border gba:border-white/20">
                  {sessionId.split('-').pop()}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionDetailHero
