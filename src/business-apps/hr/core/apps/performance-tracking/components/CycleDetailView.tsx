import React, { useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner
} from '@newwork/nw-design-system'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import type { EvaluationDetail } from '../types'
import { formatDate, formatStatusRef, getStatusBadgeVariant } from '../utils/formatLabels'
import { ReviewerRow } from './ReviewerRow'

function EvaluationRow({ evaluation }: Readonly<{ evaluation: EvaluationDetail }>) {
  const [expanded, setExpanded] = useState(false)
  const completedReviewers = evaluation.reviewers.filter(r => r.completedDate).length
  const totalReviewers = evaluation.reviewers.length

  return (
    <>
      <TableRow
        className="gba:cursor-pointer hover:gba:bg-muted/50"
        onClick={() => setExpanded(prev => !prev)}
        data-testid={`evaluation-row-${evaluation.id}`}
      >
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-2">
            {expanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
            <span className="gba:font-medium">{evaluation.employeeName}</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="gba:text-xs gba:text-muted-foreground">
            {completedReviewers}/{totalReviewers} reviewers
          </span>
        </TableCell>
        <TableCell>
          <Badge variant={getStatusBadgeVariant(evaluation.statusRef)}>{formatStatusRef(evaluation.statusRef)}</Badge>
        </TableCell>
        <TableCell>{formatDate(evaluation.startDate)}</TableCell>
        <TableCell>{formatDate(evaluation.actualCompletionDate)}</TableCell>
      </TableRow>
      {expanded && evaluation.reviewers.map(reviewer => <ReviewerRow key={reviewer.id} reviewer={reviewer} />)}
    </>
  )
}

interface CycleDetailViewProps {
  evaluations: EvaluationDetail[]
  loading: boolean
  error: string | null
  cycleName: string
}

export const CycleDetailView: React.FC<CycleDetailViewProps> = ({ evaluations, loading, error, cycleName }) => {
  return (
    <Card data-testid="cycle-detail-view">
      <CardHeader>
        <CardTitle className="gba:text-lg">{cycleName} — Evaluations</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">
          {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''} in this cycle. Click a row to expand
          reviewer details.
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm">
            {error}
          </div>
        )}
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Reviewers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:py-8 gba:text-center">
                    <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                  </TableCell>
                </TableRow>
              ) : evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    No evaluations found for this cycle.
                  </TableCell>
                </TableRow>
              ) : (
                evaluations.map(evaluation => <EvaluationRow key={evaluation.id} evaluation={evaluation} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
