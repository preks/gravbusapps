import React from 'react'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

import { EmployeeAbsenceEntitlement } from '../hooks/useEmployeeData'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '../../../../../../common/utils/windowUtils'
import { AbsenceListCardAbsence, Entitlement } from '../queries/types'
import { getAbsenceStatusLabel, getAbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

export const getTypeValue = (type: any) => {
  if (type?.translations?.length > 0) {
    return type.translations[0].value
  }
  return type?.value || getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unknown_type', 'Unknown')
}

export const transformAbsenceData = (absences: any[]): AbsenceListCardAbsence[] => {
  return absences.map((absence: any) => ({
    type: getCatalogValue(absence.type) || '',
    typeId: absence.type?.id || '',
    originalStatus: absence.status || '',
    status: getAbsenceStatusLabel(absence.status),
    title: getCatalogValue(absence.type) || '',
    startDate: absence.startDate,
    endDate: absence.endDate,
    duration: absence.workingDays
      ? `${absence.workingDays} ${
          absence.workingDays === 1
            ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.limited_pending_days_text.day', 'day')
            : getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.limited_pending_days_text.days', 'days')
        }`
      : '',
    description: absence.description || '',
    icon: React.createElement(CalendarBlankIcon),
    typeColor: absence.type?.objectValue?.color ? absence.type.objectValue.color : 'blue',
    statusColor: getAbsenceStatusConfig(absence.status).color,
    requestDate: absence.createdAt
  }))
}

export const transformEntitlementsData = (employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[]): Entitlement[] => {
  const currentYear = dayjs().year()
  const firstDayOfYear = dayjs(`${currentYear}-01-01`).startOf('day')
  const lastDayOfYear = dayjs(`${currentYear}-12-31`).endOf('day')

  const currentYearEntitlements = employeeAbsenceEntitlement.filter(ent => {
    if (!ent.validFrom || !ent.validTo) {
      return false
    }

    const validFrom = dayjs(ent.validFrom)
    const validTo = dayjs(ent.validTo)

    return validFrom.isSameOrBefore(lastDayOfYear) && validTo.isSameOrAfter(firstDayOfYear)
  })

  return currentYearEntitlements.map(ent => ({
    type: getCatalogValue(ent.type) || '',
    typeId: ent.type?.id || '',
    color: ent.type?.objectValue?.color || '1976d2',
    used: ent.approved,
    total: ent.total,
    pending: ent.pending,
    available: ent.available,
    icon: React.createElement(CalendarBlankIcon),
    checkEntitlement: ent.type?.objectValue?.checkEntitlement
  }))
}

export const calculateSkillStats = (skills: any[]) => {
  const validSkills = skills.filter(skill => !skill.isDeleted)
  const total = validSkills.length

  const highestSkills = validSkills.filter(skill => Number(skill.level) === 5)

  return {
    total,
    highestSkills
  }
}

export const getLevelInfo = (level: number, t?: (key: string) => string) => {
  const defaultLevelInfo = {
    0: {
      color: 'var(--nw-muted-foreground)',
      description: 'No level assigned'
    },
    1: {
      color: 'var(--nw-destructive)',
      description: 'Beginner - Basic understanding'
    },
    2: {
      color: 'var(--nw-warning)',
      description: 'Novice - Limited experience'
    },
    3: {
      color: 'var(--nw-warning)',
      description: 'Intermediate - Working knowledge'
    },
    4: {
      color: 'var(--nw-info)',
      description: 'Advanced - Proficient'
    },
    5: {
      color: 'var(--nw-success)',
      description: 'Expert - Master level'
    }
  }

  const levelInfo = t
    ? {
        0: {
          color: 'var(--nw-muted-foreground)',
          description: t('skills-level-0')
        },
        1: {
          color: 'var(--nw-destructive)',
          description: t('skills-level-1')
        },
        2: {
          color: 'var(--nw-warning)',
          description: t('skills-level-2')
        },
        3: {
          color: 'var(--nw-warning)',
          description: t('skills-level-3')
        },
        4: {
          color: 'var(--nw-info)',
          description: t('skills-level-4')
        },
        5: {
          color: 'var(--nw-success)',
          description: t('skills-level-5')
        }
      }
    : defaultLevelInfo

  return levelInfo[level as keyof typeof levelInfo] || levelInfo[0]
}

export const getSkillCategory = (additionalProperties: any) => {
  if (!additionalProperties || typeof additionalProperties !== 'object') {
    return 'General'
  }

  const category =
    additionalProperties.category ||
    additionalProperties.Category ||
    additionalProperties.type ||
    additionalProperties.Type

  return category || 'General'
}

export const getTimeSince = (dateString: string) => {
  if (!dateString) return 'Unknown'

  const date = dayjs(dateString)
  const now = dayjs()
  const diffInDays = now.diff(date, 'day')

  if (diffInDays === 0) {
    return 'Today'
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  } else {
    const years = Math.floor(diffInDays / 365)
    return years === 1 ? '1 year ago' : `${years} years ago`
  }
}

export { formatCurrencyString as formatCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
export { formatForDisplay as formatDate } from '@/common/utils/dateFormatter'

export const getDefaultStartDate = (): string => {
  const date = new Date()
  return date.toISOString().split('T')[0]
}

export const getDefaultEndDate = (): string => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toISOString().split('T')[0]
}
