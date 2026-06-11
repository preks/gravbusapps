import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import { LEARNING_STATUS } from '../constants/learningStatus'
import translations from '../_i18n'

interface CourseStatusBadgeProps {
  status: string
}

function isPublishedStatus(status: string): boolean {
  return status === LEARNING_STATUS.PUBLISHED || status.includes('PUBLISHED')
}

function isArchivedStatus(status: string): boolean {
  return status === LEARNING_STATUS.ARCHIVED || status.includes('ARCHIVED')
}

export const CourseStatusBadge: React.FC<CourseStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation(translations)
  const normalizedStatus = status.toUpperCase()
  let label = t('learning-status-draft')
  if (isPublishedStatus(normalizedStatus)) {
    label = t('learning-status-published')
  } else if (isArchivedStatus(normalizedStatus)) {
    label = t('learning-status-archived')
  }

  return <Badge variant={isPublishedStatus(normalizedStatus) ? 'default' : 'secondary'}>{label}</Badge>
}
