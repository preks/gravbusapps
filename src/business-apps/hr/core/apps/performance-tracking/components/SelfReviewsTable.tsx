import React, { useMemo } from 'react'
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
import type { EvaluationDetail } from '../types'

interface SelfReviewSummary {
  employeeId: string
  employeeName: string
  total: number
  completed: number
  pending: number
}

function buildSelfReviewSummaries(evaluations: EvaluationDetail[]): SelfReviewSummary[] {
  const map = new Map<string, SelfReviewSummary>()

  for (const evaluation of evaluations) {
    for (const reviewer of evaluation.reviewers) {
      if (reviewer.reviewerType !== 'SELF_EVALUATION_PARTICIPANT_TYPE') continue
      const id = reviewer.reviewerEmployeeId ?? reviewer.id
      const existing = map.get(id)
      if (existing) {
        existing.total++
        if (reviewer.completedDate) {
          existing.completed++
        } else {
          existing.pending++
        }
      } else {
        map.set(id, {
          employeeId: id,
          employeeName: reviewer.reviewerName,
          total: 1,
          completed: reviewer.completedDate ? 1 : 0,
          pending: reviewer.completedDate ? 0 : 1
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

interface SelfReviewsTableProps {
  evaluations: EvaluationDetail[]
  loading: boolean
  cycleName: string
}

export const SelfReviewsTable: React.FC<SelfReviewsTableProps> = ({ evaluations, loading, cycleName }) => {
  const employees = useMemo(() => buildSelfReviewSummaries(evaluations), [evaluations])

  return (
    <Card data-testid="self-reviews-table">
      <CardHeader>
        <CardTitle className="gba:text-lg">{cycleName} — Self Reviews</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">
          {employees.length} employee{employees.length !== 1 ? 's' : ''} with self review tasks in this cycle.
        </p>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Total Tasks</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:py-8 gba:text-center">
                    <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    No self reviews found for this cycle.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map(employee => (
                  <TableRow key={employee.employeeId} data-testid={`self-review-row-${employee.employeeId}`}>
                    <TableCell className="gba:font-medium">{employee.employeeName}</TableCell>
                    <TableCell>{employee.total}</TableCell>
                    <TableCell>
                      <Badge variant="default">{employee.completed}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.pending > 0 ? 'outline' : 'default'}>{employee.pending}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
