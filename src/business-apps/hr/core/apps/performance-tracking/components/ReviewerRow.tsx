import React from 'react'
import { Badge, TableCell, TableRow, useTranslation } from '@newwork/nw-design-system'
import { UserCircle } from '@phosphor-icons/react'
import type { ReviewerDetail } from '../types'
import { formatDate, formatReviewerType, formatReviewerStatus, getStatusBadgeVariant } from '../utils/formatLabels'
import translations from '../_i18n'

export const ReviewerRow: React.FC<{ reviewer: ReviewerDetail }> = ({ reviewer }) => {
  const { t } = useTranslation(translations)

  return (
    <TableRow className="gba:bg-muted/30">
      <TableCell className="gba:pl-12">
        <div className="gba:flex gba:items-center gba:gap-2">
          <UserCircle size={16} className="gba:text-muted-foreground" />
          <span className="gba:text-sm">{reviewer.reviewerName}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="gba:text-xs">
          {formatReviewerType(reviewer.reviewerType, t)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(reviewer.status)}>{formatReviewerStatus(reviewer.status, t)}</Badge>
      </TableCell>
      <TableCell>{formatDate(reviewer.assignedDate)}</TableCell>
      <TableCell>{formatDate(reviewer.completedDate)}</TableCell>
    </TableRow>
  )
}
