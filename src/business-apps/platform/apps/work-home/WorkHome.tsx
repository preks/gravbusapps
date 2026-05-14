import React, { useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback, Toaster, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

import { AICommandBar } from './components/AICommandBar'
import { PrioritiesPanel } from './components/PrioritiesPanel'
import { WorkPulse } from './components/WorkPulse'
import { AIInsights } from './components/AIInsights'
import { WhatsNewSection } from './components/WhatsNewSection'
import { QuickActionsGrid } from './components/QuickActionsGrid'
import { AppSpaces } from './components/AppSpaces'
import { usePriorities } from './hooks/usePriorities'
import { useWorkPulse } from './hooks/useWorkPulse'
import { useQuickActions } from './hooks/useQuickActions'
import { useCurrentUserPicture } from '../every-ai/hooks/useCurrentUserPicture'
import translations from './_i18n'

const getAvatarSrc = (pictureThumbnail?: string): string | undefined => {
  const thumbnail = pictureThumbnail?.trim()

  if (!thumbnail || thumbnail.startsWith('{')) {
    return undefined
  }

  if (thumbnail.startsWith('data:') || /^https?:\/\//i.test(thumbnail)) {
    return thumbnail
  }

  if (thumbnail.startsWith('/9j/')) return `data:image/jpeg;base64,${thumbnail}`
  if (thumbnail.startsWith('iVBOR')) return `data:image/png;base64,${thumbnail}`
  if (thumbnail.startsWith('R0lGOD')) return `data:image/gif;base64,${thumbnail}`

  return `data:image/gif;base64,${thumbnail}`
}

export interface WorkHomeProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const WorkHome: React.FC<WorkHomeProps> = ({ accessToken, userInfo, 'data-testid': testId = 'work-home' }) => {
  const { t } = useTranslation(translations)

  const firstName = userInfo?.employeeDetails?.firstName || userInfo?.givenName || ''
  const lastName = userInfo?.employeeDetails?.lastName || userInfo?.familyName || ''
  const userId = userInfo?.id || ''
  const employeeId = userInfo?.employeeDetails?.employeeId || ''
  const orgUnit = userInfo?.employeeDetails?.organizationalUnit?.name || ''
  const { pictureThumbnail: pictureFromGraphql } = useCurrentUserPicture(employeeId || undefined, accessToken || '')
  const pictureThumbnail = pictureFromGraphql || userInfo?.employeeDetails?.pictureThumbnail
  const avatarSrc = getAvatarSrc(pictureThumbnail)
  const aiUserInfo = useMemo(() => {
    if (!userInfo || !pictureThumbnail) {
      return userInfo
    }

    return {
      ...userInfo,
      employeeDetails: {
        ...userInfo.employeeDetails,
        pictureThumbnail
      }
    }
  }, [pictureThumbnail, userInfo])

  const workHomeEnabled = useFeature(Feature.Platform.WorkHome.Key)

  const context = useMemo<BusinessAppContextProps>(
    () => ({ accessToken: accessToken || '', userInfo }),
    [accessToken, userInfo]
  )

  const {
    priorities,
    isLoading: prioritiesLoading,
    hasTeamData,
    absentMembers,
    upcomingBirthdays
  } = usePriorities({
    accessToken: accessToken || '',
    userId,
    employeeId,
    context
  })

  const { metrics: pulseMetrics, isLoading: pulseLoading } = useWorkPulse({
    accessToken: accessToken || '',
    employeeId,
    hasTeamData,
    context
  })

  const quickActions = useQuickActions({ isSupervisor: hasTeamData })

  const greetingKey = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'greeting-morning'
    if (hour < 18) return 'greeting-afternoon'
    return 'greeting-evening'
  }, [])

  if (workHomeEnabled === false) {
    return null
  }

  return (
    <div
      className="gba:px-4 md:gba:px-6 gba:h-full gba:flex gba:flex-col gba:items-center gba:overflow-auto gba:bg-background"
      data-testid={testId}
    >
      <div className="gba:w-full gba:py-6" style={{ maxWidth: 'clamp(1200px, 90vw, 1600px)' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">
                {t(greetingKey)}, {firstName}!
              </h1>
              <p className="gba:text-muted-foreground">{t('greeting-subtitle')}</p>
            </div>
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:text-right">
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {firstName} {lastName}
                </p>
                {orgUnit && <p className="gba:text-xs gba:text-muted-foreground">{orgUnit}</p>}
              </div>
              <Avatar size="lg" className="gba:h-12 gba:w-12" data-testid={`${testId}-user-avatar`}>
                <AvatarImage src={avatarSrc} alt={`${firstName} ${lastName}`} />
                <AvatarFallback>{`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* AI Command Bar */}
        <div style={{ marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
          <AICommandBar accessToken={accessToken || ''} userInfo={aiUserInfo} data-testid={`${testId}-ai-bar`} />
        </div>

        {/* 2-column layout: left stacks naturally, right aligns bottom with left */}
        <div
          className="gba:grid gba:items-start"
          style={{
            gap: 'clamp(1.5rem, 1.5vw, 2rem)',
            marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)'
          }}
        >
          {/* Left column: Priorities → What's New, content-height */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
            <PrioritiesPanel
              priorities={priorities}
              isLoading={prioritiesLoading}
              absentMembers={absentMembers}
              upcomingBirthdays={upcomingBirthdays}
              accessToken={accessToken || ''}
              data-testid={`${testId}-priorities`}
            />
            <WhatsNewSection accessToken={accessToken || ''} data-testid={`${testId}-whats-new`} />
          </div>

          {/* Right column: Work Pulse → AI Insights → Quick Actions, bottom-aligned with left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
            <WorkPulse metrics={pulseMetrics} isLoading={pulseLoading} data-testid={`${testId}-pulse`} />
            <AIInsights
              accessToken={accessToken || ''}
              employeeId={employeeId}
              hasTeamData={hasTeamData}
              data-testid={`${testId}-ai-insights`}
            />
            <QuickActionsGrid actions={quickActions} data-testid={`${testId}-quick-actions`} />
          </div>
        </div>

        {/* My Apps — full width horizontal */}
        <div style={{ marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
          <AppSpaces data-testid={`${testId}-spaces`} />
        </div>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default WorkHome
