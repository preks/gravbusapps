import React from 'react'
import { PaperClipOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import { EmployeeAbsenceEntitlement } from '../hooks/useEmployeeData'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '../../../../../../common/utils/windowUtils'
import { AbsenceListCardAbsence, Entitlement } from '../queries/types'
import { getAbsenceStatusLabel, getAbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

// Function to get the catalog value
export const getTypeValue = (type: any) => {
  if (type?.translations?.length > 0) {
    return type.translations[0].value
  }
  return type?.value || getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unknown_type', 'Unknown')
}

// Transform absence data from GraphQL response
export const transformAbsenceData = (absences: any[]): AbsenceListCardAbsence[] => {
  return absences.map((absence: any) => ({
    type: getCatalogValue(absence.type) || '',
    typeId: absence.type?.id || '', // Store original catalog ID for grouping
    originalStatus: absence.status || '', // Store original status for color mapping
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
    icon: React.createElement(PaperClipOutlined, {
      style: {
        color: absence.type?.objectValue?.color ? `#${absence.type.objectValue.color}` : 'var(--nw-info)'
      }
    }),
    typeColor: absence.type?.objectValue?.color ? absence.type.objectValue.color : 'blue',
    statusColor: getAbsenceStatusConfig(absence.status).color,
    requestDate: absence.createdAt
  }))
}

// Transform entitlements data
export const transformEntitlementsData = (employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[]): Entitlement[] => {
  return employeeAbsenceEntitlement.map(ent => ({
    type: getCatalogValue(ent.type) || '',
    typeId: ent.type?.id || '', // Store original catalog ID for identification
    color: ent.type?.objectValue?.color || '1976d2',
    used: ent.approved,
    total: ent.total,
    pending: ent.pending,
    available: ent.available,
    icon: React.createElement(PaperClipOutlined, {
      style: { color: `#${ent.type?.objectValue?.color || '1976d2'}` }
    }),
    checkEntitlement: ent.type?.objectValue?.checkEntitlement
  }))
}

// Skill-related utility functions

// Calculate skill statistics
export const calculateSkillStats = (skills: any[]) => {
  const validSkills = skills.filter(skill => !skill.isDeleted)
  const total = validSkills.length

  // Find highest level skills (level 5)
  const highestSkills = validSkills.filter(skill => Number(skill.level) === 5)

  return {
    total,
    highestSkills
  }
}

// Get level information based on skill level
export const getLevelInfo = (level: number) => {
  const levelInfo = {
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

  return levelInfo[level as keyof typeof levelInfo] || levelInfo[0]
}

// Get skill category from additional properties
export const getSkillCategory = (additionalProperties: any) => {
  if (!additionalProperties || typeof additionalProperties !== 'object') {
    return 'General'
  }

  // Try to find category in various possible locations
  const category =
    additionalProperties.category ||
    additionalProperties.Category ||
    additionalProperties.type ||
    additionalProperties.Type

  return category || 'General'
}

// Get time since a given date
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
