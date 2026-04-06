import React, { useState } from 'react'
import { Badge, TableCell, TableRow, useTranslation } from '@newwork/nw-design-system'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import type { ReviewerDetail } from '../types'
import { formatDate, formatStatusRef, getStatusBadgeVariant } from '../utils/formatLabels'
import { ReviewerRow } from './ReviewerRow'
import translations from '../_i18n'

interface ExpandableEvaluationRowProps {
  readonly id: string
  readonly label: string
  readonly statusRef: string | null
  readonly startDate: string | null
  readonly completionDate: string | null
  readonly reviewers: ReviewerDetail[]
  readonly testIdPrefix: string
}

export function ExpandableEvaluationRow({
  id,
  label,
  statusRef,
  startDate,
  completionDate,
  reviewers,
  testIdPrefix
}: ExpandableEvaluationRowProps) {
  const { t } = useTranslation(translations)
  const [expanded, setExpanded] = useState(false)
  const completedReviewers = reviewers.filter(r => r.completedDate).length
  const totalReviewers = reviewers.length

  return (
    <>
      <TableRow
        className="gba:cursor-pointer hover:gba:bg-muted/50"
        onClick={() => setExpanded(prev => !prev)}
        data-testid={`${testIdPrefix}-${id}`}
      >
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-2">
            {expanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
            <span className="gba:font-medium">{label}</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="gba:text-xs gba:text-muted-foreground">
            {t('reviewers-count', { completed: completedReviewers, total: totalReviewers })}
          </span>
        </TableCell>
        <TableCell>
          <Badge variant={getStatusBadgeVariant(statusRef)}>{formatStatusRef(statusRef, t)}</Badge>
        </TableCell>
        <TableCell>{formatDate(startDate)}</TableCell>
        <TableCell>{formatDate(completionDate)}</TableCell>
      </TableRow>
      {expanded && reviewers.map(reviewer => <ReviewerRow key={reviewer.id} reviewer={reviewer} />)}
    </>
  )
}
