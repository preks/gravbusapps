'use client'

import React, { useMemo } from 'react'
import { CertificateIcon, CheckCircleIcon, TargetIcon, TrendUpIcon } from '@phosphor-icons/react'
import { HrGrowthInsightCard, HrGrowthInsightsSection } from '../HrGrowthInsightsSection'
import { type JobProfileGap } from './skillsProfile.utils'

interface SkillsInsightsSectionProps {
  verifyCount: number
  jobProfileGap: JobProfileGap | null
  t: (key: string, args?: Record<string, unknown>) => string
}

function buildSkillInsights(
  verifyCount: number,
  jobProfileGap: JobProfileGap | null,
  t: (key: string, args?: Record<string, unknown>) => string
): HrGrowthInsightCard[] {
  const cards: HrGrowthInsightCard[] = []

  if (verifyCount > 0) {
    cards.push({
      id: 'verify-certification',
      priority: 'recommended',
      icon: <CertificateIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('skills-insight-verify-title'),
      description: t('skills-development-verify-certification', { count: verifyCount })
    })
  }

  if (jobProfileGap == null) return cards

  const { jobProfileName, missingSkills, belowLevelSkills } = jobProfileGap
  const hasMissing = missingSkills.length > 0
  const hasBelowLevel = belowLevelSkills.length > 0

  if (!hasMissing && !hasBelowLevel) {
    cards.push({
      id: 'job-profile-fit',
      priority: 'opportunity',
      icon: <CheckCircleIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('skills-insight-fit-title'),
      description: t('skills-development-job-profile-fit', { name: jobProfileName })
    })
    return cards
  }

  if (hasMissing) {
    cards.push({
      id: 'job-profile-missing',
      priority: 'high',
      icon: <TargetIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('skills-insight-missing-title'),
      description:
        missingSkills.length === 1 ? (
          <span>
            {t('skills-development-job-profile-missing-one-prefix')}{' '}
            <strong className="gba:font-bold gba:text-foreground">{missingSkills[0].name}</strong>
            {t('skills-development-job-profile-missing-one-suffix')}
          </span>
        ) : (
          <span>
            {t('skills-development-job-profile-missing-prefix', { count: missingSkills.length })}{' '}
            {missingSkills.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 && ', '}
                <strong className="gba:font-bold gba:text-foreground">{s.name}</strong>
              </React.Fragment>
            ))}
            .
          </span>
        )
    })
  }

  if (hasBelowLevel) {
    belowLevelSkills.forEach(s => {
      cards.push({
        id: `below-level-${s.skillName}`,
        priority: 'recommended',
        icon: <TrendUpIcon className="gba:h-5 gba:w-5" weight="fill" />,
        title: t('skills-insight-below-level-title'),
        description: (
          <span>
            {t('skills-development-job-profile-below-level-prefix')}{' '}
            <strong className="gba:font-bold gba:text-foreground">{s.skillName}</strong>{' '}
            {t('skills-development-job-profile-below-level-suffix', {
              employeeLevel: s.employeeLevel,
              profileLevel: s.profileLevel
            })}
          </span>
        )
      })
    })
  }

  return cards
}

export const SkillsInsightsSection: React.FC<SkillsInsightsSectionProps> = ({ verifyCount, jobProfileGap, t }) => {
  const insights = useMemo(() => buildSkillInsights(verifyCount, jobProfileGap, t), [verifyCount, jobProfileGap, t])

  if (insights.length === 0) return null

  return (
    <HrGrowthInsightsSection
      title={t('skills-development-next-actions')}
      description={t('skills-development-next-actions-description')}
      cards={insights}
      testIds={{
        section: 'skills-insights-section',
        toggle: 'skills-insights-toggle',
        scrollLeft: 'skills-insights-scroll-left',
        scrollRight: 'skills-insights-scroll-right',
        cardPrefix: 'skill-insight-card',
        menuPrefix: 'skill-insight'
      }}
    />
  )
}
