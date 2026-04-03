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

interface ManagerSummary {
  reviewerEmployeeId: string
  reviewerName: string
  total: number
  completed: number
  pending: number
}

function buildManagerSummaries(evaluations: EvaluationDetail[]): ManagerSummary[] {
  const map = new Map<string, ManagerSummary>()

  for (const evaluation of evaluations) {
    for (const reviewer of evaluation.reviewers) {
      if (reviewer.reviewerType !== 'MANAGER_EVALUATION_PARTICIPANT_TYPE') continue
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
          reviewerEmployeeId: id,
          reviewerName: reviewer.reviewerName,
          total: 1,
          completed: reviewer.completedDate ? 1 : 0,
          pending: reviewer.completedDate ? 0 : 1
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.reviewerName.localeCompare(b.reviewerName))
}

interface ManagerReviewsTableProps {
  evaluations: EvaluationDetail[]
  loading: boolean
  cycleName: string
}

export const ManagerReviewsTable: React.FC<ManagerReviewsTableProps> = ({ evaluations, loading, cycleName }) => {
  const { t } = useTranslation(translations)
  const managers = useMemo(() => buildManagerSummaries(evaluations), [evaluations])

  return (
    <Card data-testid="manager-reviews-table">
      <CardHeader>
        <CardTitle className="gba:text-lg">{t('manager-reviews-title', { name: cycleName })}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">
          {t('manager-reviews-description', { count: managers.length })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table-manager')}</TableHead>
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
              ) : managers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    {t('empty-no-manager-reviews')}
                  </TableCell>
                </TableRow>
              ) : (
                managers.map(manager => (
                  <TableRow key={manager.reviewerEmployeeId} data-testid={`manager-row-${manager.reviewerEmployeeId}`}>
                    <TableCell className="gba:font-medium">{manager.reviewerName}</TableCell>
                    <TableCell>{manager.total}</TableCell>
                    <TableCell>
                      <Badge variant="default">{manager.completed}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={manager.pending > 0 ? 'outline' : 'default'}>{manager.pending}</Badge>
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
