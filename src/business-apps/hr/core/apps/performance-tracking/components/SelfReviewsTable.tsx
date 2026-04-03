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
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { EvaluationDetail } from '../types'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)
  const employees = useMemo(() => buildSelfReviewSummaries(evaluations), [evaluations])

  return (
    <Card data-testid="self-reviews-table">
      <CardHeader>
        <CardTitle className="gba:text-lg">{t('self-reviews-title', { name: cycleName })}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">
          {t('self-reviews-description', { count: employees.length })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table-employee')}</TableHead>
                <TableHead>{t('table-total-tasks')}</TableHead>
                <TableHead>{t('table-completed')}</TableHead>
                <TableHead>{t('table-pending')}</TableHead>
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
                    {t('empty-no-self-reviews')}
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
